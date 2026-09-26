"""Audit log API routes."""
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import AuditLog
from app.models.schemas import AuditLogOut

router = APIRouter(tags=["Audit"])


@router.get("/audit", response_model=list[AuditLogOut])
def get_audit_log(
    workspace_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = db.query(AuditLog)
    if workspace_id:
        q = q.filter(AuditLog.workspace_id == workspace_id)
    return q.order_by(AuditLog.timestamp.desc()).limit(limit).all()
