"""ORVEX Manufacturing Pydantic Schemas."""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class SupplierOut(BaseModel):
    id: int
    name: str
    status: str
    contact_email: Optional[str] = None
    lead_time_days: int
    reliability_score: float
    model_config = {"from_attributes": True}


class MaterialOut(BaseModel):
    id: int
    name: str
    part_number: str
    category: str
    supplier_id: int
    supplier_name: Optional[str] = None
    supplier_status: Optional[str] = "ON SCHEDULE"
    inventory: int
    allocated_inventory: int
    lead_time: int
    unit_cost: float
    model_config = {"from_attributes": True}


class ProductOut(BaseModel):
    id: int
    name: str
    sku: str
    unit_price: float
    model_config = {"from_attributes": True}


class ProductionOrderOut(BaseModel):
    id: int
    order_number: str
    product_id: int
    product_name: Optional[str] = None
    quantity: int
    start_date: str
    due_date: str
    status: str
    line_name: str
    model_config = {"from_attributes": True}


class CustomerOrderOut(BaseModel):
    id: int
    customer_name: str
    product_id: int
    product_name: Optional[str] = None
    quantity: int
    delivery_date: str
    priority: str
    status: str
    model_config = {"from_attributes": True}


class RecoveryOptionOut(BaseModel):
    id: int
    disruption_id: int
    option_code: str  # A, B, C
    option_name: str
    cost: str
    cost_amount: float
    delay: str
    risk: str
    customer_impact: str
    production_impact: str
    recommended: bool
    rationale: Optional[str] = None
    model_config = {"from_attributes": True}


class DisruptionOut(BaseModel):
    id: int
    supplier_id: int
    supplier_name: Optional[str] = None
    material_id: int
    material_name: Optional[str] = None
    old_eta: str
    new_eta: str
    delay_days: int
    reason: str
    source_document: str
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}


class ImpactAnalysisOut(BaseModel):
    id: int
    disruption_id: int
    affected_orders: List[Dict[str, Any]]
    affected_units: int
    affected_customers: List[Dict[str, Any]]
    risk_level: str
    explanation: str
    evidence: List[Dict[str, str]]
    model_config = {"from_attributes": True}


class AuditLogOut(BaseModel):
    id: int
    event: str
    timestamp: str
    actor: str
    details: Optional[str] = None
    source_type: str
    created_at: datetime
    model_config = {"from_attributes": True}


class DashboardMetrics(BaseModel):
    production_health: int  # 94 -> 78
    at_risk_orders: int  # 0 -> 3
    material_risks: int  # 0 -> 1
    supplier_alerts: int  # 0 -> 1
    customer_commitments_at_risk: int  # 0 -> 1
    status: str  # healthy | at_risk
    active_disruption: Optional[Dict[str, Any]] = None
    main_order: Dict[str, Any]
    recent_events: List[AuditLogOut] = []


class InvestigationData(BaseModel):
    what_changed: Dict[str, Any]
    why_it_matters: Dict[str, Any]
    what_is_affected: Dict[str, Any]
    customer_impact: Dict[str, Any]
    evidence: List[Dict[str, str]]
    recovery_options: List[RecoveryOptionOut]
    recommended_option: Optional[RecoveryOptionOut] = None


class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # supplier | material | bom | product | order | units | customer | delivery
    status: str  # healthy | affected | warning
    data: Dict[str, Any] = {}


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None
    type: str = "default"


class ImpactGraph(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class ApprovalRequest(BaseModel):
    recovery_option_id: int
    approved_by: Optional[str] = "Alex Rivera (Production Planner)"
    notes: Optional[str] = None


class ApprovalResponse(BaseModel):
    status: str
    option_name: str
    message: str
    updated_production_status: str
    customer_delivery_status: str
    simulated_actions: List[Dict[str, str]]
    audit_id: int


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    current_page: Optional[str] = "/dashboard"
    selected_entity: Optional[str] = None
    current_analysis_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    sources: List[Dict[str, str]] = []
    evidence_citations: List[Dict[str, str]] = []
    entities: List[str] = []
    suggested_followups: List[str] = []
    visual_trace: Optional[str] = None
    action_guardrail: Optional[Dict[str, str]] = None
    confidence_metadata: Optional[Dict[str, Any]] = None


class CopilotChatRequest(ChatRequest):
    pass


class CopilotChatResponse(ChatResponse):
    pass


class SampleItem(BaseModel):
    id: str
    filename: str
    format: str
    title: str
    description: str
    source: str
    icon: str


class InjectSampleRequest(BaseModel):
    sample_id: str


class InboxUploadResponse(BaseModel):
    status: str
    disruption_id: int
    filename: str
    file_type: str
    extracted_data: Dict[str, Any]
    resolved_entities: Dict[str, Any]
    impact_summary: Dict[str, Any]
    recommendation: Dict[str, Any]
    raw_text_preview: str
    timestamp: str


class InboxHistoryItem(BaseModel):
    id: int
    filename: str
    file_type: str
    supplier_name: str
    material_name: str
    delay_days: int
    affected_units: int
    status: str
    created_at: str
    disruption_id: int


class DataSourceItem(BaseModel):
    name: str
    status: str


class CompanyFeedStatus(BaseModel):
    status: str
    feed_status: str
    sources: List[DataSourceItem]
    last_sync: str
    pending_events: int
    note: Optional[str] = "Synthetic enterprise feed for prototype"
    next_event: Optional[Dict[str, Any]] = None


class DataLineageItem(BaseModel):
    stage: str
    timestamp: str
    title: str
    detail: str
    source: str


class ProcessFeedEventResponse(BaseModel):
    status: str
    disruption_id: int
    event: Dict[str, Any]
    resolved_entities: Dict[str, Any]
    bom_dependency: Dict[str, Any]
    impact_summary: Dict[str, Any]
    recommendation: Dict[str, Any]
    lineage: List[DataLineageItem]
    message: str


