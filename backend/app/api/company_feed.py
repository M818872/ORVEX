"""ORVEX Company Feed API Router.

Provides automated operational feed status and event processing endpoints for
the ORVEX AI Disruption & Recovery Copilot.
"""
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.schemas import CompanyFeedStatus, ProcessFeedEventResponse
from app.services.company_feed_service import (
    get_company_feed_status,
    process_next_feed_event,
    reset_company_feed,
)

logger = logging.getLogger("orvex")
router = APIRouter(prefix="/company-feed", tags=["Company Operational Feed"])


@router.get("/status", response_model=CompanyFeedStatus)
def get_feed_status(db: Session = Depends(get_db)):
    """Retrieve the real-time status of connected operational data feeds:

    - connected sources (ERP/Orders, Inventory, Production, Supplier Comms)
    - last synchronization timestamp
    - pending operational events
    - feed status (LIVE)
    """
    try:
        return get_company_feed_status(db)
    except Exception as e:
        logger.error(f"Error fetching company feed status: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch feed status: {str(e)}"
        )


@router.post("/process-next", response_model=ProcessFeedEventResponse)
def process_next_event(
    event_override: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
):
    """Retrieve and process the next operational disruption event through the

    complete ORVEX pipeline:
    1. Identify supplier
    2. Identify material & PO
    3. Trace BOM dependencies
    4. Find affected production orders
    5. Find affected customer commitments
    6. Calculate deterministic operational impact
    7. Generate 3 recovery options
    8. Write audit trail and return 5-stage data lineage
    """
    try:
        result = process_next_feed_event(db, custom_event=event_override)
        return ProcessFeedEventResponse(**result)
    except Exception as e:
        logger.error(f"Failed to process operational event: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to process operational event: {str(e)}"
        )


@router.post("/reset")
def reset_feed(db: Session = Depends(get_db)):
    """Reset the operational feed and restore the healthy baseline."""
    try:
        return reset_company_feed(db)
    except Exception as e:
        logger.error(f"Failed to reset company feed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to reset company feed: {str(e)}"
        )
