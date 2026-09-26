import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 60000,
});

export interface MainOrder {
  order_number: string;
  product: string;
  quantity: number;
  production: string;
  customer_delivery: string;
  line: string;
}

export interface ActiveDisruption {
  id: number;
  material: string;
  supplier: string;
  delay_days: number;
  old_eta: string;
  new_eta: string;
  reason: string;
  affected_units: number;
  affected_orders_count: number;
  affected_customers_count: number;
  affected_lines_count: number;
}

export interface AuditLogItem {
  id: number;
  event: string;
  timestamp: string;
  actor: string;
  details?: string;
  source_type: string;
  created_at: string;
}

export interface DashboardMetrics {
  production_health: number;
  at_risk_orders: number;
  material_risks: number;
  supplier_alerts: number;
  customer_commitments_at_risk: number;
  status: 'healthy' | 'at_risk';
  active_disruption?: ActiveDisruption | null;
  main_order: MainOrder;
  recent_events: AuditLogItem[];
}

export interface RecoveryOption {
  id: number;
  disruption_id: number;
  option_code: 'A' | 'B' | 'C' | string;
  option_name: string;
  cost: string;
  cost_amount: number;
  delay: string;
  risk: string;
  customer_impact: string;
  production_impact: string;
  recommended: boolean;
  rationale?: string;
}

