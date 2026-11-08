export type RoleType =
  | "junior_analyst"
  | "data_engineer"
  | "compliance_officer"
  | "executive";

export type ClearanceLevel =
  | "PUBLIC_INTERNAL"
  | "ENGINEERING"
  | "COMPLIANCE"
  | "EXECUTIVE";

export type LLMProviderType = "zero_key" | "ollama" | "gemini" | "openai";

export interface LLMConfig {
  provider: LLMProviderType;
  model?: string;
  api_key?: string;
  base_url?: string;
}

export interface RoleMetadata {
  role: RoleType;
  label: string;
  department: string;
  allowed_clearances: ClearanceLevel[];
  allowed_tables: string[];
  can_create_tickets: boolean;
  badge_color: string;
}

export interface PIIRedactionEvent {
  pii_type: string;
  count: number;
  law_reference: string;
}

export interface TraceStep {
  step: number;
  stage: string;
  title: string;
  status: "ok" | "warning" | "blocked";
  latency_ms: number;
  detail: string;
  metadata: Record<string, unknown>;
}

export interface CitationChunk {
  chunk_id: string;
  doc_id: string;
  title: string;
  section: string;
  category: string;
  clearance: ClearanceLevel;
  bm25_score: number;
  vector_score: number;
  rrf_score: number;
  snippet: string;
  access_granted: boolean;
}

export interface SQLQueryResult {
  sql: string;
  description: string;
  tables_used: string[];
  row_count: number;
  columns: string[];
  rows: Record<string, string | number>[];
  chart_label_col?: string | null;
  chart_value_col?: string | null;
}

export interface TicketActionResult {
  ticket_id: string;
  priority: "P1" | "P2" | "P3";
  title: string;
  assigned_squad: string;
  target_node_or_region: string;
  status: string;
  sop_reference: string;
  created_at: string;
}

export interface ChatResponse {
  answer: string;
  sanitized_prompt: string;
  role: RoleType;
  role_label: string;
  intent: string;
  provider_used: string;
  model_used: string;
  total_latency_ms: number;
  confidence_score: number;
  rbac_blocked: boolean;
  rbac_blocked_reason?: string | null;
  pii_redactions: PIIRedactionEvent[];
  citations: CitationChunk[];
  blocked_citations: CitationChunk[];
  sql_result?: SQLQueryResult | null;
  ticket_created?: TicketActionResult | null;
  trace: TraceStep[];
}

export interface VaultDocument {
  doc_id: string;
  title: string;
  category: string;
  clearance: ClearanceLevel;
  owner: string;
  last_updated: string;
  chunk_count: number;
  accessible: boolean;
  preview: string;
}

export interface EvalCaseResult {
  case_id: string;
  category: string;
  role: RoleType;
  prompt: string;
  passed: boolean;
  latency_ms: number;
  expected_behavior: string;
  observed_summary: string;
  top_doc_hit?: string | null;
  reciprocal_rank: number;
  sql_verified: boolean;
  guardrail_verified: boolean;
}

export interface EvalSuiteSummary {
  total_cases: number;
  passed_cases: number;
  pass_rate_pct: number;
  retrieval_hit_at_3_pct: number;
  mrr_score: number;
  rbac_block_rate_pct: number;
  pii_masking_rate_pct: number;
  hallucination_refusal_pct: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  provider_used: string;
  results: EvalCaseResult[];
}
