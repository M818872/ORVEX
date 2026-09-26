"""ACTIONOS Manufacturing Operations API Router."""
import os
import json
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import (
    Supplier, Material, Product, ProductionOrder,
    CustomerOrder, Disruption, ImpactAnalysis, RecoveryOption,
    Approval, AuditLog
)
from app.models.schemas import (
    DashboardMetrics, InvestigationData, ImpactGraph,
    ProductionOrderOut, MaterialOut, RecoveryOptionOut,
    ApprovalRequest, ApprovalResponse, AuditLogOut,
    ChatRequest, ChatResponse, CopilotChatRequest, CopilotChatResponse,
    SampleItem, InjectSampleRequest, InboxUploadResponse, InboxHistoryItem
)
from app.services.manufacturing_service import (
    seed_healthy_state, process_disruption, approve_recovery
)
from app.services.ingestion_service import (
    execute_ingestion_pipeline, list_available_samples, get_sample_content
)
from app.services.copilot_service import answer_copilot_query

logger = logging.getLogger("actionos")
router = APIRouter(tags=["Manufacturing Operations"])


@router.get("/dashboard", response_model=DashboardMetrics)
def get_dashboard(db: Session = Depends(get_db)):
    """Retrieve current operational intelligence dashboard metrics."""
    # Ensure baseline is seeded if empty
    if db.query(Supplier).count() == 0:
        seed_healthy_state(db)

    active_disruption = db.query(Disruption).filter(Disruption.status == "active").order_by(Disruption.id.desc()).first()
    has_disruption = active_disruption is not None

    at_risk_orders_count = db.query(ProductionOrder).filter(ProductionOrder.status == "At Risk").count()
    material_risks_count = 1 if has_disruption else 0
    supplier_alerts_count = 1 if has_disruption else 0
    customer_at_risk_count = db.query(CustomerOrder).filter(CustomerOrder.status == "At Risk").count()

    order_1042 = db.query(ProductionOrder).filter(ProductionOrder.order_number == "Order #1042").first()
    product_name = order_1042.product.name if order_1042 and order_1042.product else "NovaCore Edge Controller AX42"

    main_order = {
        "order_number": "Order #1042",
        "product": product_name,
        "quantity": order_1042.quantity if order_1042 else 500,
        "production": order_1042.status if order_1042 else "Healthy",
        "customer_delivery": "October 20",
        "line": order_1042.line_name if order_1042 else "SMT Line 2"
    }

    disruption_data = None
    if active_disruption:
        disruption_data = {
            "id": active_disruption.id,
            "material": active_disruption.material.name,
            "supplier": active_disruption.supplier.name,
            "delay_days": active_disruption.delay_days,
            "old_eta": active_disruption.old_eta,
            "new_eta": active_disruption.new_eta,
            "reason": active_disruption.reason,
            "affected_units": 500,
            "affected_orders_count": max(at_risk_orders_count, 3),
            "affected_customers_count": max(customer_at_risk_count, 1),
            "affected_lines_count": 2
        }

    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(8).all()

    return DashboardMetrics(
        production_health=78 if has_disruption else 94,
        at_risk_orders=3 if has_disruption else 0,
        material_risks=material_risks_count,
        supplier_alerts=supplier_alerts_count,
        customer_commitments_at_risk=customer_at_risk_count,
        status="at_risk" if has_disruption else "healthy",
        active_disruption=disruption_data,
        main_order=main_order,
        recent_events=logs
    )


@router.post("/disruptions/inject")
def inject_disruption(db: Session = Depends(get_db)):
    """
    Inject the primary demo scenario: Supplier Delivery Delay for MCU-742.
    Routes directly through the real ingestion pipeline (document parsing, LLM extraction,
    entity resolution, BOM tracing, deterministic impact calculation, recovery scenario generation).
    """
    filename, file_bytes = get_sample_content("sample_eml")
    result = execute_ingestion_pipeline(filename, file_bytes, db)

    return {
        "status": "disruption_injected",
        "disruption_id": result["disruption_id"],
        "material": result["resolved_entities"]["material"],
        "supplier": result["resolved_entities"]["supplier"],
        "delay_days": result["extracted_data"]["delay_days"],
        "message": f"Production Disruption Detected: {result['resolved_entities']['material']} delayed by {result['extracted_data']['delay_days']} days. 500 units affected."
    }


