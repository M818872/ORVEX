"""Pitch demo API routes for ORVEX manufacturing operations."""
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.company_feed_service import (
    start_company_feed_demo,
    reset_company_feed,
)

logger = logging.getLogger("orvex")
router = APIRouter(tags=["Demo"])


@router.post("/demo/pitch/start")
def start_pitch_demo(db: Session = Depends(get_db)):
    """Arm the synthetic supplier disruption used by the live pitch."""
    try:
        return start_company_feed_demo(db)
    except Exception as e:
        logger.error("Failed to start pitch demo: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start pitch demo: {str(e)}",
        )


@router.post("/demo/pitch/reset")
def reset_pitch_demo(db: Session = Depends(get_db)):
    """Reset the manufacturing demo environment to the healthy baseline."""
    try:
        return reset_company_feed(db)
    except Exception as e:
        logger.error("Failed to reset pitch demo: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset pitch demo: {str(e)}",
        )
