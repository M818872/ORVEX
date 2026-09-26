"""Document processing service — handles file ingestion, chunking, embedding."""
import json
import logging
import os
import shutil
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.ai.embeddings import embed_texts_batch
from app.ai.parser import extract_text, chunk_text
from app.models.models import Document, DocumentChunk, AuditLog

logger = logging.getLogger("actionos")

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".txt", ".pdf", ".docx", ".doc", ".csv"}
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE_MB", "50")) * 1024 * 1024


def save_uploaded_file(
    file_data: bytes,
    filename: str,
    workspace_id: int,
    db: Session,
) -> Document:
    """Save an uploaded file, create document record, and start processing."""
    
    # Validate extension
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    
    if len(file_data) > MAX_FILE_SIZE:
        raise ValueError(f"File too large. Maximum size: {os.getenv('MAX_FILE_SIZE_MB', '50')}MB")

    # Save to disk
    workspace_dir = os.path.join(UPLOAD_DIR, f"workspace_{workspace_id}")
    os.makedirs(workspace_dir, exist_ok=True)
    
    # Sanitize filename
    safe_name = "".join(c if c.isalnum() or c in "._- " else "_" for c in filename)
    file_path = os.path.join(workspace_dir, safe_name)
    
    with open(file_path, "wb") as f:
        f.write(file_data)

    # Determine doc type from filename
    doc_type = _infer_doc_type(filename)

    # Create document record
    doc = Document(
        workspace_id=workspace_id,
        filename=filename,
        file_type=ext.lstrip("."),
        file_size=len(file_data),
        file_path=file_path,
        status="uploaded",
        doc_type=doc_type,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    logger.info(f"File saved: {filename} (doc_id={doc.id})")

    # Process synchronously
    process_document(doc.id, db)

    return doc


def process_document(doc_id: int, db: Session):
    """Extract text, chunk, embed, and store in database."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        return

    doc.status = "processing"
    db.commit()

    try:
        # Extract text
        logger.info(f"[Doc {doc_id}] Extracting text from {doc.filename}")
        text = extract_text(doc.file_path, doc.file_type)
        
        if not text.strip():
            raise ValueError("No text could be extracted from document")

        # Chunk text
        logger.info(f"[Doc {doc_id}] Chunking text ({len(text)} chars)")
        chunks = chunk_text(text, chunk_size=700, overlap=80)
        
        if not chunks:
            raise ValueError("Document produced no chunks")

        # Generate embeddings in batch
        logger.info(f"[Doc {doc_id}] Generating embeddings for {len(chunks)} chunks")
        texts_to_embed = [c["content"] for c in chunks]
        
        try:
            embeddings = embed_texts_batch(texts_to_embed)
        except Exception as e:
            logger.warning(f"[Doc {doc_id}] Batch embedding failed: {e}, trying one-by-one")
            from app.ai.embeddings import embed_text
            embeddings = [embed_text(t) for t in texts_to_embed]

        # Store chunks
        for i, (chunk_data, embedding) in enumerate(zip(chunks, embeddings)):
            chunk_obj = DocumentChunk(
                document_id=doc_id,
                workspace_id=doc.workspace_id,
                chunk_index=chunk_data["chunk_index"],
                content=chunk_data["content"],
                section=chunk_data.get("section"),
                metadata_json=json.dumps({
                    "filename": doc.filename,
                    "doc_type": doc.doc_type,
                }),
            )
            chunk_obj.set_embedding(embedding)
            db.add(chunk_obj)

        doc.chunk_count = len(chunks)
        doc.status = "processed"
        doc.processed_at = datetime.utcnow()
        db.commit()

        logger.info(f"[Doc {doc_id}] Processing complete: {len(chunks)} chunks stored")

        # Audit log
        log = AuditLog(
            operation=f"Document processed: {doc.filename}",
            source_type="SYSTEM",
            workspace_id=doc.workspace_id,
            entity_type="document",
            entity_id=doc_id,
            result=f"{len(chunks)} chunks, embeddings stored",
        )
        db.add(log)
        db.commit()

    except Exception as e:
        logger.error(f"[Doc {doc_id}] Processing error: {e}")
        doc.status = "failed"
        doc.error_message = str(e)
        doc.processed_at = datetime.utcnow()
        db.commit()
        raise


def _infer_doc_type(filename: str) -> str:
    """Infer document type from filename."""
    name = filename.lower()
    if "meeting" in name or "transcript" in name or "minutes" in name:
        return "meeting_transcript"
    elif "email" in name or "mail" in name or "thread" in name:
        return "email"
    elif "policy" in name or "governance" in name or "procedure" in name:
        return "policy"
    elif "report" in name or "status" in name or "update" in name:
        return "report"
    elif "team" in name or "directory" in name or "roster" in name:
        return "team_directory"
    elif "budget" in name or "finance" in name or "cost" in name:
        return "financial"
    else:
        return "document"


def load_demo_files(workspace_id: int, db: Session) -> list:
    """Load NovaCore demo files into a workspace."""
    demo_dir = os.getenv("DEMO_DATA_DIR", "../data/demo")
    
    if not os.path.isdir(demo_dir):
        # Try relative to this file
        script_dir = os.path.dirname(os.path.abspath(__file__))
        demo_dir = os.path.normpath(os.path.join(script_dir, "../../../../data/demo"))
    
    if not os.path.isdir(demo_dir):
        raise FileNotFoundError(f"Demo data directory not found: {demo_dir}")

    demo_files = [
        "doc1_executive_meeting.txt",
        "doc2_vendor_confirmation.txt",
        "doc3_project_status_report.txt",
        "doc4_compliance_policy.txt",
        "doc5_finance_approval.txt",
    ]

    loaded = []
    for fname in demo_files:
        fpath = os.path.join(demo_dir, fname)
        if not os.path.exists(fpath):
            logger.warning(f"Demo file not found: {fpath}")
            continue
        
        # Check if already loaded
        existing = db.query(Document).filter(
            Document.workspace_id == workspace_id,
            Document.filename == fname,
        ).first()
        if existing:
            loaded.append(existing)
            continue

        with open(fpath, "rb") as f:
            file_data = f.read()

        doc = save_uploaded_file(file_data, fname, workspace_id, db)
        loaded.append(doc)
        logger.info(f"Demo file loaded: {fname}")

    return loaded


def inject_vendor_delay_file(workspace_id: int, db: Session) -> Document:
    """Inject the killer demo event: Vendor Delay Notice into workspace."""
    demo_dir = os.getenv("DEMO_DATA_DIR", "../data/demo")
    if not os.path.isdir(demo_dir):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        demo_dir = os.path.normpath(os.path.join(script_dir, "../../../../data/demo"))

    fname = "event_vendor_delay_notice.txt"
    fpath = os.path.join(demo_dir, fname)
    if not os.path.exists(fpath):
        raise FileNotFoundError(f"Vendor delay notice file not found at: {fpath}")

    with open(fpath, "rb") as f:
        file_data = f.read()

    doc = save_uploaded_file(file_data, fname, workspace_id, db)
    logger.info(f"Vendor delay event document injected: {fname}")
    return doc
