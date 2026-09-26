"""Action approval and execution API routes."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import Action, Approval, AuditLog
from app.models.schemas import ActionOut
from app.services.workflow_service import simulate_execution

logger = logging.getLogger("actionos")
router = APIRouter(tags=["Actions"])


@router.post("/actions/{action_id}/approve")
def approve_action(
    action_id: int,
    user: str = "Operations Manager",
    notes: str = None,
    db: Session = Depends(get_db),
):
    action = db.query(Action).filter(Action.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")

    action.status = "approved"
    from datetime import datetime
    action.approved_at = datetime.utcnow()
    action.approved_by = user

    approval = Approval(action_id=action_id, user=user, decision="approved", notes=notes)
    db.add(approval)

    log = AuditLog(
        operation=f"Action approved: {action.title[:80]}",
        user=user,
        source_type="HUMAN",
        workspace_id=action.workspace_id,
        analysis_id=action.analysis_id,
        entity_type="action",
        entity_id=action_id,
        approval_status="approved",
    )
    db.add(log)
    db.commit()

    return {"message": "Action approved", "action_id": action_id, "status": "approved"}


@router.post("/actions/{action_id}/reject")
def reject_action(
    action_id: int,
    user: str = "Operations Manager",
    notes: str = None,
    db: Session = Depends(get_db),
):
    action = db.query(Action).filter(Action.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")

    action.status = "rejected"
    approval = Approval(action_id=action_id, user=user, decision="rejected", notes=notes)
    db.add(approval)

    log = AuditLog(
        operation=f"Action rejected: {action.title[:80]}",
        user=user,
        source_type="HUMAN",
        workspace_id=action.workspace_id,
        entity_type="action",
        entity_id=action_id,
        approval_status="rejected",
    )
    db.add(log)
    db.commit()

    return {"message": "Action rejected", "action_id": action_id, "status": "rejected"}


@router.post("/actions/approve-all")
def approve_all_actions(
    analysis_id: int,
    user: str = "Operations Manager",
    db: Session = Depends(get_db),
):
    actions = db.query(Action).filter(
        Action.analysis_id == analysis_id,
        Action.status == "proposed"
    ).all()

    from datetime import datetime
    approved_ids = []
    for action in actions:
        action.status = "approved"
        action.approved_at = datetime.utcnow()
        action.approved_by = user
        approval = Approval(action_id=action.id, user=user, decision="approved")
        db.add(approval)
        approved_ids.append(action.id)

    log = AuditLog(
        operation=f"Bulk action approval: {len(approved_ids)} actions approved",
        user=user,
        source_type="HUMAN",
        analysis_id=analysis_id,
        approval_status="approved",
        result=f"{len(approved_ids)} actions",
    )
    db.add(log)
    db.commit()

    return {"message": f"{len(approved_ids)} actions approved", "approved_ids": approved_ids}


@router.post("/actions/{action_id}/execute")
def execute_action(action_id: int, db: Session = Depends(get_db)):
    """Simulate workflow execution for an approved action."""
    try:
        results = simulate_execution(action_id, db)
        return {
            "action_id": action_id,
            "status": "executed",
            "executions": results,
            "simulation_note": "⚠ PROTOTYPE INTEGRATION — All workflow executions are simulated. No real external systems were connected.",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Execution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
