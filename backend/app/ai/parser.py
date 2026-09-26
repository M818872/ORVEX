"""Document parsing — text extraction from TXT, PDF, DOCX, CSV."""
import csv
import io
import logging
import chardet
from typing import Optional

logger = logging.getLogger("actionos")


def extract_text(file_path: str, file_type: str) -> str:
    """Extract raw text from a document file."""
    file_type = file_type.lower().lstrip(".")

    if file_type in ("txt", "text"):
        return _extract_txt(file_path)
    elif file_type == "pdf":
        return _extract_pdf(file_path)
    elif file_type in ("docx", "doc"):
        return _extract_docx(file_path)
    elif file_type == "csv":
        return _extract_csv(file_path)
    else:
        # Try as text
        return _extract_txt(file_path)


def _extract_txt(file_path: str) -> str:
    with open(file_path, "rb") as f:
        raw = f.read()
    detected = chardet.detect(raw)
    encoding = detected.get("encoding") or "utf-8"
    try:
        return raw.decode(encoding)
    except Exception:
        return raw.decode("utf-8", errors="replace")


def _extract_pdf(file_path: str) -> str:
    try:
        import PyPDF2
        text_parts = []
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                if text.strip():
                    text_parts.append(f"[Page {i+1}]\n{text}")
        return "\n\n".join(text_parts)
    except ImportError:
        logger.warning("PyPDF2 not available — reading PDF as text")
        return _extract_txt(file_path)
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        raise


def _extract_docx(file_path: str) -> str:
    try:
        import docx
        doc = docx.Document(file_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)
    except ImportError:
        logger.warning("python-docx not available — reading DOCX as text")
        return _extract_txt(file_path)
    except Exception as e:
        logger.error(f"DOCX extraction error: {e}")
        raise


def _extract_csv(file_path: str) -> str:
    with open(file_path, "rb") as f:
        raw = f.read()
    detected = chardet.detect(raw)
    encoding = detected.get("encoding") or "utf-8"
    text = raw.decode(encoding, errors="replace")

    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        return ""

    lines = []
    headers = rows[0]
    for row in rows[1:]:
        parts = [f"{h}: {v}" for h, v in zip(headers, row) if v.strip()]
        if parts:
            lines.append(", ".join(parts))
    return "\n".join(lines)


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[dict]:
    """
    Split text into overlapping chunks.
    Returns list of dicts with 'content', 'chunk_index', 'section'.
    """
    # Detect section boundaries
    lines = text.split("\n")
    chunks = []
    current_section = "Introduction"
    current_chunk_lines = []
    current_len = 0
    chunk_idx = 0

    for line in lines:
        # Detect section headers
        stripped = line.strip()
        if stripped and (
            stripped.isupper() or
            stripped.startswith("SECTION") or
            stripped.startswith("##") or
            stripped.startswith("---") or
            (len(stripped) < 80 and stripped.endswith(":") and not stripped.startswith("-"))
        ):
            current_section = stripped[:100]

        words = line.split()
        current_len += len(words)
        current_chunk_lines.append(line)

        if current_len >= chunk_size:
            content = "\n".join(current_chunk_lines).strip()
            if content:
                chunks.append({
                    "content": content,
                    "chunk_index": chunk_idx,
                    "section": current_section,
                })
                chunk_idx += 1
            # Overlap: keep last overlap words
            overlap_text = " ".join(line.split()[-overlap:])
            current_chunk_lines = [overlap_text]
            current_len = len(overlap_text.split())

    # Final chunk
    if current_chunk_lines:
        content = "\n".join(current_chunk_lines).strip()
        if content:
            chunks.append({
                "content": content,
                "chunk_index": chunk_idx,
                "section": current_section,
            })

    return chunks
