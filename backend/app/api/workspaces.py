"""Workspace API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import Workspace, AuditLog
from app.models.schemas import WorkspaceCreate, WorkspaceOut

router = APIRouter(tags=["Workspaces"])


@router.post("/workspaces", response_model=WorkspaceOut)
def create_workspace(body: WorkspaceCreate, db: Session = Depends(get_db)):
    ws = Workspace(
        name=body.name,
        description=body.description,
        organization=body.organization or "NovaCore Technologies",
    )
    db.add(ws)
    log = AuditLog(operation=f"Workspace created: {body.name}", source_type="HUMAN")
    db.add(log)
    db.commit()
    db.refresh(ws)
    return ws


@router.get("/workspaces", response_model=list[WorkspaceOut])
def list_workspaces(db: Session = Depends(get_db)):
    return db.query(Workspace).order_by(Workspace.id.desc()).all()


@router.get("/workspaces/{workspace_id}", response_model=WorkspaceOut)
def get_workspace(workspace_id: int, db: Session = Depends(get_db)):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws


@router.delete("/workspaces/{workspace_id}")
def delete_workspace(workspace_id: int, db: Session = Depends(get_db)):
    """Delete workspace and all associated data (for demo reset)."""
    from app.models.models import (
        Document, DocumentChunk, Analysis, Decision, Action,
        Risk, PolicyConflict, Dependency, Stakeholder, Evidence,
        Approval, WorkflowExecution
    )
    
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Delete in dependency order
    analyses = db.query(Analysis).filter(Analysis.workspace_id == workspace_id).all()
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

    db.query(Analysis).filter(Analysis.workspace_id == workspace_id).delete()
    
    docs = db.query(Document).filter(Document.workspace_id == workspace_id).all()
    for doc in docs:
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()
    db.query(Document).filter(Document.workspace_id == workspace_id).delete()
    
    db.delete(ws)
    db.commit()
    return {"message": "Workspace deleted"}
