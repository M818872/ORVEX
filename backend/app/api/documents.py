"""Document upload and management API routes."""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import Document
from app.models.schemas import DocumentOut
from app.services.document_service import save_uploaded_file

logger = logging.getLogger("actionos")
router = APIRouter(tags=["Documents"])


@router.post("/documents/upload", response_model=DocumentOut)
async def upload_document(
    file: UploadFile = File(...),
    workspace_id: int = Form(...),
    db: Session = Depends(get_db),
):
    """Upload and process a document into the workspace knowledge base."""
    try:
        file_data = await file.read()
        doc = save_uploaded_file(
            file_data=file_data,
            filename=file.filename or "document.txt",
            workspace_id=workspace_id,
            db=db,
        )
        return DocumentOut.model_validate(doc)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/documents", response_model=list[DocumentOut])
def list_documents(workspace_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Document)
    if workspace_id:
        q = q.filter(Document.workspace_id == workspace_id)
    return q.order_by(Document.upload_at.desc()).all()


@router.get("/documents/{doc_id}", response_model=DocumentOut)
def get_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/documents/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    from app.models.models import DocumentChunk
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).delete()
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}
