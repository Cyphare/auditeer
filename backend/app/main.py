from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .agent import EnterpriseAgentOrchestrator
from .evaluator import run_golden_evaluation
from .lakehouse import EnterpriseLakehouse, RBACTableAccessError
from .models import (
    ChatRequest,
    ChatResponse,
    DocumentIngestRequest,
    EvalRunRequest,
    EvalSuiteSummary,
    RetrievalSearchRequest,
    RoleType,
)
from .rag_engine import HybridRAGEngine
from .security import ROLE_PROFILES

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

KNOWLEDGE_DIR = BASE_DIR / "data" / "knowledge_base"
DB_PATH = BASE_DIR / "data" / "enterprise_lakehouse.db"

rag_engine = HybridRAGEngine(knowledge_dir=KNOWLEDGE_DIR)
lakehouse = EnterpriseLakehouse(db_path=DB_PATH)
orchestrator = EnterpriseAgentOrchestrator(rag_engine=rag_engine, lakehouse=lakehouse)

app = FastAPI(
    title="Auditeer API",
    description=(
        "Auditeer Intelligence & Governance Platform featuring Bilingual Hybrid RAG "
        "(BM25 + Dense Cosine + RRF), Sandboxed Lakehouse Text-to-SQL, Pre-LLM Zero-Trust RBAC, "
        "UU PDP No. 27/2022 PII Masking, Automated Incident Dispatch, and Golden Benchmark Evaluation."
    ),
    version="1.0.0",
)

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CustomSQLRequest(BaseModel):
    sql: str
    role: RoleType = "executive"


@app.get("/api/health")
def get_health() -> dict:
    return {
        "status": "healthy",
        "service": "Auditeer",
        "indexed_documents": len(rag_engine.documents),
        "indexed_chunks": len(rag_engine.chunks),
        "default_provider": os.getenv("DEFAULT_LLM_PROVIDER", "zero_key"),
        "roles": [
            {
                "role": p.role,
                "label": p.label,
                "department": p.department,
                "allowed_clearances": list(p.allowed_clearances),
                "allowed_tables": list(p.allowed_tables),
                "can_create_tickets": p.can_create_tickets,
                "badge_color": p.badge_color,
            }
            for p in ROLE_PROFILES.values()
        ],
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest) -> ChatResponse:
    return await orchestrator.handle_chat(req)


@app.get("/api/documents")
def list_documents_endpoint(role: RoleType = Query(default="data_engineer")) -> dict:
    return {
        "role": role,
        "total_documents": len(rag_engine.documents),
        "total_chunks": len(rag_engine.chunks),
        "documents": rag_engine.list_documents(role=role),
    }


@app.post("/api/documents/ingest")
def ingest_document_endpoint(req: DocumentIngestRequest) -> dict:
    record = rag_engine.ingest_document(req)
    return {
        "status": "indexed",
        "doc_id": record.doc_id,
        "title": record.title,
        "clearance": record.clearance,
        "chunk_count": record.chunk_count,
        "total_chunks_in_vault": len(rag_engine.chunks),
    }


@app.post("/api/documents/search")
def retrieval_playground_endpoint(req: RetrievalSearchRequest) -> dict:
    authorized, blocked = rag_engine.search(query=req.query, role=req.role, top_k=req.top_k)
    return {
        "query": req.query,
        "role": req.role,
        "authorized_chunks": [c.model_dump() for c in authorized],
        "blocked_chunks": [b.model_dump() for b in blocked],
    }


@app.get("/api/lakehouse/snapshot")
def lakehouse_snapshot_endpoint(role: RoleType = Query(default="data_engineer")) -> dict:
    return lakehouse.get_dashboard_snapshot(role=role)


@app.post("/api/lakehouse/sql")
def custom_sql_endpoint(req: CustomSQLRequest) -> dict:
    try:
        res = lakehouse.execute_safe_sql(sql=req.sql, role=req.role, description="Custom Interactive Lakehouse SQL")
        return res.model_dump()
    except RBACTableAccessError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/eval/run", response_model=EvalSuiteSummary)
async def run_evaluation_endpoint(req: EvalRunRequest) -> EvalSuiteSummary:
    return await run_golden_evaluation(orchestrator=orchestrator, llm_config=req.llm_config)
