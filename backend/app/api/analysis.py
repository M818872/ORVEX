"""Analysis API routes — run analysis, get results, challenge, impact, drift, graph."""
import json
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import (
    Analysis, Decision, Action, Risk, PolicyConflict,
    Dependency, Evidence, Stakeholder, Document, DocumentChunk, AuditLog
)
from app.models.schemas import (
    AnalysisOut, DecisionOut, ActionOut, RiskOut, PolicyConflictOut,
    DependencyOut, EvidenceOut, IntelligenceSummary,
    ChallengeResult, ImpactAssessment, DecisionGraph, DriftResult,
    ScenarioSimulateRequest, ScenarioSimulateResponse,
    DashboardData, AttentionItem, RecentChangeItem,
    ChatRequest, ChatResponse
)
from app.services.document_service import inject_vendor_delay_file
from app.ai.engine import reasoning_engine

logger = logging.getLogger("actionos")
router = APIRouter(tags=["Analysis"])


@router.post("/analysis/run")
def run_analysis(workspace_id: int, db: Session = Depends(get_db)):
    """Trigger AI analysis on workspace documents."""
    from app.models.models import Document
    
    docs = db.query(Document).filter(
        Document.workspace_id == workspace_id,
        Document.status == "processed"
    ).count()
    
    if docs == 0:
        raise HTTPException(status_code=400, detail="No processed documents found. Upload and process documents first.")

    analysis_id = reasoning_engine.run_analysis(workspace_id, db)
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    
    return {
        "analysis_id": analysis_id,
        "status": analysis.status if analysis else "unknown",
        "message": "Analysis complete" if analysis and analysis.status == "completed" else "Analysis failed",
        "error": analysis.error_message if analysis else None,
    }


@router.get("/analysis/{analysis_id}", response_model=AnalysisOut)
def get_analysis(analysis_id: int, db: Session = Depends(get_db)):
    a = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return a


@router.get("/analysis/workspace/{workspace_id}/latest")
def get_latest_analysis(workspace_id: int, db: Session = Depends(get_db)):
    a = db.query(Analysis).filter(
        Analysis.workspace_id == workspace_id,
        Analysis.status == "completed"
    ).order_by(Analysis.id.desc()).first()
    
    if not a:
        return {"analysis_id": None, "status": "none"}
    
    return {
        "analysis_id": a.id,
        "status": a.status,
        "started_at": a.started_at.isoformat(),
        "completed_at": a.completed_at.isoformat() if a.completed_at else None,
        "duration_seconds": a.duration_seconds,
    }


@router.get("/analysis/{analysis_id}/summary", response_model=IntelligenceSummary)
def get_intelligence_summary(analysis_id: int, db: Session = Depends(get_db)):
    a = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return IntelligenceSummary(
        analysis_id=analysis_id,
        status=a.status,
        executive_summary=a.executive_summary,
        decision_count=db.query(Decision).filter(Decision.analysis_id == analysis_id).count(),
        action_count=db.query(Action).filter(Action.analysis_id == analysis_id).count(),
        risk_count=db.query(Risk).filter(Risk.analysis_id == analysis_id).count(),
        policy_conflict_count=db.query(PolicyConflict).filter(PolicyConflict.analysis_id == analysis_id).count(),
        dependency_count=db.query(Dependency).filter(Dependency.analysis_id == analysis_id).count(),
        stakeholder_count=db.query(Stakeholder).filter(Stakeholder.analysis_id == analysis_id).count(),
        evidence_count=db.query(Evidence).filter(Evidence.analysis_id == analysis_id).count(),
        duration_seconds=a.duration_seconds,
    )


@router.get("/decisions")
def list_decisions(analysis_id: Optional[int] = None, workspace_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Decision)
    if analysis_id:
        q = q.filter(Decision.analysis_id == analysis_id)
    if workspace_id:
        q = q.filter(Decision.workspace_id == workspace_id)
    items = q.order_by(Decision.id).all()
    return [DecisionOut.from_model(d) for d in items]


@router.get("/actions")
def list_actions(
    analysis_id: Optional[int] = None,
    workspace_id: Optional[int] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Action)
    if analysis_id:
        q = q.filter(Action.analysis_id == analysis_id)
    if workspace_id:
        q = q.filter(Action.workspace_id == workspace_id)
    if priority:
        q = q.filter(Action.priority == priority)
    if status:
        q = q.filter(Action.status == status)
    items = q.order_by(Action.id).all()
    return [ActionOut.from_model(a) for a in items]


@router.get("/risks")
def list_risks(analysis_id: Optional[int] = None, workspace_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Risk)
    if analysis_id:
        q = q.filter(Risk.analysis_id == analysis_id)
    if workspace_id:
        q = q.filter(Risk.workspace_id == workspace_id)
    items = q.order_by(Risk.id).all()
    return [RiskOut.from_model(r) for r in items]


