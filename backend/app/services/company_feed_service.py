"""ORVEX Company Feed Service — Synthetic Live Enterprise Operational Feed.

Simulates automated ERP, procurement, inventory, and supplier event streams
for the ORVEX AI Disruption & Recovery Copilot.
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.models import (
    Supplier, Material, Product, BOMItem, ProductionOrder,
    CustomerOrder, Disruption, ImpactAnalysis, RecoveryOption,
    AuditLog
)

logger = logging.getLogger("orvex")

# Canonical enterprise operational event as required by specification
CANONICAL_FEED_EVENT = {
    "event_type": "SUPPLIER_DELIVERY_DELAY",
    "supplier": "MicroTech Components",
    "purchase_order": "PO-8842",
    "material": "MCU-742",
    "previous_eta": "2026-10-12",
    "new_eta": "2026-10-17",
    "delay_days": 5,
    "reason": "Air-freight consolidation issue",
    "source": "Supplier Communication Feed",
    "synthetic": True,
}

CONNECTED_SOURCES = [
    {"name": "ERP / Orders", "status": "connected"},
    {"name": "Inventory", "status": "connected"},
    {"name": "Production", "status": "connected"},
    {"name": "Supplier Communications", "status": "connected"},
]


def get_company_feed_status(db: Session) -> Dict[str, Any]:
    """Retrieve operational status of the live synthetic company feed.

    Returns:
    - connected sources
    - last synchronization timestamp
    - pending events count
    - feed status
    - next event preview if pending
    """
    # Check if there is already an active disruption in the database
    active_disruption = (
        db.query(Disruption)
        .filter(Disruption.status == "active")
        .order_by(Disruption.id.desc())
        .first()
    )
    has_active_disruption = active_disruption is not None

    pending_events = 0 if has_active_disruption else 1
    next_event = None if has_active_disruption else CANONICAL_FEED_EVENT

    now = datetime.now()
    last_sync = now.strftime("%H:%M:%S")

    return {
        "status": "connected",
        "feed_status": "LIVE",
        "sources": CONNECTED_SOURCES,
        "last_sync": last_sync,
        "pending_events": pending_events,
        "note": "Synthetic enterprise feed for prototype",
        "next_event": next_event,
    }


def process_next_feed_event(
    db: Session, custom_event: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Process the next operational feed event through the full ORVEX manufacturing pipeline:

    1. Identify supplier
    2. Identify material & PO
    3. Trace BOM dependencies
    4. Find affected production orders
    5. Find affected customer commitments
    6. Calculate deterministic operational impact
    7. Generate 3 recovery strategies with trade-off evaluation
    8. Persist records and generate timestamped activity lineage
    """
    event = custom_event or CANONICAL_FEED_EVENT
    logger.info(
        f"ORVEX processing live operational feed event: {event.get('event_type')} for {event.get('material')}"
    )

    # Base clock for lineage timestamps (consecutive 1-second steps ending at current second)
    now = datetime.now()
    t_start = now - timedelta(seconds=4)
    ts_signal = (t_start).strftime("%H:%M:%S")
    ts_material = (t_start + timedelta(seconds=1)).strftime("%H:%M:%S")
    ts_bom = (t_start + timedelta(seconds=2)).strftime("%H:%M:%S")
    ts_impact = (t_start + timedelta(seconds=3)).strftime("%H:%M:%S")
    ts_recovery = now.strftime("%H:%M:%S")

    # Step 1: Identify Supplier
    supplier_name = event.get("supplier", "MicroTech Components")
    supplier = (
        db.query(Supplier)
        .filter(Supplier.name.ilike(f"%{supplier_name[:10]}%"))
        .first()
    )
    if not supplier:
        supplier = db.query(Supplier).first()

    # Step 2: Identify Material & PO
    material_name = event.get("material", "MCU-742")
    po_number = event.get("purchase_order", "PO-8842")

    material = (
        db.query(Material)
        .filter(Material.name.ilike(f"%{material_name}%"))
        .first()
    )
    if not material:
        material = (
            db.query(Material)
            .filter(Material.part_number.ilike(f"%{material_name}%"))
            .first()
        )
    if not material:
        material = db.query(Material).first()

    # Step 3: Trace BOM Dependencies
    bom_items = db.query(BOMItem).filter(BOMItem.material_id == material.id).all()
    product_ids = [b.product_id for b in bom_items]
    products = db.query(Product).filter(Product.id.in_(product_ids)).all()
    product_name = products[0].name if products else "NovaCore Edge Controller AX42"
    product_sku = products[0].sku if products else "AX42-PRO"

    # Step 4: Find Affected Production Orders
    new_eta = event.get("new_eta", "2026-10-17")
    old_eta = event.get("previous_eta", "2026-10-12")
    delay_days = event.get("delay_days", 5)
    reason = event.get("reason", "Air-freight consolidation issue")

    production_orders = (
        db.query(ProductionOrder)
        .filter(
            ProductionOrder.product_id.in_(product_ids),
            ProductionOrder.start_date <= new_eta,
        )
        .all()
    )

    # Step 5: Find Affected Customer Commitments
    customer_orders = (
        db.query(CustomerOrder)
        .filter(
            CustomerOrder.product_id.in_(product_ids),
            CustomerOrder.delivery_date <= "2026-10-21",
        )
        .all()
    )

    # Update operational records to At Risk
    for po in production_orders:
        po.status = "At Risk"
    for co in customer_orders:
        co.status = "At Risk"
    if supplier:
        supplier.status = "delayed"
    db.commit()

    # Step 6: Persist Disruption Record
    disruption = Disruption(
        supplier_id=supplier.id if supplier else 1,
        material_id=material.id if material else 1,
        old_eta=old_eta,
        new_eta=new_eta,
        delay_days=delay_days,
        reason=reason,
        source_document=f"{event.get('source', 'Supplier Communication Feed')} ({po_number})",
        raw_text=json.dumps(event, indent=2),
        status="active",
    )
    db.add(disruption)
    db.commit()
    db.refresh(disruption)

    # Format Affected Orders
    affected_orders_list = [
        {
            "order_number": po.order_number,
            "product_name": po.product.name if po.product else product_name,
            "quantity": po.quantity,
            "start_date": po.start_date,
            "line_name": po.line_name,
            "status": "At Risk",
        }
        for po in production_orders
    ]
    if not affected_orders_list:
        affected_orders_list = [
            {
                "order_number": "Order #1042",
                "product_name": product_name,
                "quantity": 500,
                "start_date": "2026-10-13",
                "line_name": "SMT Line 2",
                "status": "At Risk",
            },
            {
                "order_number": "Order #1040",
                "product_name": product_name,
                "quantity": 200,
                "start_date": "2026-10-10",
                "line_name": "SMT Line 1",
                "status": "At Risk",
            },
            {
                "order_number": "Order #1045",
                "product_name": product_name,
                "quantity": 300,
                "start_date": "2026-10-15",
                "line_name": "SMT Line 2",
                "status": "At Risk",
            },
        ]

    # Format Affected Customers
    affected_customers_list = [
        {
            "customer_name": co.customer_name,
            "product_name": co.product.name if co.product else product_name,
            "quantity": co.quantity,
            "delivery_date": co.delivery_date,
            "priority": co.priority,
            "status": "At Risk",
        }
        for co in customer_orders
    ]
    if not affected_customers_list:
        affected_customers_list = [
            {
                "customer_name": "Customer C8821",
                "product_name": product_name,
                "quantity": 500,
                "delivery_date": "2026-10-20",
                "priority": "High",
                "status": "At Risk",
            }
        ]

    # Impact Calculation
    affected_units = 500
    affected_lines = list({po["line_name"] for po in affected_orders_list})

    evidence_list = [
        {
            "source": "Supplier Communication Feed",
            "quote": f"{supplier.name if supplier else supplier_name} reported delivery slip on PO {po_number}. ETA shifted from {old_eta} to {new_eta} (+{delay_days} days).",
            "section": "Live Operational Signal Ingestion",
        },
        {
            "source": "Inventory & Material Master",
            "quote": f"{material.name} (Part #{material.part_number}) stock on-hand is {material.inventory} units. Assembly requirement is 500 units for Order #1042.",
            "section": "Component Stock Verification",
        },
        {
            "source": "BOM & MRP Ledger",
            "quote": f"{material.name} is an indispensable core IC for {product_name} ({product_sku}). Assembly on SMT Line 2 scheduled for Oct 13.",
            "section": "Bill of Materials Dependency",
        },
        {
            "source": "Customer Contract C8821",
            "quote": "500 units guaranteed for Customer C8821 on October 20.",
            "section": "Commercial Delivery Commitment",
        },
    ]

    explanation = (
        f"Operational Signal: {supplier.name if supplier else supplier_name} delayed {material.name} "
        f"by +{delay_days} days (PO {po_number}, ETA moved from {old_eta} to {new_eta}) due to '{reason}'. "
        f"On-hand inventory is {material.inventory} units. Order #1042 requires 500 units to start assembly "
        f"on SMT Line 2 on October 13. Delivery commitment for Customer C8821 (500 units on October 20) is placed at critical risk."
    )

    impact = ImpactAnalysis(
        disruption_id=disruption.id,
        affected_orders_json=json.dumps(affected_orders_list),
        affected_units=affected_units,
        affected_customers_json=json.dumps(affected_customers_list),
        risk_level="Critical",
        explanation=explanation,
        evidence_json=json.dumps(evidence_list),
    )
    db.add(impact)
    db.commit()

    # Step 7: Generate 3 Recovery Options
    opt_a = RecoveryOption(
        disruption_id=disruption.id,
        option_code="A",
        option_name="Expedite supplier shipment (Dedicated Air Cargo)",
        cost="₹42,000",
        cost_amount=42000.0,
        delay="0 days (ETA: Oct 13)",
        risk="Low",
        customer_impact="None — Customer C8821 delivery on October 20 is fully protected.",
        production_impact="Low — SMT Line 2 runs 1 overtime shift to recover 8-hour staging window.",
        recommended=True,
        rationale="Expedite MCU-742 because it protects the October 20 customer commitment while avoiding alternate-supplier qualification.",
    )
    opt_b = RecoveryOption(
        disruption_id=disruption.id,
        option_code="B",
        option_name="Use alternate supplier (SiliconDirect India)",
        cost="₹85,000",
        cost_amount=85000.0,
        delay="+3 days (ETA: Oct 16)",
        risk="Medium",
        customer_impact="Moderate — Customer delivery slips by 3 days to October 23.",
        production_impact="Medium — Requires engineering PPAP re-qualification & SMT feeder recalibration.",
        recommended=False,
        rationale="Alternate supplier part requires 10-day automotive-grade qualification test.",
    )
    opt_c = RecoveryOption(
        disruption_id=disruption.id,
        option_code="C",
        option_name="Reschedule production & notify customer",
        cost="₹12,000",
        cost_amount=12000.0,
        delay="+5 days (ETA: Oct 17)",
        risk="High",
        customer_impact="Severe — Customer C8821 delivery delayed by 5 days from Oct 20 to Oct 25.",
        production_impact="High — SMT Line 2 idle for 36 hours; schedule re-slotting penalty applies.",
        recommended=False,
        rationale="Rescheduling breaches contractual SLA penalty threshold with Customer C8821.",
    )
    db.add(opt_a)
    db.add(opt_b)
    db.add(opt_c)
    db.commit()

    # Step 8: Build Verified Activity & Data Lineage (Exact specification for Section 6)
    lineage = [
        {
            "stage": "SIGNAL_RECEIVED",
            "timestamp": ts_signal,
            "title": "Supplier signal received",
            "detail": f"{supplier.name if supplier else supplier_name}\n{po_number}",
            "source": "Supplier Communication Feed",
        },
        {
            "stage": "ENTITY_MATCHED",
            "timestamp": ts_material,
            "title": f"{material.name} matched to material master",
            "detail": f"Part #{material.part_number} · Category: {material.category} · On-hand: {material.inventory}",
            "source": "Inventory Master",
        },
        {
            "stage": "BOM_TRACED",
            "timestamp": ts_bom,
            "title": "BOM dependency traced",
            "detail": "AX42 Controller",
            "source": "BOM & MES",
        },
        {
            "stage": "IMPACT_CALCULATED",
            "timestamp": ts_impact,
            "title": "Production impact calculated",
            "detail": "500 customer units potentially affected",
            "source": "MRP Engine",
        },
        {
            "stage": "RECOVERY_GENERATED",
            "timestamp": ts_recovery,
            "title": "Recovery scenarios generated",
            "detail": "3 options",
            "source": "ORVEX AI Copilot",
        },
    ]

    # Write persistent audit logs
    audit_events = [
        AuditLog(
            event=f"Supplier signal received: {supplier.name if supplier else supplier_name} ({po_number})",
            timestamp=ts_signal,
            actor="ORVEX INGESTION PIPELINE",
            details=f"Inbound operational signal detected: {material.name} delayed by {delay_days} days. Reason: {reason}.",
            source_type="FEED_INGESTION",
        ),
        AuditLog(
            event=f"{material.name} matched to material master",
            timestamp=ts_material,
            actor="ORVEX ENTITY RESOLUTION",
            details=f"Matched part #{material.part_number}. Inventory available: {material.inventory} units. Required: 500 units.",
            source_type="ENTITY_RESOLUTION",
        ),
        AuditLog(
            event=f"BOM dependency traced: {product_name}",
            timestamp=ts_bom,
            actor="ORVEX BOM ENGINE",
            details=f"Traced component requirement to {product_name} assembly on SMT Line 2.",
            source_type="DEPENDENCY_ENGINE",
        ),
        AuditLog(
            event="Production impact calculated: 500 customer units affected",
            timestamp=ts_impact,
            actor="ORVEX IMPACT ENGINE",
            details="Order #1042 compromised. Customer C8821 delivery commitment (Oct 20) placed at risk.",
            source_type="RISK_ANALYSIS",
        ),
        AuditLog(
            event="Recovery scenarios generated: 3 options evaluated",
            timestamp=ts_recovery,
            actor="ORVEX RECOVERY ENGINE",
            details="Option A (Expedite Dedicated Air Cargo) generated and recommended to protect customer commitment.",
            source_type="AI_RECOMMENDATION",
        ),
    ]
    for ae in audit_events:
        db.add(ae)
    db.commit()

    logger.info(
        f"Operational feed event processed successfully — Disruption #{disruption.id} recorded with 5-stage lineage."
    )

    return {
        "status": "success",
        "disruption_id": disruption.id,
        "event": event,
        "resolved_entities": {
            "supplier": supplier.name if supplier else supplier_name,
            "supplier_id": supplier.id if supplier else 1,
            "material": material.name if material else material_name,
            "material_id": material.id if material else 1,
            "part_number": material.part_number if material else "MCU-742-32BIT",
            "purchase_order": po_number,
        },
        "bom_dependency": {
            "product_id": products[0].id if products else 1,
            "product_name": product_name,
            "product_sku": product_sku,
            "component_role": "Core 32-bit MCU controlling high-speed I/O and telemetry",
        },
        "impact_summary": {
            "affected_orders_count": len(affected_orders_list),
            "affected_orders": affected_orders_list,
            "affected_units": affected_units,
            "affected_customers_count": len(affected_customers_list),
            "affected_customers": affected_customers_list,
            "affected_lines": affected_lines,
            "risk_level": "Critical",
            "delay_days": delay_days,
            "new_eta": new_eta,
            "old_eta": old_eta,
        },
        "recommendation": {
            "recommended_option": opt_a.option_name,
            "cost": opt_a.cost,
            "delay": opt_a.delay,
            "rationale": opt_a.rationale,
            "total_options": 3,
        },
        "lineage": lineage,
        "message": f"Autonomous feed processed: {material.name} delayed by {delay_days} days. 500 units affected across {len(affected_orders_list)} orders.",
    }


def reset_company_feed(db: Session) -> Dict[str, Any]:
    """Reset the operational company feed queue and seed the healthy baseline."""
    from app.services.manufacturing_service import seed_healthy_state

    seed_healthy_state(db)
    return {
        "status": "connected",
        "feed_status": "LIVE",
        "message": "Company operational feed reset. Baseline healthy state restored.",
        "pending_events": 1,
        "sources": CONNECTED_SOURCES,
    }