export interface InvestigationData {
  what_changed: {
    material: string;
    part_number: string;
    supplier: string;
    delay_days: number;
    old_eta: string;
    new_eta: string;
    reason: string;
    source_document: string;
  };
  why_it_matters: {
    product_name: string;
    component_role: string;
    on_hand_inventory: number;
    required_inventory: number;
    inventory_deficit: number;
    explanation: string;
  };
  what_is_affected: {
    orders_count: number;
    units_count: number;
    lines_count: number;
    orders: Array<{
      order_number: string;
      product_name: string;
      quantity: number;
      start_date: string;
      line_name: string;
      status: string;
    }>;
  };
  customer_impact: {
    customer_name: string;
    order_quantity: number;
    promised_delivery: string;
    risk_summary: string;
    customers: Array<{
      customer_name: string;
      product_name: string;
      quantity: number;
      delivery_date: string;
      priority: string;
      status: string;
    }>;
  };
  evidence: Array<{
    source: string;
    quote: string;
    section?: string;
  }>;
  recovery_options: RecoveryOption[];
  recommended_option?: RecoveryOption;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  status: string;
  data: {
    subtitle?: string;
    detail?: string;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: string;
}

export interface ImpactGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ProductionOrder {
  id: number;
  order_number: string;
  product_id: number;
  product_name: string;
  quantity: number;
  start_date: string;
  due_date: string;
  status: string;
  line_name: string;
}

export interface MaterialItem {
  id: number;
  name: string;
  part_number: string;
  category: string;
  supplier_id: number;
  supplier_name: string;
  supplier_status?: string;
  inventory: number;
  allocated_inventory: number;
  lead_time: number;
  unit_cost: number;
}

export interface ApprovalResponse {
  status: string;
  option_name: string;
  message: string;
  updated_production_status: string;
  customer_delivery_status: string;
  simulated_actions: Array<{
    service: string;
    action: string;
  }>;
  audit_id: number;
}

export interface SourceItem {
  document: string;
  type?: string;
  detail?: string;
}

export interface CopilotActionGuardrail {
  action: string;
  label: string;
  url: string;
}

export interface CopilotChatResponse {
  reply: string;
  sources: SourceItem[];
  evidence_citations?: Array<{ document: string; quote: string }>;
  entities?: string[];
  suggested_followups?: string[];
  visual_trace?: string | null;
  action_guardrail?: CopilotActionGuardrail | null;
  confidence_metadata?: {
    grounded: boolean;
    engine: string;
  };
}

export type ChatResponse = CopilotChatResponse;

export interface CopilotChatPayload {
  message: string;
  conversation_id?: string;
  current_page?: string;
  selected_entity?: string;
  current_analysis_id?: string;
}

// ── API Calls ────────────────────────────────────────────────────────────────

export const getDashboard = () =>
  API.get<DashboardMetrics>('/dashboard').then(r => r.data);

export const injectDisruption = () =>
  API.post<{ status: string; disruption_id: number; material: string; supplier: string; delay_days: number; message: string }>(
    '/disruptions/inject'
  ).then(r => r.data);

export const resetBaseline = () =>
  API.post<{ status: string; message: string }>('/disruptions/reset').then(r => r.data);

export const getInvestigation = (disruptionId: number = 1) =>
  API.get<InvestigationData>(`/disruptions/${disruptionId}/investigate`).then(r => r.data);

export const getImpactGraph = (disruptionId: number = 1) =>
  API.get<ImpactGraph>(`/disruptions/${disruptionId}/graph`).then(r => r.data);

export const getRecoveryOptions = () =>
  API.get<RecoveryOption[]>('/recovery/options').then(r => r.data);

export const approveRecoveryPlan = (optionId: number, approvedBy: string = 'Alex Rivera (Production Planner)') =>
  API.post<ApprovalResponse>('/recovery/approve', {
    recovery_option_id: optionId,
    approved_by: approvedBy
  }).then(r => r.data);

export const getProductionOrders = () =>
  API.get<ProductionOrder[]>('/production/orders').then(r => r.data);

export const getMaterials = () =>
  API.get<MaterialItem[]>('/materials').then(r => r.data);

export const getAuditTrail = () =>
  API.get<AuditLogItem[]>('/audit').then(r => r.data);

export const sendCopilotMessage = (payload: CopilotChatPayload | string) => {
  const body = typeof payload === 'string' ? { message: payload } : payload;
  return API.post<CopilotChatResponse>('/copilot/chat', body).then(r => r.data);
};

export const sendChatMessage = (message: string) =>
  sendCopilotMessage({ message });

// ── Data Inbox & Ingestion Pipeline ──────────────────────────────────────────

export interface SampleItem {
  id: string;
  filename: string;
  format: string;
  title: string;
  description: string;
  source: string;
  icon: string;
}

export interface InboxUploadResponse {
  status: string;
  disruption_id: number;
  filename: string;
  file_type: string;
  extracted_data: {
    supplier_name: string;
    po_number?: string;
    material_name: string;
    part_number?: string;
    old_eta: string;
    new_eta: string;
    delay_days: number;
    quantity?: number;
    reason: string;
    confidence?: number;
  };
  resolved_entities: {
    supplier: string;
    supplier_id: number;
    material: string;
    material_id: number;
    part_number: string;
  };
  impact_summary: {
    affected_orders_count: number;
    affected_units: number;
    affected_customers_count: number;
    affected_lines: string[];
    risk_level: string;
  };
  recommendation: {
    recommended_option: string;
    cost: string;
    delay: string;
    rationale: string;
  };
  raw_text_preview: string;
  timestamp: string;
}

export interface InboxHistoryItem {
  id: number;
  filename: string;
  file_type: string;
  supplier_name: string;
  material_name: string;
  delay_days: number;
  affected_units: number;
  status: string;
  created_at: string;
  disruption_id: number;
}

export const getInboxSamples = () =>
  API.get<SampleItem[]>('/inbox/samples').then(r => r.data);

export const uploadSupplierDocument = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return API.post<InboxUploadResponse>('/inbox/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};

export const injectSampleDocument = (sampleId: string) =>
  API.post<InboxUploadResponse>('/inbox/inject-sample', { sample_id: sampleId }).then(r => r.data);

export const getInboxHistory = () =>
  API.get<InboxHistoryItem[]>('/inbox/history').then(r => r.data);

// ── Company Operational Feed Types & Endpoints ──────────────────────────────

export interface DataSourceItem {
  name: string;
  status: string;
}

export interface CompanyFeedEvent {
  event_type: string;
  supplier: string;
  purchase_order: string;
  material: string;
  previous_eta: string;
  new_eta: string;
  delay_days: number;
  reason: string;
  source: string;
  synthetic?: boolean;
}

export interface CompanyFeedStatus {
  status: string;
  feed_status: string;
  sources: DataSourceItem[];
  last_sync: string;
  pending_events: number;
  note?: string;
  next_event?: CompanyFeedEvent | null;
}

export interface DataLineageItem {
  stage: string;
  timestamp: string;
  title: string;
  detail: string;
  source: string;
}

export interface ProcessFeedEventResponse {
  status: string;
  disruption_id: number;
  event: CompanyFeedEvent;
  resolved_entities: {
    supplier: string;
    supplier_id: number;
    material: string;
    material_id: number;
    part_number: string;
    purchase_order: string;
  };
  bom_dependency: {
    product_id: number;
    product_name: string;
    product_sku: string;
    component_role: string;
  };
  impact_summary: {
    affected_orders_count: number;
    affected_orders: Array<{
      order_number: string;
      product_name: string;
      quantity: number;
      start_date: string;
      line_name: string;
      status: string;
    }>;
    affected_units: number;
    affected_customers_count: number;
    affected_customers: Array<{
      customer_name: string;
      product_name: string;
      quantity: number;
      delivery_date: string;
      priority: string;
      status: string;
    }>;
    affected_lines: string[];
    risk_level: string;
    delay_days: number;
    new_eta: string;
    old_eta: string;
  };
  recommendation: {
    recommended_option: string;
    cost: string;
    delay: string;
    rationale: string;
    total_options: number;
  };
  lineage: DataLineageItem[];
  message: string;
}

export const getCompanyFeedStatus = () =>
  API.get<CompanyFeedStatus>('/company-feed/status').then(r => r.data);

export const processNextFeedEvent = (override?: Partial<CompanyFeedEvent>) =>
  API.post<ProcessFeedEventResponse>('/company-feed/process-next', override).then(r => r.data);

export const resetCompanyFeed = () =>
  API.post('/company-feed/reset').then(r => r.data);

export const startPitchDemo = () =>
  API.post('/demo/pitch/start').then(r => r.data);

export const resetPitchDemo = () =>
  API.post('/demo/pitch/reset').then(r => r.data);