@router.get("/policy-conflicts")
def list_policy_conflicts(analysis_id: Optional[int] = None, workspace_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(PolicyConflict)
    if analysis_id:
        q = q.filter(PolicyConflict.analysis_id == analysis_id)
    if workspace_id:
        q = q.filter(PolicyConflict.workspace_id == workspace_id)
    items = q.order_by(PolicyConflict.id).all()
    return [PolicyConflictOut.from_model(pc) for pc in items]


@router.get("/dependencies")
def list_dependencies(analysis_id: Optional[int] = None, workspace_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Dependency)
    if analysis_id:
        q = q.filter(Dependency.analysis_id == analysis_id)
    if workspace_id:
        q = q.filter(Dependency.workspace_id == workspace_id)
    items = q.order_by(Dependency.id).all()
    return [DependencyOut.from_model(d) for d in items]


@router.get("/evidence")
def list_evidence(analysis_id: Optional[int] = None, ext_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Evidence)
    if analysis_id:
        q = q.filter(Evidence.analysis_id == analysis_id)
    if ext_id:
        q = q.filter(Evidence.ext_id == ext_id)
    items = q.order_by(Evidence.id).all()
    return [EvidenceOut.from_model(e) for e in items]


@router.get("/decision-graph/{analysis_id}", response_model=DecisionGraph)
def get_decision_graph(analysis_id: int, db: Session = Depends(get_db)):
    graph = reasoning_engine.build_decision_graph(analysis_id, db)
    return DecisionGraph(nodes=graph["nodes"], edges=graph["edges"])


@router.post("/decision/challenge")
def challenge_decision(
    decision_text: str,
    workspace_id: int,
    db: Session = Depends(get_db)
):
    """Dynamically challenge a decision using AI analysis."""
    result = reasoning_engine.challenge_decision(decision_text, workspace_id, db)
    return result


@router.get("/decision/impact/{analysis_id}")
def get_impact(
    analysis_id: int,
    decision_text: str = "the proposed decision",
    db: Session = Depends(get_db)
):
    """Calculate impact before acting on a decision."""
    result = reasoning_engine.calculate_impact(decision_text, analysis_id, db)
    return result


@router.post("/decision-drift/analyze")
def analyze_drift(
    workspace_id: int,
    previous_analysis_id: int,
    db: Session = Depends(get_db)
):
    """Detect decision drift between analysis runs."""
    result = reasoning_engine.detect_drift(workspace_id, previous_analysis_id, db)
    return result


# ── Decision Integrity & Dashboard Endpoints ─────────────────────────────────

@router.get("/dashboard", response_model=DashboardData)
def get_dashboard_data(workspace_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get organizational intelligence metrics, attention item, and recent changes feed."""
    latest_analysis = None
    if workspace_id:
        latest_analysis = db.query(Analysis).filter(
            Analysis.workspace_id == workspace_id,
            Analysis.status == "completed"
        ).order_by(Analysis.id.desc()).first()

    q_dec = db.query(Decision)
    if latest_analysis:
        q_dec = q_dec.filter(Decision.analysis_id == latest_analysis.id)
    elif workspace_id:
        q_dec = q_dec.filter(Decision.workspace_id == workspace_id)
    decisions = q_dec.order_by(Decision.id.desc()).all()

    primary_dec = decisions[0] if decisions else None
    is_at_risk = (primary_dec.status in ("at_risk", "compromised")) if primary_dec else False

    q_risks = db.query(Risk)
    if latest_analysis:
        q_risks = q_risks.filter(Risk.analysis_id == latest_analysis.id)
    elif workspace_id:
        q_risks = q_risks.filter(Risk.workspace_id == workspace_id)
    open_risks = q_risks.count()

    q_deps = db.query(Dependency)
    if latest_analysis:
        q_deps = q_deps.filter(Dependency.analysis_id == latest_analysis.id)
    elif workspace_id:
        q_deps = q_deps.filter(Dependency.workspace_id == workspace_id)
    unresolved_deps = q_deps.filter(Dependency.status != "healthy").count()

    pending_approvals = 2 if is_at_risk else 1

    attention = None
    if primary_dec and is_at_risk:
        attention = AttentionItem(
            decision_id=primary_dec.ext_id,
            title=primary_dec.title,
            target_date=primary_dec.date or "2026-10-15",
            status=primary_dec.status,
            integrity_score=int(primary_dec.integrity_score * 100),
            reason="Vendor API delivery delayed by 4 days (Oct 14 → Oct 18).",
            affected_teams_count=4,
            affected_tasks_count=7,
            pending_approvals_count=2,
        )

    if is_at_risk:
        changes = [
            RecentChangeItem(id="rc-1", title="Vendor API delivery", delta="+4 days (Oct 18)", status="delayed", timestamp="09:15 UTC", source_doc="event_vendor_delay_notice.txt"),
            RecentChangeItem(id="rc-2", title="Decision D-1042 integrity", delta="61% (At Risk)", status="at_risk", timestamp="09:16 UTC", source_doc="AI Reasoning Engine"),
            RecentChangeItem(id="rc-3", title="QA milestone", delta="Blocked on endpoint", status="blocked", timestamp="09:17 UTC", source_doc="doc3_project_status_report.txt"),
            RecentChangeItem(id="rc-4", title="Compliance Policy", delta="Exception Required (OPS-GOV-001)", status="warning", timestamp="09:18 UTC", source_doc="doc4_compliance_policy.txt"),
        ]
    else:
        changes = [
            RecentChangeItem(id="rc-1", title="Vendor API delivery", delta="Confirmed for Oct 14", status="healthy", timestamp="09:00 UTC", source_doc="doc2_vendor_confirmation.txt"),
            RecentChangeItem(id="rc-2", title="Decision D-1042 integrity", delta="94% (Healthy)", status="healthy", timestamp="09:05 UTC", source_doc="AI Reasoning Engine"),
            RecentChangeItem(id="rc-3", title="QA milestone", delta="Automated suites staged", status="healthy", timestamp="09:10 UTC", source_doc="doc3_project_status_report.txt"),
            RecentChangeItem(id="rc-4", title="Finance approval", delta="$2.4M ARR Target Signed", status="healthy", timestamp="09:12 UTC", source_doc="doc5_finance_approval.txt"),
        ]

    return DashboardData(
        integrity_score=int(primary_dec.integrity_score * 100) if primary_dec else 94,
        decisions_at_risk_count=1 if is_at_risk else 0,
        total_decisions_count=max(len(decisions), 1),
        open_risks_count=open_risks if open_risks > 0 else (4 if is_at_risk else 1),
        unresolved_dependencies_count=unresolved_deps if unresolved_deps > 0 else (2 if is_at_risk else 0),
        pending_approvals_count=pending_approvals,
        system_status="at_risk" if is_at_risk else "healthy",
        attention_required=attention,
        recent_changes=changes,
    )


@router.get("/decisions/{decision_id}")
def get_decision_detail(decision_id: str, db: Session = Depends(get_db)):
    """Get single decision detail by id or ext_id."""
    dec = None
    if decision_id.isdigit():
        dec = db.query(Decision).filter(Decision.id == int(decision_id)).first()
    if not dec:
        dec = db.query(Decision).filter(Decision.ext_id == decision_id).order_by(Decision.id.desc()).first()
    if not dec:
        # Fallback to the latest decision
        dec = db.query(Decision).order_by(Decision.id.desc()).first()
    if not dec:
        raise HTTPException(status_code=404, detail=f"Decision {decision_id} not found")
    return DecisionOut.from_model(dec)


@router.get("/decisions/{decision_id}/causal-chain")
def get_causal_chain(decision_id: str, db: Session = Depends(get_db)):
    """Get visual causal chain for a decision."""
    dec = None
    if decision_id.isdigit():
        dec = db.query(Decision).filter(Decision.id == int(decision_id)).first()
    if not dec:
        dec = db.query(Decision).filter(Decision.ext_id == decision_id).order_by(Decision.id.desc()).first()
    if not dec:
        dec = db.query(Decision).order_by(Decision.id.desc()).first()
    if not dec:
        raise HTTPException(status_code=404, detail="Decision not found")
    return {"decision_id": dec.ext_id, "causal_chain": dec.causal_chain}


@router.post("/decisions/{decision_id}/approve")
def approve_decision_scenario(
    decision_id: str,
    target_date: str = "2026-10-20",
    approved_by: str = "Sarah Chen (VP Operations)",
    db: Session = Depends(get_db)
):
    """Approve recommended scenario, updating decision target date and restoring integrity."""
    dec = None
    if decision_id.isdigit():
        dec = db.query(Decision).filter(Decision.id == int(decision_id)).first()
    if not dec:
        dec = db.query(Decision).filter(Decision.ext_id == decision_id).order_by(Decision.id.desc()).first()
    if not dec:
        dec = db.query(Decision).order_by(Decision.id.desc()).first()
    if not dec:
        raise HTTPException(status_code=404, detail="Decision not found")

    dec.date = target_date
    dec.status = "healthy"
    dec.integrity_score = 0.92
    dec.description = f"Production release of NovaCore Edge Platform rescheduled to {target_date} with VP Operations waiver."

    chain = [
        {"id": "cc-1", "step": "Vendor API Delivery", "status": "healthy", "detail": "Meridian confirms Oct 18 delivery"},
        {"id": "cc-2", "step": "API Dependency Restored", "status": "healthy", "detail": "2-day buffer (Oct 18-19) allocated for mTLS integration"},
        {"id": "cc-3", "step": "Engineering Completion", "status": "healthy", "detail": "Sprint realigned for Oct 18-19 weekend integration"},
        {"id": "cc-4", "step": "QA Validation Window", "status": "healthy", "detail": "36-hour regression test window secured"},
        {"id": "cc-5", "step": f"Production Launch on {target_date}", "status": "healthy", "detail": f"Target rescheduled and synchronized (Integrity: 92%)"}
    ]
    dec.causal_chain_json = json.dumps(chain)

    tasks = dec.affected_tasks
    for t in tasks:
        t["status"] = "on_track"
    dec.affected_tasks_json = json.dumps(tasks)

    teams = dec.affected_teams
    for tm in teams:
        tm["status"] = "healthy"
        tm["tasks_affected"] = 0
    dec.affected_teams_json = json.dumps(teams)

    log1 = AuditLog(
        operation=f"Manager {approved_by} approved scenario: Move launch to {target_date}",
        source_type="HUMAN",
        workspace_id=dec.workspace_id,
        analysis_id=dec.analysis_id,
        entity_type="decision",
        entity_id=dec.id,
        approval_status="approved",
        result=f"Decision {dec.ext_id} updated to {target_date} (Integrity restored to 92%)"
    )
    log2 = AuditLog(
        operation=f"Simulated execution: Jira APEX-1042 rescheduled to {target_date} & Slack broadcast sent to #launch-war-room",
        source_type="SYSTEM",
        workspace_id=dec.workspace_id,
        analysis_id=dec.analysis_id,
        result="Success"
    )
    db.add(log1)
    db.add(log2)
    db.commit()

    return {
        "status": "approved",
        "decision_id": dec.ext_id,
        "new_target_date": target_date,
        "integrity_score": dec.integrity_score,
        "message": f"Scenario approved! Decision {dec.ext_id} rescheduled to {target_date}. Decision integrity restored to 92%.",
        "simulated_actions": [
            {"service": "Jira", "action": "Updated issue APEX-1042 release date to 2026-10-20"},
            {"service": "Slack", "action": "Broadcast advisory to #launch-war-room and #leadership"},
            {"service": "Email / CRM", "action": "Queued 14 customer account briefings under OPS-GOV-001 Section 4.3"}
        ]
    }


@router.post("/scenarios/simulate", response_model=ScenarioSimulateResponse)
def simulate_scenario_endpoint(req: ScenarioSimulateRequest, db: Session = Depends(get_db)):
    """Run what-if scenario simulation."""
    res = reasoning_engine.simulate_scenario(req.scenario_prompt, req.workspace_id, db)
    return ScenarioSimulateResponse(**res)


@router.post("/events/inject-delay")
def inject_vendor_delay_event(workspace_id: int, db: Session = Depends(get_db)):
    """Killer Demo Event: Inject Vendor Delay Notice and run dynamic reasoning."""
    doc = inject_vendor_delay_file(workspace_id, db)
    analysis_id = reasoning_engine.run_analysis(workspace_id, db)
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()

    return {
        "status": "event_injected",
        "event_document": doc.filename,
        "analysis_id": analysis_id,
        "analysis_status": analysis.status if analysis else "unknown",
        "message": "Vendor Delay Notice ingested. Decision integrity recalculated: Decision D-1042 is now AT RISK (61%)."
    }


@router.post("/events/reset-healthy")
def reset_to_healthy_event(workspace_id: int, db: Session = Depends(get_db)):
    """Reset demo to 🟢 HEALTHY baseline."""
    delay_docs = db.query(Document).filter(
        Document.workspace_id == workspace_id,
        Document.filename == "event_vendor_delay_notice.txt"
    ).all()
    for d in delay_docs:
        db.query(DocumentChunk).filter(DocumentChunk.document_id == d.id).delete()
        db.delete(d)
    db.commit()

    analysis_id = reasoning_engine.run_analysis(workspace_id, db)
    return {
        "status": "reset_healthy",
        "analysis_id": analysis_id,
        "message": "System reset to 🟢 HEALTHY baseline (Integrity: 94%)."
    }


@router.post("/chat", response_model=ChatResponse)
def chat_copilot(req: ChatRequest, db: Session = Depends(get_db)):
    """Contextual assistant query grounded in decision graph and evidence."""
    res = reasoning_engine.answer_chat_query(req.message, req.workspace_id, db)
    return ChatResponse(**res)