# ── Data Inbox & Document Ingestion Endpoints ─────────────────────────────────

@router.get("/inbox/samples", response_model=List[SampleItem])
def get_inbox_samples():
    """List pre-packaged supplier disruption documents across TXT, EML, PDF, CSV, and XLSX."""
    return list_available_samples()


@router.post("/inbox/upload", response_model=InboxUploadResponse)
async def upload_supplier_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Upload real supplier documents (TXT, EML, PDF, CSV, XLSX).
    Executes the full pipeline:
    1. Parse file into clean structured text
    2. Extract disruption via LLM (structured JSON)
    3. Resolve Supplier and Material against DB
    4. Trace BOM -> Products -> Production Orders -> Customer Commitments
    5. Calculate deterministic operational impact
    6. Generate Recovery Scenarios (Options A, B, C)
    7. Persist records and write immutable audit trail
    """
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        result = execute_ingestion_pipeline(file.filename, file_bytes, db)
        return InboxUploadResponse(**result)
    except Exception as e:
        logger.error(f"Ingestion pipeline failed for {file.filename}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ingestion pipeline failed: {str(e)}")


@router.post("/inbox/inject-sample", response_model=InboxUploadResponse)
def inject_sample_document(payload: InjectSampleRequest, db: Session = Depends(get_db)):
    """Ingest one of the 5 pre-packaged sample documents through the exact same real ingestion pipeline."""
    filename, file_bytes = get_sample_content(payload.sample_id)
    try:
        result = execute_ingestion_pipeline(filename, file_bytes, db)
        return InboxUploadResponse(**result)
    except Exception as e:
        logger.error(f"Sample injection failed for {payload.sample_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Sample injection failed: {str(e)}")


@router.get("/inbox/history", response_model=List[InboxHistoryItem])
def get_inbox_history(db: Session = Depends(get_db)):
    """Retrieve history of all ingested supplier documents with extraction and impact metrics."""
    disruptions = db.query(Disruption).order_by(Disruption.id.desc()).all()
    history = []
    for d in disruptions:
        ext = d.source_document.lower().split(".")[-1] if "." in d.source_document else "txt"
        history.append(
            InboxHistoryItem(
                id=d.id,
                filename=d.source_document,
                file_type=ext.upper(),
                supplier_name=d.supplier.name if d.supplier else "Unknown",
                material_name=d.material.name if d.material else "Unknown",
                delay_days=d.delay_days,
                affected_units=500,
                status=d.status,
                created_at=d.created_at.strftime("%b %d, %I:%M %p"),
                disruption_id=d.id
            )
        )
    return history



@router.post("/disruptions/reset")
def reset_baseline(db: Session = Depends(get_db)):
    """Reset to the initial 94% healthy baseline state."""
    seed_healthy_state(db)
    return {
        "status": "reset_healthy",
        "message": "Production environment reset to 94% HEALTHY baseline. All orders on track."
    }


@router.get("/disruptions/{disruption_id}/investigate", response_model=InvestigationData)
def get_investigation(disruption_id: int, db: Session = Depends(get_db)):
    """Get structured investigation details: What Changed, Why Does It Matter, Impact, Evidence & Recovery."""
    disruption = db.query(Disruption).filter(Disruption.id == disruption_id).first()
    if not disruption:
        disruption = db.query(Disruption).order_by(Disruption.id.desc()).first()
    if not disruption:
        raise HTTPException(status_code=404, detail="No disruption found to investigate")

    impact = disruption.impact_analysis
    options = db.query(RecoveryOption).filter(RecoveryOption.disruption_id == disruption.id).all()
    rec_option = next((o for o in options if o.recommended), options[0] if options else None)

    what_changed = {
        "material": disruption.material.name,
        "part_number": disruption.material.part_number,
        "supplier": disruption.supplier.name,
        "delay_days": disruption.delay_days,
        "old_eta": disruption.old_eta,
        "new_eta": disruption.new_eta,
        "reason": disruption.reason,
        "source_document": disruption.source_document
    }

    why_it_matters = {
        "product_name": "NovaCore Edge Controller AX42",
        "component_role": "Core 32-bit MCU controlling high-speed I/O and telemetry",
        "on_hand_inventory": disruption.material.inventory,
        "required_inventory": 500,
        "inventory_deficit": 450,
        "explanation": "MCU-742 is a critical single-source component for the AX42 mainboard. On-hand inventory is only 50 units. Order #1042 cannot initiate SMT surface mounting without delivery."
    }

    what_is_affected = {
        "orders_count": 3,
        "units_count": 500,
        "lines_count": 2,
        "orders": impact.affected_orders if impact else []
    }

    customer_impact = {
        "customer_name": "Customer C8821",
        "order_quantity": 500,
        "promised_delivery": "October 20",
        "risk_summary": "Delivery commitment compromised without expedited shipping mitigation.",
        "customers": impact.affected_customers if impact else []
    }

    evidence = impact.evidence if impact else []

    return InvestigationData(
        what_changed=what_changed,
        why_it_matters=why_it_matters,
        what_is_affected=what_is_affected,
        customer_impact=customer_impact,
        evidence=evidence,
        recovery_options=[RecoveryOptionOut.model_validate(o) for o in options],
        recommended_option=RecoveryOptionOut.model_validate(rec_option) if rec_option else None
    )


@router.get("/disruptions/{disruption_id}/graph", response_model=ImpactGraph)
def get_impact_graph(disruption_id: int, db: Session = Depends(get_db)):
    """
    Generate the visual dependency graph:
    MicroTech Components -> MCU-742 -> BOM -> NovaCore AX42 -> Production Order #1042 -> 500 Units -> Customer Order C8821 -> Delivery October 20
    """
    disruption = db.query(Disruption).filter(Disruption.id == disruption_id).first()
    has_disruption = disruption is not None and disruption.status == "active"

    status_color = "affected" if has_disruption else "healthy"

    nodes = [
        {"id": "node-1", "label": "MicroTech Components", "type": "supplier", "status": status_color, "data": {"subtitle": "Tier-1 Component Supplier", "detail": "ETA Slip: +5 Days" if has_disruption else "Status: On Schedule"}},
        {"id": "node-2", "label": "MCU-742", "type": "material", "status": status_color, "data": {"subtitle": "32-bit Microcontroller", "detail": "Stock: 50 / Req: 500" if has_disruption else "Stock: 50 Buffer"}},
        {"id": "node-3", "label": "BOM Items", "type": "bom", "status": status_color, "data": {"subtitle": "1x MCU-742 per AX42", "detail": "Assembly Requirement"}},
        {"id": "node-4", "label": "NovaCore AX42", "type": "product", "status": status_color, "data": {"subtitle": "Edge Controller Product", "detail": "SKU: AX42-PRO"}},
        {"id": "node-5", "label": "Production Order #1042", "type": "order", "status": status_color, "data": {"subtitle": "SMT Line 2", "detail": "Start: Oct 13 · Due: Oct 18"}},
        {"id": "node-6", "label": "500 Units", "type": "units", "status": status_color, "data": {"subtitle": "Batch Volume", "detail": "Assembly Scheduled"}},
        {"id": "node-7", "label": "Customer Order C8821", "type": "customer", "status": status_color, "data": {"subtitle": "Strategic Tier-1 Account", "detail": "High Priority SLA"}},
        {"id": "node-8", "label": "Delivery October 20", "type": "delivery", "status": status_color, "data": {"subtitle": "Customer Commitment", "detail": "Penalty Threshold" if has_disruption else "Guaranteed Delivery"}},
    ]

    edges = [
        {"id": "e1-2", "source": "node-1", "target": "node-2", "label": "SUPPLIES", "type": "critical" if has_disruption else "default"},
        {"id": "e2-3", "source": "node-2", "target": "node-3", "label": "SPECIFIED_IN", "type": "critical" if has_disruption else "default"},
        {"id": "e3-4", "source": "node-3", "target": "node-4", "label": "BUILDS", "type": "critical" if has_disruption else "default"},
        {"id": "e4-5", "source": "node-4", "target": "node-5", "label": "SCHEDULED_ON", "type": "critical" if has_disruption else "default"},
        {"id": "e5-6", "source": "node-5", "target": "node-6", "label": "PRODUCES", "type": "critical" if has_disruption else "default"},
        {"id": "e6-7", "source": "node-6", "target": "node-7", "label": "ALLOCATED_TO", "type": "critical" if has_disruption else "default"},
        {"id": "e7-8", "source": "node-7", "target": "node-8", "label": "COMMITTED_ON", "type": "critical" if has_disruption else "default"},
    ]

    return ImpactGraph(nodes=nodes, edges=edges)


@router.get("/recovery/options", response_model=List[RecoveryOptionOut])
def get_recovery_options(db: Session = Depends(get_db)):
    """Get all recovery options for active disruption."""
    options = db.query(RecoveryOption).order_by(RecoveryOption.option_code).all()
    if not options:
        # If none exist, trigger demo injection or return standard options
        disruption = db.query(Disruption).first()
        if not disruption:
            inject_disruption(db)
            options = db.query(RecoveryOption).order_by(RecoveryOption.option_code).all()
    return [RecoveryOptionOut.model_validate(o) for o in options]


@router.post("/recovery/approve", response_model=ApprovalResponse)
def approve_recovery_plan(req: ApprovalRequest, db: Session = Depends(get_db)):
    """Approve a recovery option, realign production schedules, and dispatch simulated integrations."""
    try:
        res = approve_recovery(req.recovery_option_id, req.approved_by or "Production Planner (Alex Rivera)", db)
        return ApprovalResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/production/orders", response_model=List[ProductionOrderOut])
def list_production_orders(db: Session = Depends(get_db)):
    """List all production orders and status."""
    orders = db.query(ProductionOrder).order_by(ProductionOrder.id).all()
    return [
        ProductionOrderOut(
            id=o.id,
            order_number=o.order_number,
            product_id=o.product_id,
            product_name=o.product.name if o.product else "NovaCore Edge Controller AX42",
            quantity=o.quantity,
            start_date=o.start_date,
            due_date=o.due_date,
            status=o.status,
            line_name=o.line_name
        )
        for o in orders
    ]


@router.get("/materials", response_model=List[MaterialOut])
def list_materials(db: Session = Depends(get_db)):
    """List materials and inventory stock with consistent supplier status."""
    materials = db.query(Material).all()
    active_disruption = db.query(Disruption).filter(Disruption.status == "active").first()
    return [
        MaterialOut(
            id=m.id,
            name=m.name,
            part_number=m.part_number,
            category=m.category,
            supplier_id=m.supplier_id,
            supplier_name=m.supplier.name if m.supplier else "MicroTech Components",
            supplier_status=(
                "DELAYED"
                if (m.supplier and m.supplier.status == "DELAYED") or (active_disruption and m.id == active_disruption.material_id)
                else "ON SCHEDULE"
            ),
            inventory=m.inventory,
            allocated_inventory=m.allocated_inventory,
            lead_time=m.lead_time,
            unit_cost=m.unit_cost
        )
        for m in materials
    ]


@router.get("/audit", response_model=List[AuditLogOut])
def get_audit_trail(db: Session = Depends(get_db)):
    """Retrieve immutable chronological audit trail."""
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).all()
    return [AuditLogOut.model_validate(l) for l in logs]


@router.post("/copilot/chat", response_model=CopilotChatResponse)
def orvex_copilot_chat(req: CopilotChatRequest, db: Session = Depends(get_db)):
    """Context-aware ORVEX operational copilot grounded in live manufacturing graph & evidence."""
    result = answer_copilot_query(
        message=req.message,
        db=db,
        conversation_id=req.conversation_id,
        current_page=req.current_page,
        selected_entity=req.selected_entity,
        current_analysis_id=req.current_analysis_id
    )

    # Convert sources to evidence_citations format for legacy backward compatibility
    evidence_citations = [
        {"document": s.get("document", ""), "quote": f"{s.get('type', '')}: {s.get('detail', '')}"}
        for s in result.get("sources", [])
    ]

    return CopilotChatResponse(
        reply=result["reply"],
        sources=result.get("sources", []),
        evidence_citations=evidence_citations,
        entities=result.get("entities", []),
        suggested_followups=result.get("suggested_followups", []),
        visual_trace=result.get("visual_trace"),
        action_guardrail=result.get("action_guardrail"),
        confidence_metadata=result.get("confidence_metadata", {"grounded": True, "engine": "ORVEX Operational Reasoning Graph"})
    )


@router.post("/chat", response_model=ChatResponse)
def operations_copilot_chat(req: ChatRequest, db: Session = Depends(get_db)):
    """Legacy endpoint forwarder to ORVEX copilot chat engine."""
    return orvex_copilot_chat(req, db)

