from __future__ import annotations

import time

from .lakehouse import EnterpriseLakehouse, RBACTableAccessError
from .llm_gateway import generate_enterprise_answer
from .models import (
    ChatRequest,
    ChatResponse,
    SQLQueryResult,
    TicketActionResult,
    TraceStep,
)
from .rag_engine import HybridRAGEngine
from .security import get_role_profile, redact_pii


def _wants_ticket_action(text: str) -> bool:
    q = text.lower()
    action_verbs = (
        "create ticket", "open ticket", "open a p1", "create a p1", "dispatch ticket",
        "buat tiket", "buatkan tiket", "buka tiket", "eskalasi tiket", "create incident",
    )
    return any(phrase in q for phrase in action_verbs)


class EnterpriseAgentOrchestrator:
    """
    Coordinates UU PDP Guardrails, Pre-LLM RBAC Enforcement, Hybrid RAG (BM25+Vector+RRF),
    Sandboxed Lakehouse SQL Analytics, Operational Ticket Actions, and Audit Logging.
    """

    def __init__(self, rag_engine: HybridRAGEngine, lakehouse: EnterpriseLakehouse) -> None:
        self.rag = rag_engine
        self.lakehouse = lakehouse

    async def handle_chat(self, req: ChatRequest) -> ChatResponse:
        t_start = time.perf_counter()
        trace: list[TraceStep] = []
        profile = get_role_profile(req.role)

        # Step 1: UU PDP PII Guardrail
        t0 = time.perf_counter()
        sanitized_prompt, pii_events = redact_pii(req.message)
        pii_ms = round((time.perf_counter() - t0) * 1000, 2)
        total_pii_count = sum(e.count for e in pii_events)

        trace.append(
            TraceStep(
                step=1,
                stage="pii_guardrail",
                title="UU PDP No. 27/2022 PII Scanner",
                status="warning" if total_pii_count > 0 else "ok",
                latency_ms=pii_ms,
                detail=(
                    f"Redacted {total_pii_count} sensitive identifier(s) before downstream processing."
                    if total_pii_count > 0
                    else "Zero plaintext NIK, NPWP, card, phone, or email leaks detected."
                ),
                metadata={"redactions": [e.model_dump() for e in pii_events]},
            )
        )

        # Step 2: Intent & RBAC Policy Classification
        t1 = time.perf_counter()
        sql_plan = self.lakehouse.plan_lakehouse_query(sanitized_prompt)
        ticket_requested = req.auto_action and _wants_ticket_action(sanitized_prompt)

        intent_parts = ["HYBRID_RAG"]
        if sql_plan is not None:
            intent_parts.append("LAKEHOUSE_SQL")
        if ticket_requested:
            intent_parts.append("INCIDENT_DISPATCH")
        intent_label = " + ".join(intent_parts)
        router_ms = round((time.perf_counter() - t1) * 1000, 2)

        trace.append(
            TraceStep(
                step=2,
                stage="intent_router",
                title="Agentic Router & RBAC Clearance Check",
                status="ok",
                latency_ms=router_ms,
                detail=(
                    f"Role '{profile.label}' cleared for {list(profile.allowed_clearances)} "
                    f"| Planned tools: {intent_label}"
                ),
                metadata={
                    "role": req.role,
                    "allowed_clearances": list(profile.allowed_clearances),
                    "allowed_tables": list(profile.allowed_tables),
                },
            )
        )

        # Step 3: Hybrid RAG Retrieval (BM25 + Semantic Vector + RRF + Pre-LLM RBAC Gate)
        t2 = time.perf_counter()
        citations, blocked_citations = self.rag.search(query=sanitized_prompt, role=req.role, top_k=4)
        rag_ms = round((time.perf_counter() - t2) * 1000, 2)

        rbac_blocked = False
        rbac_reasons: list[str] = []

        if blocked_citations:
            rbac_blocked = True
            blocked_ids = ", ".join(f"{b.doc_id} [{b.clearance}]" for b in blocked_citations)
            rbac_reasons.append(f"Blocked unauthorized document chunks: {blocked_ids}")

        trace.append(
            TraceStep(
                step=3,
                stage="hybrid_rag",
                title="Hybrid RAG (BM25 + Dense Cosine + RRF)",
                status="blocked" if (blocked_citations and not citations) else ("warning" if blocked_citations else "ok"),
                latency_ms=rag_ms,
                detail=(
                    f"Retrieved {len(citations)} authorized chunk(s)"
                    + (f"; withheld {len(blocked_citations)} restricted chunk(s)." if blocked_citations else ".")
                ),
                metadata={
                    "authorized_docs": [c.chunk_id for c in citations],
                    "blocked_docs": [b.chunk_id for b in blocked_citations],
                },
            )
        )

        # Step 4: Lakehouse Structured SQL Execution (if planned)
        sql_result: SQLQueryResult | None = None
        step_num = 4
        if sql_plan is not None:
            t3 = time.perf_counter()
            try:
                sql_result = self.lakehouse.execute_safe_sql(
                    sql=str(sql_plan["sql"]),
                    role=req.role,
                    description=str(sql_plan["description"]),
                    chart_label_col=sql_plan.get("chart_label_col"),
                    chart_value_col=sql_plan.get("chart_value_col"),
                )
                sql_ms = round((time.perf_counter() - t3) * 1000, 2)
                trace.append(
                    TraceStep(
                        step=step_num,
                        stage="lakehouse_sql",
                        title="Sandboxed Lakehouse NL-to-SQL Engine",
                        status="ok",
                        latency_ms=sql_ms,
                        detail=f"Executed read-only SELECT on {sql_result.tables_used} -> {sql_result.row_count} row(s).",
                        metadata={"sql": sql_result.sql, "row_count": sql_result.row_count},
                    )
                )
            except RBACTableAccessError as exc:
                sql_ms = round((time.perf_counter() - t3) * 1000, 2)
                rbac_blocked = True
                rbac_reasons.append(str(exc))
                trace.append(
                    TraceStep(
                        step=step_num,
                        stage="lakehouse_sql",
                        title="Sandboxed Lakehouse NL-to-SQL Engine",
                        status="blocked",
                        latency_ms=sql_ms,
                        detail=str(exc),
                        metadata={"blocked_tables": exc.blocked_tables},
                    )
                )
            step_num += 1

        # Step 5: Automated Incident Ticket Dispatch (if requested)
        ticket_created: TicketActionResult | None = None
        if ticket_requested:
            t4 = time.perf_counter()
            try:
                # Derive grounded target & SOP from live telemetry / citations
                target = "sby-kafka-02 (Surabaya)"
                sop_ref = citations[0].doc_id if citations else "DOC-LAKE-01"
                squad = "Platform & Telco SRE Squad"
                title = "Automated P1 Escalation: Degraded Lakehouse / CDR Threshold Breach"

                if sql_result and sql_result.rows:
                    first = sql_result.rows[0]
                    if "node_id" in first:
                        target = f"{first['node_id']} ({first.get('region', 'Cluster')})"
                        title = f"P1 Node Remediation: {first['node_id']} at {first['cpu_pct']}% CPU"
                    elif "region" in first and "packet_loss_pct" in first:
                        target = f"CDR Pipeline {first['region']}"
                        title = f"P1 Telco CDR Anomaly: {first['region']} Packet Loss {first['packet_loss_pct']}%"
                        sop_ref = "SOP-CDR-02"

                ticket_created = self.lakehouse.create_incident_ticket(
                    role=req.role,
                    priority="P1",
                    title=title,
                    assigned_squad=squad,
                    target_node_or_region=target,
                    sop_reference=sop_ref,
                )
                act_ms = round((time.perf_counter() - t4) * 1000, 2)
                trace.append(
                    TraceStep(
                        step=step_num,
                        stage="workflow_action",
                        title="Enterprise Workflow Ticket Dispatcher",
                        status="ok",
                        latency_ms=act_ms,
                        detail=f"Created incident ticket {ticket_created.ticket_id} ({ticket_created.priority}) for {target}.",
                        metadata=ticket_created.model_dump(),
                    )
                )
            except PermissionError as exc:
                act_ms = round((time.perf_counter() - t4) * 1000, 2)
                rbac_blocked = True
                rbac_reasons.append(str(exc))
                trace.append(
                    TraceStep(
                        step=step_num,
                        stage="workflow_action",
                        title="Enterprise Workflow Ticket Dispatcher",
                        status="blocked",
                        latency_ms=act_ms,
                        detail=str(exc),
                        metadata={"role": req.role},
                    )
                )
            step_num += 1

        # Step 6: Grounded Answer Synthesis
        t5 = time.perf_counter()
        combined_rbac_reason = " | ".join(rbac_reasons) if rbac_reasons else None
        answer, provider_used, model_used = await generate_enterprise_answer(
            sanitized_prompt=sanitized_prompt,
            role=req.role,
            llm_config=req.llm_config,
            citations=citations,
            blocked_citations=blocked_citations,
            sql_result=sql_result,
            rbac_blocked=rbac_blocked,
            rbac_blocked_reason=combined_rbac_reason,
            ticket_created=ticket_created,
            pii_redactions=pii_events,
        )
        synth_ms = round((time.perf_counter() - t5) * 1000, 2)

        trace.append(
            TraceStep(
                step=step_num,
                stage="llm_synthesis",
                title="Grounded Response Synthesis",
                status="ok",
                latency_ms=synth_ms,
                detail=f"Synthesized response via {provider_used} ({model_used}).",
                metadata={"provider": provider_used, "model": model_used},
            )
        )

        total_ms = round((time.perf_counter() - t_start) * 1000, 2)

        # Compute calibrated grounding confidence score
        if rbac_blocked and not citations and sql_result is None:
            confidence = 0.99  # Deterministic policy enforcement
        elif not citations and sql_result is None:
            confidence = 0.95  # Deterministic out-of-scope guardrail refusal
        else:
            top_vec = citations[0].vector_score if citations else 0.35
            sql_boost = 0.18 if (sql_result and sql_result.rows) else 0.0
            confidence = round(min(0.98, 0.72 + (0.35 * top_vec) + sql_boost), 2)

        self.lakehouse.log_audit_event(
            role=req.role,
            intent=intent_label,
            prompt_preview=sanitized_prompt,
            pii_masked_count=total_pii_count,
            rbac_blocked=rbac_blocked,
            provider=provider_used,
            latency_ms=total_ms,
        )

        return ChatResponse(
            answer=answer,
            sanitized_prompt=sanitized_prompt,
            role=req.role,
            role_label=profile.label,
            intent=intent_label,
            provider_used=provider_used,
            model_used=model_used,
            total_latency_ms=total_ms,
            confidence_score=confidence,
            rbac_blocked=rbac_blocked,
            rbac_blocked_reason=combined_rbac_reason,
            pii_redactions=pii_events,
            citations=citations,
            blocked_citations=blocked_citations,
            sql_result=sql_result,
            ticket_created=ticket_created,
            trace=trace,
        )
