"""ORVEX Manufacturing Operations & Disruption Models — NovaCore Electronics."""
import json
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    String, Float, DateTime, ForeignKey, Text, Integer, Boolean
)
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database.session import Base


# ── Core Master Data ──────────────────────────────────────────────────────────

class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(50), default="active")  # active | delayed | at_risk
    contact_email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    lead_time_days: Mapped[int] = mapped_column(Integer, default=14)
    reliability_score: Mapped[float] = mapped_column(Float, default=0.96)

    materials: Mapped[List["Material"]] = relationship("Material", back_populates="supplier")
    disruptions: Mapped[List["Disruption"]] = relationship("Disruption", back_populates="supplier")


class Material(Base):
    __tablename__ = "materials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200))  # e.g., MCU-742
    part_number: Mapped[str] = mapped_column(String(100), default="MCU-742")
    category: Mapped[str] = mapped_column(String(100), default="Microcontroller")
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"))
    inventory: Mapped[int] = mapped_column(Integer, default=50)  # current on-hand units
    allocated_inventory: Mapped[int] = mapped_column(Integer, default=50)
    lead_time: Mapped[int] = mapped_column(Integer, default=14)  # standard lead time days
    unit_cost: Mapped[float] = mapped_column(Float, default=450.0)

    supplier: Mapped["Supplier"] = relationship("Supplier", back_populates="materials")
    bom_items: Mapped[List["BOMItem"]] = relationship("BOMItem", back_populates="material")
    disruptions: Mapped[List["Disruption"]] = relationship("Disruption", back_populates="material")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200))  # e.g., NovaCore Edge Controller AX42
    sku: Mapped[str] = mapped_column(String(100), default="AX42-PRO")
    unit_price: Mapped[float] = mapped_column(Float, default=18500.0)

    bom_items: Mapped[List["BOMItem"]] = relationship("BOMItem", back_populates="product")
    production_orders: Mapped[List["ProductionOrder"]] = relationship("ProductionOrder", back_populates="product")
    customer_orders: Mapped[List["CustomerOrder"]] = relationship("CustomerOrder", back_populates="product")


class BOMItem(Base):
    __tablename__ = "bom_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    material_id: Mapped[int] = mapped_column(ForeignKey("materials.id"))
    quantity: Mapped[int] = mapped_column(Integer, default=1)  # qty per product unit

    product: Mapped["Product"] = relationship("Product", back_populates="bom_items")
    material: Mapped["Material"] = relationship("Material", back_populates="bom_items")


# ── Operational Production & Customer Orders ──────────────────────────────────

class ProductionOrder(Base):
    __tablename__ = "production_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_number: Mapped[str] = mapped_column(String(100), default="Order #1042")
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(Integer, default=500)
    start_date: Mapped[str] = mapped_column(String(50), default="2026-10-13")
    due_date: Mapped[str] = mapped_column(String(50), default="2026-10-18")
    status: Mapped[str] = mapped_column(String(50), default="Healthy")  # Healthy | At Risk | Delayed | Rescheduled
    line_name: Mapped[str] = mapped_column(String(100), default="SMT Line 2")

    product: Mapped["Product"] = relationship("Product", back_populates="production_orders")


class CustomerOrder(Base):
    __tablename__ = "customer_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_name: Mapped[str] = mapped_column(String(200), default="Customer C8821")
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(Integer, default=500)
    delivery_date: Mapped[str] = mapped_column(String(50), default="2026-10-20")
    priority: Mapped[str] = mapped_column(String(50), default="High")
    status: Mapped[str] = mapped_column(String(50), default="Healthy")  # Healthy | At Risk | Delayed | Recovered

    product: Mapped["Product"] = relationship("Product", back_populates="customer_orders")


# ── Disruption & AI Impact Analysis ───────────────────────────────────────────

