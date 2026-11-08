from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field

RoleType = Literal["junior_analyst", "data_engineer", "compliance_officer", "executive"]
ClearanceLevel = Literal["PUBLIC_INTERNAL", "ENGINEERING", "COMPLIANCE", "EXECUTIVE"]
LLMProviderType = Literal["zero_key", "ollama", "gemini", "openai"]


class LLMConfig(BaseModel):
    provider: LLMProviderType = "zero_key"
    model: str | None = None
    api_key: str | None = None
    base_url: str | None = None


class ChatMessageItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    role: RoleType = "data_engineer"
    history: list[ChatMessageItem] = Field(default_factory=list)
    llm_config: LLMConfig = Field(default_factory=LLMConfig)
    auto_action: bool = True


class PIIRedactionEvent(BaseModel):
    pii_type: str
    count: int
    law_reference: str = "UU PDP No. 27 Tahun 2022"


class TraceStep(BaseModel):
    step: int
    stage: str
    title: str
    status: Literal["ok", "warning", "blocked"]
    latency_ms: float
    detail: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class CitationChunk(BaseModel):
    chunk_id: str
    doc_id: str
    title: str
    section: str
    category: str
    clearance: ClearanceLevel
    bm25_score: float
    vector_score: float
    rrf_score: float
    snippet: str
    access_granted: bool = True


class SQLQueryResult(BaseModel):
    sql: str
    description: str
    tables_used: list[str]
    row_count: int
    columns: list[str]
    rows: list[dict[str, Any]]
    chart_label_col: str | None = None
    chart_value_col: str | None = None


class TicketActionResult(BaseModel):
    ticket_id: str
    priority: Literal["P1", "P2", "P3"]
    title: str
    assigned_squad: str
    target_node_or_region: str
    status: str
    sop_reference: str
    created_at: str


class ChatResponse(BaseModel):
    answer: str
    sanitized_prompt: str
    role: RoleType
    role_label: str
    intent: str
    provider_used: str
    model_used: str
    total_latency_ms: float
    confidence_score: float
    rbac_blocked: bool = False
    rbac_blocked_reason: str | None = None
    pii_redactions: list[PIIRedactionEvent] = Field(default_factory=list)
    citations: list[CitationChunk] = Field(default_factory=list)
    blocked_citations: list[CitationChunk] = Field(default_factory=list)
    sql_result: SQLQueryResult | None = None
    ticket_created: TicketActionResult | None = None
    trace: list[TraceStep] = Field(default_factory=list)


class DocumentIngestRequest(BaseModel):
    doc_id: str = Field(..., min_length=3, max_length=40)
    title: str = Field(..., min_length=5, max_length=160)
    category: str = Field(default="Custom Enterprise SOP", max_length=80)
    clearance: ClearanceLevel = "PUBLIC_INTERNAL"
    owner: str = Field(default="Enterprise Knowledge Contributor", max_length=80)
    content: str = Field(..., min_length=30, max_length=50000)


class RetrievalSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000)
    role: RoleType = "executive"
    top_k: int = Field(default=5, ge=1, le=12)


class EvalRunRequest(BaseModel):
    llm_config: LLMConfig = Field(default_factory=LLMConfig)


class EvalCaseResult(BaseModel):
    case_id: str
    category: str
    role: RoleType
    prompt: str
    passed: bool
    latency_ms: float
    expected_behavior: str
    observed_summary: str
    top_doc_hit: str | None = None
    reciprocal_rank: float = 0.0
    sql_verified: bool = True
    guardrail_verified: bool = True


class EvalSuiteSummary(BaseModel):
    total_cases: int
    passed_cases: int
    pass_rate_pct: float
    retrieval_hit_at_3_pct: float
    mrr_score: float
    rbac_block_rate_pct: float
    pii_masking_rate_pct: float
    hallucination_refusal_pct: float
    p50_latency_ms: float
    p95_latency_ms: float
    provider_used: str
    results: list[EvalCaseResult]
