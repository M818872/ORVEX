"""ORVEX Document Parser — Ingestion for TXT, EML, PDF, CSV, and XLSX."""
import io
import csv
import email
from email import policy
import logging
from typing import Dict, Any, Tuple

logger = logging.getLogger("orvex")


def parse_document_file(filename: str, file_bytes: bytes) -> Tuple[str, Dict[str, Any]]:
    """
    Parses an uploaded file into clean plain text and extracted metadata.
    Supported extensions: .txt, .eml, .pdf, .csv, .xlsx
    Returns (extracted_text, metadata_dict)
    """
    ext = filename.lower().split(".")[-1] if "." in filename else "txt"
    metadata: Dict[str, Any] = {
        "filename": filename,
        "extension": ext,
        "size_bytes": len(file_bytes),
    }

    try:
        if ext == "txt":
            return parse_txt(file_bytes, metadata)
        elif ext == "eml":
            return parse_eml(file_bytes, metadata)
        elif ext == "pdf":
            return parse_pdf(file_bytes, metadata)
        elif ext == "csv":
            return parse_csv(file_bytes, metadata)
        elif ext in ["xlsx", "xls"]:
            return parse_xlsx(file_bytes, metadata)
        elif ext in ["docx", "doc"]:
            return parse_docx(file_bytes, metadata)
        else:
            # Fallback to UTF-8 text decode
            text = file_bytes.decode("utf-8", errors="replace").strip()
            return text, metadata

    except Exception as e:
        logger.error(f"Error parsing document {filename}: {e}")
        # Graceful fallback: return text representation
        text = file_bytes.decode("utf-8", errors="replace").strip()
        metadata["parser_warning"] = str(e)
        return text, metadata


def parse_txt(file_bytes: bytes, metadata: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    """Extract plain text from TXT file."""
    for encoding in ["utf-8", "latin-1", "cp1252"]:
        try:
            text = file_bytes.decode(encoding).strip()
            metadata["encoding"] = encoding
            metadata["line_count"] = len(text.splitlines())
            return text, metadata
        except UnicodeDecodeError:
            continue
    text = file_bytes.decode("utf-8", errors="replace").strip()
    return text, metadata


def parse_eml(file_bytes: bytes, metadata: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    """Extract sender, recipient, subject, date, and body from EML message."""
    try:
        msg = email.message_from_bytes(file_bytes, policy=policy.default)
        subject = msg.get("Subject", "Supplier Notice")
        from_hdr = msg.get("From", "Unknown Supplier")
        to_hdr = msg.get("To", "Supply Chain Operations")
        date_hdr = msg.get("Date", "")

        metadata["subject"] = subject
        metadata["from"] = from_hdr
        metadata["to"] = to_hdr
        metadata["date"] = date_hdr

        # Extract message body
        body_text = ""
        if msg.is_multipart():
            for part in msg.walk():
                ctype = part.get_content_type()
                if ctype == "text/plain":
                    body_text += part.get_content() + "\n"
                elif ctype == "text/html" and not body_text:
                    # Fallback plain text from html
                    import re
                    html_content = part.get_content()
                    body_text = re.sub(r"<[^>]+>", " ", html_content)
        else:
            body_text = msg.get_content()

        combined_text = (
            f"EMAIL MESSAGE\n"
            f"From: {from_hdr}\n"
            f"To: {to_hdr}\n"
            f"Date: {date_hdr}\n"
            f"Subject: {subject}\n"
            f"----------------------------------------\n"
            f"{body_text.strip()}"
        )
        return combined_text, metadata

    except Exception as e:
        logger.warning(f"EML structured parse failed, falling back to raw text: {e}")
        text = file_bytes.decode("utf-8", errors="replace").strip()
        return text, metadata


def parse_pdf(file_bytes: bytes, metadata: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    """Extract text from PDF pages using PyPDF2."""
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        metadata["page_count"] = len(reader.pages)
        pages_text = []
        for i, page in enumerate(reader.pages):
            page_content = page.extract_text() or ""
            if page_content.strip():
                pages_text.append(f"[Page {i+1}]\n{page_content.strip()}")

        extracted = "\n\n".join(pages_text) if pages_text else "No extractable text found in PDF."
        return extracted, metadata
    except Exception as e:
        logger.error(f"PyPDF2 extraction error: {e}")
        metadata["parser_error"] = str(e)
        return f"PDF Parse Error: {e}", metadata


def parse_csv(file_bytes: bytes, metadata: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    """Extract tabular data from CSV."""
    text_content = file_bytes.decode("utf-8", errors="replace")
    reader = csv.reader(io.StringIO(text_content))
    rows = list(reader)
    metadata["row_count"] = len(rows)

    if not rows:
        return "Empty CSV file", metadata

    headers = rows[0]
    metadata["headers"] = headers

    formatted_lines = [f"CSV Table: {metadata.get('filename')}", f"Columns: {', '.join(headers)}", ""]
    for i, row in enumerate(rows[1:], 1):
        row_str = " | ".join(f"{h}: {v}" for h, v in zip(headers, row) if v)
        formatted_lines.append(f"Row {i}: {row_str}")

    return "\n".join(formatted_lines), metadata


def parse_xlsx(file_bytes: bytes, metadata: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    """Extract sheets and tabular data from XLSX using openpyxl."""
    try:
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
        metadata["sheet_names"] = wb.sheetnames

        formatted_lines = [f"Spreadsheet: {metadata.get('filename')}"]
        for sheetname in wb.sheetnames:
            sheet = wb[sheetname]
            formatted_lines.append(f"\n--- Sheet: {sheetname} ---")
            rows = list(sheet.iter_rows(values_only=True))
            if not rows:
                continue
            headers = [str(c or "") for c in rows[0]]
            for i, row in enumerate(rows[1:], 1):
                cells = [f"{h}: {val}" for h, val in zip(headers, row) if val is not None]
                if cells:
                    formatted_lines.append(f"Row {i}: {' | '.join(cells)}")

        return "\n".join(formatted_lines), metadata
    except Exception as e:
        logger.error(f"openpyxl extraction error: {e}")
        metadata["parser_error"] = str(e)
        return f"Excel Parse Error: {e}", metadata


def parse_docx(file_bytes: bytes, metadata: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    """Extract paragraphs and tables from DOCX document using python-docx."""
    try:
        import docx
        doc = docx.Document(io.BytesIO(file_bytes))
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        metadata["paragraph_count"] = len(paragraphs)
        
        # Also extract text from tables if any
        table_texts = []
        for table in doc.tables:
            for row in table.rows:
                cells = [c.text.strip() for c in row.cells if c.text.strip()]
                if cells:
                    table_texts.append(" | ".join(cells))
                    
        full_text = "\n\n".join(paragraphs)
        if table_texts:
            full_text += "\n\n--- Tables ---\n" + "\n".join(table_texts)
            
        return full_text if full_text.strip() else "Empty DOCX document", metadata
    except Exception as e:
        logger.error(f"python-docx extraction error: {e}")
        metadata["parser_error"] = str(e)
        return f"Word Parse Error: {e}", metadata

