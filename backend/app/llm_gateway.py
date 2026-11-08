from __future__ import annotations

import json
import os
import re
import httpx

from .models import (
    CitationChunk,
    LLMConfig,
    PIIRedactionEvent,
    RoleType,
    SQLQueryResult,
    TicketActionResult,
)
from .security import get_role_profile
from .rag_engine import tokenize_lexical


def _build_system_prompt(role: RoleType) -> str:
    profile = get_role_profile(role)
    return (
        "You are Auditeer, an internal knowledge and operations copilot.\n"
        f"Active Role: {profile.label} ({profile.department}).\n"
        "Rules:\n"
        "1. Answer concisely using ONLY [AUTHORIZED KNOWLEDGE CHUNKS] and [LAKEHOUSE SQL RESULTS].\n"
        "2. Cite document IDs inline like [DOC-LAKE-01].\n"
        "3. Never invent facts. If outside scope, briefly state no internal data matched.\n"
        "4. Reply in the same language as the user's question without unnecessary filler."
    )


def _build_grounded_context_block(
    citations: list[CitationChunk],
    blocked_citations: list[CitationChunk],
    sql_result: SQLQueryResult | None,
    ticket_created: TicketActionResult | None,
    pii_redactions: list[PIIRedactionEvent],
) -> str:
    parts: list[str] = []

    if pii_redactions:
        summary = ", ".join(f"{e.pii_type} ({e.count}x)" for e in pii_redactions)
        parts.append(f"[PII MASKED]: {summary}")

    if blocked_citations:
        b_list = ", ".join(f"{b.doc_id} ({b.clearance})" for b in blocked_citations)
        parts.append(f"[RESTRICTED DOCS WITHHELD]: {b_list}")

    if citations:
        chunk_texts = [
            f"--- [{c.doc_id}] {c.title} | {c.section} ---\n{c.snippet}"
            for c in citations
        ]
        parts.append("[AUTHORIZED KNOWLEDGE CHUNKS]:\n" + "\n\n".join(chunk_texts))

    if sql_result and sql_result.rows:
        parts.append(
            f"[LAKEHOUSE SQL RESULTS]:\nSQL: {sql_result.sql}\n"
            f"Rows: {json.dumps(sql_result.rows[:10], ensure_ascii=False)}"
        )

    if ticket_created:
        parts.append(
            f"[TICKET CREATED]: {ticket_created.ticket_id} ({ticket_created.priority}) - {ticket_created.title}"
        )

    return "\n\n".join(parts)


def _select_best_lines(snippet: str, query_tokens: set[str], max_lines: int = 2) -> list[str]:
    lines = [ln.strip() for ln in snippet.splitlines() if ln.strip()]
    scored: list[tuple[float, int, str]] = []
    for idx, ln in enumerate(lines):
        ltoks = set(tokenize_lexical(ln))
        overlap = len(query_tokens & ltoks)
        has_metric = 0.6 if re.search(r"\d+%|\bP[12]\b|Rp\s?\d|Miliar|VRAM|SLA|REDACTED", ln) else 0.0
        scored.append((overlap + has_metric, -idx, ln))
    scored.sort(reverse=True)
    chosen = sorted(scored[:max_lines], key=lambda item: -item[1])
    return [c[2].lstrip("-* ") for c in chosen]


