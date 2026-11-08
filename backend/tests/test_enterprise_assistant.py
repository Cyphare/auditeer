from __future__ import annotations

import asyncio
from pathlib import Path
import pytest

from app.agent import EnterpriseAgentOrchestrator
from app.evaluator import run_golden_evaluation
from app.lakehouse import EnterpriseLakehouse, RBACTableAccessError
from app.models import ChatRequest, DocumentIngestRequest, LLMConfig
from app.rag_engine import HybridRAGEngine
from app.security import redact_pii

KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent / "data" / "knowledge_base"


@pytest.fixture()
def test_stack() -> EnterpriseAgentOrchestrator:
    rag = HybridRAGEngine(knowledge_dir=KNOWLEDGE_DIR)
    lh = EnterpriseLakehouse(db_path=":memory:")
    return EnterpriseAgentOrchestrator(rag_engine=rag, lakehouse=lh)


def test_indonesian_pii_redaction_uupdp() -> None:
    raw = (
        "Tolong cek nasabah NIK 3404071205990002 dengan nomor HP +6281234567890, "
        "email siti.aminah@perusahaan.co.id, NPWP 09.254.294.3-407.000, kartu 4532 1234 5678 9012."
    )
    sanitized, events = redact_pii(raw)
    assert "3404071205990002" not in sanitized
    assert "+6281234567890" not in sanitized
    assert "siti.aminah@perusahaan.co.id" not in sanitized
    assert "09.254.294.3-407.000" not in sanitized
    assert "4532 1234 5678 9012" not in sanitized
    assert len(events) == 5


def test_sql_sandbox_blocks_mutation_and_unauthorized_tables() -> None:
    lh = EnterpriseLakehouse(db_path=":memory:")
    with pytest.raises(ValueError, match="Only read-only SELECT"):
        lh.execute_safe_sql("DROP TABLE cluster_telemetry", role="executive")

    with pytest.raises(RBACTableAccessError):
        lh.execute_safe_sql("SELECT * FROM executive_contracts", role="junior_analyst")

    ok = lh.execute_safe_sql("SELECT node_id, cpu_pct FROM cluster_telemetry", role="junior_analyst")
    assert ok.row_count == 7


def test_rbac_blocks_executive_data_from_junior_analyst(test_stack: EnterpriseAgentOrchestrator) -> None:
    resp = asyncio.run(
        test_stack.handle_chat(
            ChatRequest(
                message="Berapa nilai kontrak ACV Q3 dan gross margin eksekutif pada laporan rahasia?",
                role="junior_analyst",
            )
        )
    )
    assert resp.rbac_blocked is True
    assert resp.sql_result is None
    assert all(c.clearance == "PUBLIC_INTERNAL" for c in resp.citations)
    assert "148,5" not in resp.answer


def test_agentic_workflow_creates_incident_ticket(test_stack: EnterpriseAgentOrchestrator) -> None:
    resp = asyncio.run(
        test_stack.handle_chat(
            ChatRequest(
                message="Check degraded cluster nodes CPU and open a P1 ticket with SOP remediation steps.",
                role="data_engineer",
                auto_action=True,
            )
        )
    )
    assert resp.sql_result is not None
    assert resp.ticket_created is not None
    assert resp.ticket_created.priority == "P1"
    assert resp.ticket_created.ticket_id.startswith("AUD-")


def test_live_document_ingestion_and_retrieval(tmp_path: Path) -> None:
    rag = HybridRAGEngine(knowledge_dir=tmp_path)
    rag.ingest_document(
        DocumentIngestRequest(
            doc_id="SOP-TEST-99",
            title="Prosedur Kalibrasi Radar Maritim VTS",
            category="High-Tech Radar SOP",
            clearance="ENGINEERING",
            owner="IoT & Radar R&D",
            content="## Kalibrasi Antena\nFrekuensi radar VTS wajib dikalibrasi setiap 14 hari dengan toleransi deviasi 0.02 dB.",
        )
    )
    auth_eng, _ = rag.search("Berapa hari sekali frekuensi radar VTS wajib dikalibrasi?", role="data_engineer")
    assert len(auth_eng) == 1
    assert auth_eng[0].doc_id == "SOP-TEST-99"

    auth_jr, blocked_jr = rag.search("Berapa hari sekali frekuensi radar VTS wajib dikalibrasi?", role="junior_analyst")
    assert len(auth_jr) == 0
    assert len(blocked_jr) == 1


def test_golden_benchmark_suite_achieves_100_percent(test_stack: EnterpriseAgentOrchestrator) -> None:
    summary = asyncio.run(run_golden_evaluation(test_stack, LLMConfig(provider="zero_key")))
    assert summary.total_cases == 10
    assert summary.pass_rate_pct == 100.0
    assert summary.rbac_block_rate_pct == 100.0
    assert summary.pii_masking_rate_pct == 100.0
    assert summary.hallucination_refusal_pct == 100.0