class Disruption(Base):
    __tablename__ = "disruptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"))
    material_id: Mapped[int] = mapped_column(ForeignKey("materials.id"))
    old_eta: Mapped[str] = mapped_column(String(50), default="2026-10-12")
    new_eta: Mapped[str] = mapped_column(String(50), default="2026-10-17")
    delay_days: Mapped[int] = mapped_column(Integer, default=5)
    reason: Mapped[str] = mapped_column(Text, default="Logistics disruption during air freight consolidation")
    source_document: Mapped[str] = mapped_column(String(500), default="Supplier Delivery Delay — MCU-742.eml")
    raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active")  # active | mitigated | resolved
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    supplier: Mapped["Supplier"] = relationship("Supplier", back_populates="disruptions")
    material: Mapped["Material"] = relationship("Material", back_populates="disruptions")
    impact_analysis: Mapped[Optional["ImpactAnalysis"]] = relationship("ImpactAnalysis", back_populates="disruption", uselist=False)
    recovery_options: Mapped[List["RecoveryOption"]] = relationship("RecoveryOption", back_populates="disruption")


class ImpactAnalysis(Base):
    __tablename__ = "impact_analysis"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    disruption_id: Mapped[int] = mapped_column(ForeignKey("disruptions.id"))
    affected_orders_json: Mapped[str] = mapped_column(Text)  # list of production order dicts
    affected_units: Mapped[int] = mapped_column(Integer, default=500)
    affected_customers_json: Mapped[str] = mapped_column(Text)  # list of customer order dicts
    risk_level: Mapped[str] = mapped_column(String(50), default="Critical")  # Critical | High | Medium | Low
    explanation: Mapped[str] = mapped_column(Text)
    evidence_json: Mapped[str] = mapped_column(Text)  # source citations

    disruption: Mapped["Disruption"] = relationship("Disruption", back_populates="impact_analysis")

    @property
    def affected_orders(self) -> list:
        return json.loads(self.affected_orders_json) if self.affected_orders_json else []

    @property
    def affected_customers(self) -> list:
        return json.loads(self.affected_customers_json) if self.affected_customers_json else []

    @property
    def evidence(self) -> list:
        return json.loads(self.evidence_json) if self.evidence_json else []


class RecoveryOption(Base):
    __tablename__ = "recovery_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    disruption_id: Mapped[int] = mapped_column(ForeignKey("disruptions.id"))
    option_code: Mapped[str] = mapped_column(String(10))  # A | B | C
    option_name: Mapped[str] = mapped_column(String(200))
    cost: Mapped[str] = mapped_column(String(100))  # e.g., "₹42,000"
    cost_amount: Mapped[float] = mapped_column(Float, default=42000.0)
    delay: Mapped[str] = mapped_column(String(100))  # e.g., "0 days" or "+5 days"
    risk: Mapped[str] = mapped_column(String(50))  # Low | Medium | High
    customer_impact: Mapped[str] = mapped_column(Text)
    production_impact: Mapped[str] = mapped_column(Text)
    recommended: Mapped[bool] = mapped_column(Boolean, default=False)
    rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    disruption: Mapped["Disruption"] = relationship("Disruption", back_populates="recovery_options")
    approvals: Mapped[List["Approval"]] = relationship("Approval", back_populates="recovery_option")


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    recovery_option_id: Mapped[int] = mapped_column(ForeignKey("recovery_options.id"))
    status: Mapped[str] = mapped_column(String(50), default="approved")  # approved | rejected | modified
    approved_by: Mapped[str] = mapped_column(String(100), default="Production Planner (Alex Rivera)")
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    simulated_actions_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    recovery_option: Mapped["RecoveryOption"] = relationship("RecoveryOption", back_populates="approvals")

    @property
    def simulated_actions(self) -> list:
        return json.loads(self.simulated_actions_json) if self.simulated_actions_json else []


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event: Mapped[str] = mapped_column(String(500))
    timestamp: Mapped[str] = mapped_column(String(50))  # e.g., "10:41 AM"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    actor: Mapped[str] = mapped_column(String(100), default="SYSTEM")
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_type: Mapped[str] = mapped_column(String(50), default="AI_ENGINE")  # AI_ENGINE | HUMAN | ERP_SIMULATION