def synthesize_zero_key_response(
    sanitized_prompt: str,
    role: RoleType,
    citations: list[CitationChunk],
    blocked_citations: list[CitationChunk],
    sql_result: SQLQueryResult | None,
    rbac_blocked: bool,
    rbac_blocked_reason: str | None,
    ticket_created: TicketActionResult | None,
    pii_redactions: list[PIIRedactionEvent],
) -> str:
    profile = get_role_profile(role)
    is_id = any(
        w in sanitized_prompt.lower()
        for w in (
            "apa", "berapa", "bagaimana", "tolong", "cek", "daftar", "laporan", "kebijakan",
            "buatkan", "tiket", "nasabah", "anomali", "klaster", "kontrak", "margin",
        )
    )

    sections: list[str] = []

    if pii_redactions:
        masked_desc = ", ".join(f"{e.pii_type} ({e.count}x)" for e in pii_redactions)
        sections.append(
            f"> Data sensitif disamarkan otomatis sesuai UU PDP: {masked_desc}."
            if is_id
            else f"> Sensitive data masked automatically (UU PDP): {masked_desc}."
        )

    # 1. Restricted by Role
    if rbac_blocked and not citations and sql_result is None:
        doc_tags = ", ".join(f"`{b.doc_id}` ({b.clearance})" for b in blocked_citations)
        reason_detail = rbac_blocked_reason or (f"Requires access to {doc_tags}" if doc_tags else "Insufficient permissions.")
        if is_id:
            sections.append(
                f"Akses ditolak untuk peran **{profile.label}**.\n"
                f"- {reason_detail}"
            )
        else:
            sections.append(
                f"Access denied for role **{profile.label}**.\n"
                f"- {reason_detail}"
            )
        return "\n\n".join(sections)

    # 2. Out-of-scope refusal
    if not citations and (sql_result is None or not sql_result.rows):
        if pii_redactions:
            return "\n\n".join(
                sections
                + [
                    "Input telah disanitasi `[POL-PDP-03]`. Silakan ajukan pertanyaan terkait operasional atau kebijakan internal."
                    if is_id
                    else "Input sanitized `[POL-PDP-03]`. Please ask a question related to internal operations or policy."
                ]
            )
        return (
            "Tidak ditemukan data atau dokumen internal yang relevan untuk menjawab pertanyaan ini."
            if is_id
            else "No matching internal documents or operational data found for this question."
        )

    # 3. Concise SQL summary
    if sql_result and sql_result.rows:
        top_row = sql_result.rows[0]
        if "cpu_pct" in top_row and float(top_row["cpu_pct"]) > 85:
            sections.append(
                f"Node **`{top_row['node_id']}`** ({top_row['region']}) saat ini berstatus **{top_row['status']}** "
                f"dengan utilisasi CPU **{top_row['cpu_pct']}%** dan latensi **{top_row['latency_ms']} ms**."
                if is_id
                else f"Node **`{top_row['node_id']}`** ({top_row['region']}) is currently **{top_row['status']}** "
                f"at **{top_row['cpu_pct']}% CPU** and **{top_row['latency_ms']} ms** latency."
            )
        elif "packet_loss_pct" in top_row:
            sections.append(
                f"Regional **{top_row['region']}** mencatat *packet loss* CDR tertinggi sebesar **{top_row['packet_loss_pct']}%** "
                f"(skor anomali **{top_row['anomaly_score']}**, status `{top_row['pipeline_status']}`)."
                if is_id
                else f"**{top_row['region']}** currently has the highest CDR packet loss at **{top_row['packet_loss_pct']}%** "
                f"(anomaly score **{top_row['anomaly_score']}**, status `{top_row['pipeline_status']}`)."
            )
        elif "acv_billion_idr" in top_row:
            total_acv = round(sum(float(r["acv_billion_idr"]) for r in sql_result.rows), 2)
            total_pen = round(sum(float(r["sla_penalty_risk_billion_idr"]) for r in sql_result.rows), 2)
            sections.append(
                f"Total nilai kontrak aktif tercatat **Rp {total_acv} Miliar** dengan eksposur risiko penalti SLA **Rp {total_pen} Miliar**."
                if is_id
                else f"Total active contract value is **IDR {total_acv} Billion**, with **IDR {total_pen} Billion** in SLA penalty exposure."
            )
        elif "risk_score" in top_row:
            sections.append(
                f"Alert risiko tertinggi saat ini adalah **`{top_row['alert_id']}`** pada kanal **{top_row['channel']}** "
                f"(skor risiko **{top_row['risk_score']}**, status `{top_row['status']}`)."
                if is_id
                else f"Top risk alert is **`{top_row['alert_id']}`** on **{top_row['channel']}** "
                f"(risk score **{top_row['risk_score']}**, status `{top_row['status']}`)."
            )

    # 4. Concise RAG citations
    if citations:
        q_tokens = set(tokenize_lexical(sanitized_prompt))
        cite_blocks: list[str] = []
        for c in citations[:2]:
            best_points = _select_best_lines(c.snippet, q_tokens, max_lines=2)
            cite_blocks.append(f"- **`[{c.doc_id}]` {c.section}:** {' '.join(best_points)}")
        sections.append("\n".join(cite_blocks))

    # 5. Ticket confirmation
    if ticket_created:
        sections.append(
            f"Tiket **`{ticket_created.ticket_id}`** ({ticket_created.priority}) telah dibuat untuk `{ticket_created.target_node_or_region}`."
            if is_id
            else f"Created ticket **`{ticket_created.ticket_id}`** ({ticket_created.priority}) for `{ticket_created.target_node_or_region}`."
        )

    return "\n\n".join(sections)


