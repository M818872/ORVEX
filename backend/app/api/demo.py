"""Demo mode API routes — load NovaCore demo data and reset."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import Workspace, AuditLog
from app.services.document_service import load_demo_files
from app.services.company_feed_service import start_company_feed_demo, reset_company_feed
from app.ai.engine import reasoning_engine

logger = logging.getLogger("actionos")
router = APIRouter(tags=["Demo"])

DEMO_WORKSPACE_NAME = "NovaCore Technologies — Apex Launch Workspace"


@router.post("/demo/load")
def load_demo(db: Session = Depends(get_db)):
    """
    Load NovaCore demo: creates workspace, uploads all demo files,
    then runs the real AI pipeline. The AI answers are NEVER hardcoded.
    """
    # Find or create demo workspace
    ws = db.query(Workspace).filter(
        Workspace.name == DEMO_WORKSPACE_NAME
    ).first()

    if not ws:
        ws = Workspace(
            name=DEMO_WORKSPACE_NAME,
            description="NovaCore Technologies Apex Platform launch review — Q4 2026",
            organization="NovaCore Technologies",
        )
        db.add(ws)
        log = AuditLog(
            operation="Demo workspace created: NovaCore Technologies",
            source_type="SYSTEM",
        )
        db.add(log)
        db.commit()
        db.refresh(ws)

    # Load demo files
    try:
        docs = load_demo_files(ws.id, db)
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Run analysis
    analysis_id = reasoning_engine.run_analysis(ws.id, db)

    from app.models.models import Analysis
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()

    return {
        "workspace_id": ws.id,
        "workspace_name": ws.name,
        "documents_loaded": len(docs),
        "document_names": [d.filename for d in docs],
        "analysis_id": analysis_id,
        "analysis_status": analysis.status if analysis else "unknown",
        "message": "NovaCore demo loaded. AI pipeline executed dynamically.",
        "note": "AI analysis is generated in real-time — answers are NOT hardcoded.",
    }


@router.post("/demo/reset")
def reset_demo(db: Session = Depends(get_db)):
    """Delete demo workspace and all data. Re-seeding will re-run AI."""
    ws = db.query(Workspace).filter(
        Workspace.name == DEMO_WORKSPACE_NAME
    ).first()

    if not ws:
        return {"message": "No demo workspace found to reset"}

    ws_id = ws.id

    # Delete via workspace delete (reuse logic)
    from app.models.models import (
        Document, DocumentChunk, Analysis, Decision, Action,
        Risk, PolicyConflict, Dependency, Stakeholder, Evidence,
        Approval, WorkflowExecution
    )
    
    analyses = db.query(Analysis).filter(Analysis.workspace_id == ws_id).all()
    for a in analyses:
        db.query(Evidence).filter(Evidence.analysis_id == a.id).delete()
        db.query(Stakeholder).filter(Stakeholder.analysis_id == a.id).delete()
        db.query(Dependency).filter(Dependency.analysis_id == a.id).delete()
        db.query(PolicyConflict).filter(PolicyConflict.analysis_id == a.id).delete()
        db.query(Risk).filter(Risk.analysis_id == a.id).delete()
        actions = db.query(Action).filter(Action.analysis_id == a.id).all()
        for action in actions:
            db.query(Approval).filter(Approval.action_id == action.id).delete()
            db.query(WorkflowExecution).filter(WorkflowExecution.action_id == action.id).delete()
        db.query(Action).filter(Action.analysis_id == a.id).delete()
        db.query(Decision).filter(Decision.analysis_id == a.id).delete()

    db.query(Analysis).filter(Analysis.workspace_id == ws_id).delete()
    docs = db.query(Document).filter(Document.workspace_id == ws_id).all()
    for doc in docs:
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()
    db.query(Document).filter(Document.workspace_id == ws_id).delete()
    db.delete(ws)
    db.commit()

    log = AuditLog(
        operation="Demo workspace reset",
        source_type="HUMAN",
    )
    db.add(log)
    db.commit()

    return {"message": "Demo workspace reset. Call /api/demo/load to reload."}


@router.get("/demo/status")
def demo_status(db: Session = Depends(get_db)):
    """Check demo workspace status."""
    ws = db.query(Workspace).filter(
        Workspace.name == DEMO_WORKSPACE_NAME
    ).first()

    if not ws:
        return {"exists": False, "workspace_id": None, "analysis_id": None}

    from app.models.models import Analysis, Document
    doc_count = db.query(Document).filter(Document.workspace_id == ws.id).count()
    latest = db.query(Analysis).filter(
        Analysis.workspace_id == ws.id
    ).order_by(Analysis.id.desc()).first()

    return {
        "exists": True,
        "workspace_id": ws.id,
        "document_count": doc_count,
        "analysis_id": latest.id if latest else None,
        "analysis_status": latest.status if latest else None,
    }


@router.post("/demo/pitch/start")
def start_pitch_demo(db: Session = Depends(get_db)):
    """Arm the synthetic supplier disruption used by the live pitch."""
    return start_company_feed_demo(db)


@router.post("/demo/pitch/reset")
def reset_pitch_demo(db: Session = Depends(get_db)):
    """Reset the manufacturing demo environment to the healthy baseline."""
    return reset_company_feed(db)
