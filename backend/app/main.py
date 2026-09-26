"""ACTIONOS FastAPI main application — Production Disruption & Recovery Copilot."""
import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load .env
_ENV_FILE = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=os.path.abspath(_ENV_FILE), override=False)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("actionos")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all database tables
    from app.database.session import engine, SessionLocal
    from app.models.models import (
        Supplier, Material, Product, BOMItem, ProductionOrder,
        CustomerOrder, Disruption, ImpactAnalysis, RecoveryOption,
        Approval, AuditLog
    )
    from app.database.session import Base
    from app.services.manufacturing_service import seed_healthy_state

    Base.metadata.create_all(bind=engine)
    logger.info("ACTIONOS backend started — database tables ready")

    # Seed initial 94% healthy state
    db = SessionLocal()
    try:
        if db.query(Supplier).count() == 0:
            seed_healthy_state(db)
    finally:
        db.close()

    yield

    logger.info("ACTIONOS backend shutting down")


app = FastAPI(
    title="ACTIONOS API — AI Production Disruption & Recovery Copilot",
    description=(
        "Detect. Trace. Simulate. Recover.\n\n"
        "AI-powered manufacturing operations assistant for electronics supply-chain disruptions."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permissive for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from app.api import manufacturing  # noqa: E402

app.include_router(manufacturing.router, prefix="/api")


@app.get("/health", tags=["Health"])
def health_check():
    from app.ai.llm import is_llm_available
    return {
        "status": "ok",
        "service": "ACTIONOS API",
        "system": "NovaCore Electronics Operations",
        "tagline": "Detect. Trace. Simulate. Recover.",
        "version": "2.0.0",
        "llm_available": is_llm_available(),
        "llm_provider": os.getenv("LLM_PROVIDER", "openai"),
        "llm_model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
    }