async def generate_enterprise_answer(
    sanitized_prompt: str,
    role: RoleType,
    llm_config: LLMConfig,
    citations: list[CitationChunk],
    blocked_citations: list[CitationChunk],
    sql_result: SQLQueryResult | None,
    rbac_blocked: bool,
    rbac_blocked_reason: str | None,
    ticket_created: TicketActionResult | None,
    pii_redactions: list[PIIRedactionEvent],
) -> tuple[str, str, str]:
    if (rbac_blocked and not citations and sql_result is None) or (
        not citations and (sql_result is None or not sql_result.rows)
    ):
        ans = synthesize_zero_key_response(
            sanitized_prompt=sanitized_prompt,
            role=role,
            citations=citations,
            blocked_citations=blocked_citations,
            sql_result=sql_result,
            rbac_blocked=rbac_blocked,
            rbac_blocked_reason=rbac_blocked_reason,
            ticket_created=ticket_created,
            pii_redactions=pii_redactions,
        )
        return ans, "zero_key_guardrail", "auditeer-policy-v1"

    provider = llm_config.provider or os.getenv("DEFAULT_LLM_PROVIDER", "zero_key")  # type: ignore[assignment]
    if provider == "zero_key":
        ans = synthesize_zero_key_response(
            sanitized_prompt=sanitized_prompt,
            role=role,
            citations=citations,
            blocked_citations=blocked_citations,
            sql_result=sql_result,
            rbac_blocked=rbac_blocked,
            rbac_blocked_reason=rbac_blocked_reason,
            ticket_created=ticket_created,
            pii_redactions=pii_redactions,
        )
        return ans, "zero_key", "auditeer-grounded-v1"

    sys_prompt = _build_system_prompt(role)
    context_block = _build_grounded_context_block(
        citations=citations,
        blocked_citations=blocked_citations,
        sql_result=sql_result,
        ticket_created=ticket_created,
        pii_redactions=pii_redactions,
    )
    user_payload = f"{context_block}\n\n[QUESTION]:\n{sanitized_prompt}"

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            if provider == "ollama":
                base_url = (llm_config.base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")).rstrip("/")
                model = llm_config.model or os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
                resp = await client.post(
                    f"{base_url}/api/chat",
                    json={
                        "model": model,
                        "stream": False,
                        "messages": [
                            {"role": "system", "content": sys_prompt},
                            {"role": "user", "content": user_payload},
                        ],
                    },
                )
                resp.raise_for_status()
                text = resp.json().get("message", {}).get("content", "").strip()
                if text:
                    return text, "ollama", model

            elif provider == "gemini":
                api_key = llm_config.api_key or os.getenv("GEMINI_API_KEY", "")
                if not api_key:
                    raise ValueError("Missing GEMINI_API_KEY")
                model = llm_config.model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                    params={"key": api_key},
                    json={
                        "system_instruction": {"parts": [{"text": sys_prompt}]},
                        "contents": [{"role": "user", "parts": [{"text": user_payload}]}],
                        "generationConfig": {"temperature": 0.15},
                    },
                )
                resp.raise_for_status()
                text = (
                    resp.json()
                    .get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                    .strip()
                )
                if text:
                    return text, "gemini", model

            elif provider == "openai":
                api_key = llm_config.api_key or os.getenv("OPENAI_API_KEY", "")
                if not api_key:
                    raise ValueError("Missing OPENAI_API_KEY")
                base_url = (llm_config.base_url or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")).rstrip("/")
                model = llm_config.model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
                resp = await client.post(
                    f"{base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": model,
                        "temperature": 0.15,
                        "messages": [
                            {"role": "system", "content": sys_prompt},
                            {"role": "user", "content": user_payload},
                        ],
                    },
                )
                resp.raise_for_status()
                text = resp.json()["choices"][0]["message"]["content"].strip()
                if text:
                    return text, "openai", model

    except Exception as exc:
        fallback = synthesize_zero_key_response(
            sanitized_prompt=sanitized_prompt,
            role=role,
            citations=citations,
            blocked_citations=blocked_citations,
            sql_result=sql_result,
            rbac_blocked=rbac_blocked,
            rbac_blocked_reason=rbac_blocked_reason,
            ticket_created=ticket_created,
            pii_redactions=pii_redactions,
        )
        return f"> `{provider}` unavailable ({type(exc).__name__}); using local engine.\n\n{fallback}", f"{provider}->local", "auditeer-grounded-v1"

    fallback = synthesize_zero_key_response(
        sanitized_prompt=sanitized_prompt,
        role=role,
        citations=citations,
        blocked_citations=blocked_citations,
        sql_result=sql_result,
        rbac_blocked=rbac_blocked,
        rbac_blocked_reason=rbac_blocked_reason,
        ticket_created=ticket_created,
        pii_redactions=pii_redactions,
    )
    return fallback, "zero_key", "auditeer-grounded-v1"
