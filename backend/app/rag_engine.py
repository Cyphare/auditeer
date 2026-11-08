from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any

from .models import CitationChunk, ClearanceLevel, DocumentIngestRequest, RoleType
from .security import can_access_clearance

# Bilingual stopwords (Indonesian + English)
_STOPWORDS: set[str] = {
    # Indonesian
    "yang", "dan", "di", "ke", "dari", "untuk", "pada", "dengan", "adalah", "ini", "itu",
    "atau", "dalam", "oleh", "sebagai", "akan", "dapat", "tidak", "jika", "apabila",
    "tersebut", "setiap", "seluruh", "lebih", "serta", "maupun", "agar", "karena",
    "bagaimana", "berapa", "apa", "siapa", "kapan", "dimana", "mengapa", "apakah",
    "kami", "kita", "anda", "mereka", "nya", "ada", "hal", "saat", "secara", "bisa",
    # English
    "the", "and", "for", "with", "that", "this", "from", "are", "was", "were", "will",
    "what", "how", "when", "where", "which", "who", "whom", "whose", "why", "can",
    "into", "about", "over", "under", "between", "through", "during", "before", "after",
    "please", "tell", "show", "give", "find", "check", "explain", "does", "have", "has",
}

# Bilingual Enterprise Domain Concept Expansion (enables English <-> Indonesian cross-retrieval)
_BILINGUAL_CONCEPTS: dict[str, tuple[str, ...]] = {
    "margin": ("keuntungan", "laba", "gross", "kontrak", "keuangan", "financial", "acv", "arr"),
    "keuntungan": ("margin", "gross", "profit", "kontrak", "acv"),
    "revenue": ("pendapatan", "kontrak", "arr", "acv", "miliar", "financial"),
    "pendapatan": ("revenue", "arr", "acv", "kontrak", "miliar"),
    "contract": ("kontrak", "acv", "eksekutif", "penalti", "sla"),
    "kontrak": ("contract", "acv", "eksekutif", "penalti", "sla"),
    "penalty": ("penalti", "eksposur", "sla", "sby", "jawa", "timur"),
    "penalti": ("penalty", "eksposur", "sla"),
    "cdr": ("telekomunikasi", "telecom", "telco", "packet", "loss", "bts", "dropped", "anomali"),
    "telecom": ("telekomunikasi", "cdr", "packet", "loss", "bts"),
    "packet": ("loss", "cdr", "kritis", "p1", "bts", "eskalasi"),
    "fraud": ("kecurangan", "perbankan", "banking", "risiko", "risk", "qris", "bifast", "ojk"),
    "banking": ("perbankan", "bank", "fraud", "ojk", "qris", "bifast", "rtgs"),
    "privacy": ("privasi", "pdp", "nik", "redaksi", "masking", "pribadi", "ojk"),
    "pdp": ("privasi", "privacy", "nik", "redaksi", "masking", "pribadi", "27", "2022"),
    "pii": ("nik", "npwp", "pdp", "redaksi", "masking", "pribadi", "telepon", "kartu"),
    "gpu": ("vram", "yogyakarta", "ygk", "pelatihan", "klaster", "batch", "kuota"),
    "vpn": ("wireguard", "zero", "trust", "akses", "onboarding", "internal"),
    "cluster": ("klaster", "node", "cpu", "memori", "spark", "kafka", "degraded", "sla"),
    "degraded": ("kritis", "degradasi", "cpu", "p1", "rebalance", "failover", "spark"),
    "escalation": ("eskalasi", "mitigasi", "tiket", "p1", "mtta", "insiden"),
    "eskalasi": ("escalation", "mitigasi", "tiket", "p1", "insiden"),
}

_TOKEN_RE = re.compile(r"[a-zA-Z0-9_.-]{2,}")


def _stem_id_light(token: str) -> str:
    """Lightweight Indonesian suffix normalization for robust lexical matching."""
    if len(token) > 5:
        for suffix in ("nya", "kan", "lah"):
            if token.endswith(suffix):
                token = token[: -len(suffix)]
                break
    if len(token) > 5 and token.endswith("an") and not token.endswith("aan"):
        token = token[:-2]
    return token


def tokenize_lexical(text: str) -> list[str]:
    raw_tokens = [m.group(0).lower().strip(".-_") for m in _TOKEN_RE.finditer(text)]
    tokens: list[str] = []
    for tok in raw_tokens:
        if len(tok) < 2 or tok in _STOPWORDS:
            continue
        tokens.append(tok)
        stemmed = _stem_id_light(tok)
        if stemmed != tok and len(stemmed) >= 3:
            tokens.append(stemmed)
    return tokens


def build_semantic_features(text: str) -> Counter[str]:
    """
    Constructs a dense-like bilingual feature bag combining:
    1. Lexical & stemmed unigrams (weight 2.0)
    2. Adjacent token bigrams (weight 1.5)
    3. Bilingual domain concept expansions (weight 1.3)
    4. Character 4-grams on content words >= 4 chars (weight 0.45) for morphological resilience
    """
    lex = tokenize_lexical(text)
    feats: Counter[str] = Counter()

    for tok in lex:
        feats[f"w:{tok}"] += 2.0
        if tok in _BILINGUAL_CONCEPTS:
            for syn in _BILINGUAL_CONCEPTS[tok]:
                feats[f"c:{syn}"] += 1.3
            feats[f"c:{tok}"] += 1.3
        if len(tok) >= 4 and tok.isalpha():
            padded = f"<{tok}>"
            for i in range(len(padded) - 3):
                feats[f"g:{padded[i:i+4]}"] += 0.45

    for i in range(len(lex) - 1):
        feats[f"b:{lex[i]}_{lex[i+1]}"] += 1.5

    return feats


@dataclass
class DocumentRecord:
    doc_id: str
    title: str
    category: str
    clearance: ClearanceLevel
    owner: str
    last_updated: str
    source_file: str
    chunk_count: int = 0
    raw_content: str = ""


@dataclass
class IndexedChunk:
    chunk_id: str
    doc_id: str
    title: str
    section: str
    category: str
    clearance: ClearanceLevel
    content: str
    lexical_tf: Counter[str] = field(default_factory=Counter)
    doc_len: int = 0
    semantic_vec: dict[str, float] = field(default_factory=dict)


class HybridRAGEngine:
    """
    Enterprise Bilingual Hybrid RAG Engine:
    - Section-aware Markdown chunking with contextual header enrichment
    - Sparse BM25 Okapi scoring (exact acronyms, SLA metrics, regulation numbers)
    - Bilingual Subword + Concept TF-IDF Cosine Vector scoring
    - Reciprocal Rank Fusion (RRF) + Pre-LLM Role-Based Access Control (RBAC) Gate
    """

    def __init__(self, knowledge_dir: Path) -> None:
        self.knowledge_dir = knowledge_dir
        self.documents: dict[str, DocumentRecord] = {}
        self.chunks: list[IndexedChunk] = []
        self.bm25_df: Counter[str] = Counter()
        self.sem_df: Counter[str] = Counter()
        self.avg_doc_len: float = 1.0
        self.reload_from_disk()

    def reload_from_disk(self) -> None:
        self.documents.clear()
        self.chunks.clear()
        if not self.knowledge_dir.exists():
            self.knowledge_dir.mkdir(parents=True, exist_ok=True)
            return

        for md_path in sorted(self.knowledge_dir.glob("*.md")):
            raw = md_path.read_text(encoding="utf-8")
            meta, body = self._parse_frontmatter(raw, md_path.stem)
            self._add_document_chunks(
                doc_id=meta.get("doc_id", md_path.stem.upper()),
                title=meta.get("title", md_path.stem.replace("_", " ").title()),
                category=meta.get("category", "Enterprise Knowledge"),
                clearance=meta.get("clearance", "PUBLIC_INTERNAL"),  # type: ignore[arg-type]
                owner=meta.get("owner", "Engineering Operations"),
                last_updated=meta.get("last_updated", str(date.today())),
                source_file=md_path.name,
                body=body,
            )

        self._rebuild_statistics()

    @staticmethod
    def _parse_frontmatter(raw: str, fallback_id: str) -> tuple[dict[str, str], str]:
        meta: dict[str, str] = {"doc_id": fallback_id.upper()}
        if raw.startswith("---"):
            parts = raw.split("---", 2)
            if len(parts) == 3:
                for line in parts[1].strip().splitlines():
                    if ":" in line:
                        k, v = line.split(":", 1)
                        meta[k.strip()] = v.strip()
                return meta, parts[2].strip()
        return meta, raw.strip()

    def _add_document_chunks(
        self,
        doc_id: str,
        title: str,
        category: str,
        clearance: ClearanceLevel,
        owner: str,
        last_updated: str,
        source_file: str,
        body: str,
    ) -> DocumentRecord:
        # Split on Markdown ## headings while keeping rich context
        sections: list[tuple[str, str]] = []
        current_heading = "Overview"
        current_lines: list[str] = []

        for line in body.splitlines():
            if line.startswith("## "):
                if current_lines:
                    sections.append((current_heading, "\n".join(current_lines).strip()))
                    current_lines = []
                current_heading = line.lstrip("# ").strip()
            elif line.startswith("# "):
                continue
            else:
                current_lines.append(line)

        if current_lines:
            sections.append((current_heading, "\n".join(current_lines).strip()))

        created_count = 0
        for idx, (section_title, section_body) in enumerate(sections, start=1):
            if not section_body.strip():
                continue
            enriched_text = f"[{doc_id}] {title} — {section_title}\n{section_body}"
            lex_tokens = tokenize_lexical(enriched_text)
            chunk = IndexedChunk(
                chunk_id=f"{doc_id}#C{idx}",
                doc_id=doc_id,
                title=title,
                section=section_title,
                category=category,
                clearance=clearance,
                content=section_body.strip(),
                lexical_tf=Counter(lex_tokens),
                doc_len=max(len(lex_tokens), 1),
            )
            self.chunks.append(chunk)
            created_count += 1

        record = DocumentRecord(
            doc_id=doc_id,
            title=title,
            category=category,
            clearance=clearance,
            owner=owner,
            last_updated=last_updated,
            source_file=source_file,
            chunk_count=created_count,
            raw_content=body,
        )
        self.documents[doc_id] = record
        return record

    def _rebuild_statistics(self) -> None:
        self.bm25_df.clear()
        self.sem_df.clear()

        if not self.chunks:
            self.avg_doc_len = 1.0
            return

        total_len = 0
        raw_sem_bags: list[Counter[str]] = []

        for ch in self.chunks:
            total_len += ch.doc_len
            for term in ch.lexical_tf:
                self.bm25_df[term] += 1

            enriched = f"{ch.title} {ch.section} {ch.category} {ch.content}"
            sem_bag = build_semantic_features(enriched)
            raw_sem_bags.append(sem_bag)
            for feat in sem_bag:
                self.sem_df[feat] += 1

        self.avg_doc_len = total_len / len(self.chunks)
        n_docs = len(self.chunks)

        # Compute L2-normalized TF-IDF dense vectors for every chunk
        for ch, sem_bag in zip(self.chunks, raw_sem_bags):
            vec: dict[str, float] = {}
            norm_sq = 0.0
            for feat, tf in sem_bag.items():
                df = self.sem_df[feat]
                idf = math.log(1.0 + (n_docs + 1.0) / (df + 0.5))
                weight = (1.0 + math.log(tf)) * idf
                vec[feat] = weight
                norm_sq += weight * weight
            norm = math.sqrt(norm_sq) or 1.0
            ch.semantic_vec = {k: v / norm for k, v in vec.items()}

    def ingest_document(self, req: DocumentIngestRequest) -> DocumentRecord:
        safe_id = re.sub(r"[^A-Za-z0-9_-]", "-", req.doc_id.upper())
        filename = f"custom_{safe_id.lower()}.md"
        today_str = str(date.today())
        md_text = (
            f"---\n"
            f"doc_id: {safe_id}\n"
            f"title: {req.title}\n"
            f"category: {req.category}\n"
            f"clearance: {req.clearance}\n"
            f"owner: {req.owner}\n"
            f"last_updated: {today_str}\n"
            f"---\n\n"
            f"# {req.title}\n\n"
            f"{req.content.strip()}\n"
        )
        file_path = self.knowledge_dir / filename
        file_path.write_text(md_text, encoding="utf-8")

        # Remove previous chunks if overwriting same doc_id
        self.chunks = [c for c in self.chunks if c.doc_id != safe_id]
        record = self._add_document_chunks(
            doc_id=safe_id,
            title=req.title,
            category=req.category,
            clearance=req.clearance,
            owner=req.owner,
            last_updated=today_str,
            source_file=filename,
            body=req.content.strip(),
        )
        self._rebuild_statistics()
        return record

    def _score_bm25(self, query_tokens: list[str], chunk: IndexedChunk, k1: float = 1.5, b: float = 0.75) -> float:
        if not query_tokens or not self.chunks:
            return 0.0
        n_docs = len(self.chunks)
        score = 0.0
        for term in query_tokens:
            tf = chunk.lexical_tf.get(term, 0)
            if tf == 0:
                continue
            df = self.bm25_df.get(term, 0)
            idf = math.log(1.0 + (n_docs - df + 0.5) / (df + 0.5))
            denom = tf + k1 * (1.0 - b + b * (chunk.doc_len / self.avg_doc_len))
            score += idf * ((tf * (k1 + 1.0)) / denom)
        return score

    def _score_semantic(self, query_vec: dict[str, float], chunk: IndexedChunk) -> float:
        if not query_vec or not chunk.semantic_vec:
            return 0.0
        # Dot product of two L2-normalized vectors = exact Cosine Similarity
        smaller, larger = (
            (query_vec, chunk.semantic_vec)
            if len(query_vec) <= len(chunk.semantic_vec)
            else (chunk.semantic_vec, query_vec)
        )
        return sum(val * larger.get(feat, 0.0) for feat, val in smaller.items())

    def search(
        self,
        query: str,
        role: RoleType,
        top_k: int = 4,
        rrf_k: int = 20,
    ) -> tuple[list[CitationChunk], list[CitationChunk]]:
        """
        Executes Hybrid Retrieval (BM25 + Semantic Cosine + RRF) and applies
        pre-LLM Role-Based Access Control (RBAC).
        Returns (authorized_chunks, blocked_chunks).
        """
        if not self.chunks:
            return [], []

        q_tokens = tokenize_lexical(query)
        q_sem_bag = build_semantic_features(query)
        n_docs = len(self.chunks)

        q_vec: dict[str, float] = {}
        q_norm_sq = 0.0
        for feat, tf in q_sem_bag.items():
            df = self.sem_df.get(feat, 0)
            idf = math.log(1.0 + (n_docs + 1.0) / (df + 0.5))
            w = (1.0 + math.log(tf)) * idf
            q_vec[feat] = w
            q_norm_sq += w * w
        q_norm = math.sqrt(q_norm_sq) or 1.0
        q_vec = {k: v / q_norm for k, v in q_vec.items()}

        bm25_scores = [self._score_bm25(q_tokens, ch) for ch in self.chunks]
        sem_scores = [self._score_semantic(q_vec, ch) for ch in self.chunks]

        bm25_order = sorted(range(n_docs), key=lambda i: bm25_scores[i], reverse=True)
        sem_order = sorted(range(n_docs), key=lambda i: sem_scores[i], reverse=True)

        bm25_rank = {idx: rank + 1 for rank, idx in enumerate(bm25_order)}
        sem_rank = {idx: rank + 1 for rank, idx in enumerate(sem_order)}

        scored_items: list[tuple[int, float]] = []
        for idx in range(n_docs):
            # Ignore completely unrelated chunks
            if bm25_scores[idx] <= 0.01 and sem_scores[idx] <= 0.06:
                continue
            rrf = (1.0 / (rrf_k + bm25_rank[idx])) + (1.0 / (rrf_k + sem_rank[idx]))
            # Boost slightly by normalized semantic relevance to break ties cleanly
            fused = rrf + (0.015 * sem_scores[idx])
            scored_items.append((idx, fused))

        scored_items.sort(key=lambda pair: pair[1], reverse=True)
        top_fused = scored_items[0][1] if scored_items else 0.0

        authorized: list[CitationChunk] = []
        blocked: list[CitationChunk] = []

        for idx, fused_score in scored_items:
            ch = self.chunks[idx]
            b_score = round(bm25_scores[idx], 3)
            v_score = round(sem_scores[idx], 3)
            r_score = round(fused_score, 4)

            # Calibrated relevance gate: prevents single-word out-of-domain overlap (e.g. "malam")
            # from triggering false citations while preserving short technical acronym queries.
            is_relevant = (b_score >= 2.1 and v_score >= 0.095) or v_score >= 0.155 or b_score >= 3.6
            if not is_relevant:
                continue

            allowed = can_access_clearance(role, ch.clearance)
            if allowed:
                if len(authorized) < top_k:
                    authorized.append(
                        CitationChunk(
                            chunk_id=ch.chunk_id,
                            doc_id=ch.doc_id,
                            title=ch.title,
                            section=ch.section,
                            category=ch.category,
                            clearance=ch.clearance,
                            bm25_score=b_score,
                            vector_score=v_score,
                            rrf_score=r_score,
                            snippet=ch.content,
                            access_granted=True,
                        )
                    )
            else:
                # Flag RBAC block only when the restricted chunk is a primary/strong match
                is_strong_restricted_hit = (
                    (b_score >= 3.0 or v_score >= 0.21)
                    and fused_score >= (0.82 * top_fused)
                )
                if is_strong_restricted_hit and len(blocked) < 3:
                    blocked.append(
                        CitationChunk(
                            chunk_id=ch.chunk_id,
                            doc_id=ch.doc_id,
                            title=ch.title,
                            section=ch.section,
                            category=ch.category,
                            clearance=ch.clearance,
                            bm25_score=b_score,
                            vector_score=v_score,
                            rrf_score=r_score,
                            snippet=(
                                f"[REDACTED BY RBAC POLICY] Active role '{role}' lacks "
                                f"'{ch.clearance}' clearance required to view {ch.doc_id} ({ch.section})."
                            ),
                            access_granted=False,
                        )
                    )

        return authorized, blocked

    def list_documents(self, role: RoleType) -> list[dict[str, Any]]:
        docs: list[dict[str, Any]] = []
        for doc in self.documents.values():
            accessible = can_access_clearance(role, doc.clearance)
            docs.append(
                {
                    "doc_id": doc.doc_id,
                    "title": doc.title,
                    "category": doc.category,
                    "clearance": doc.clearance,
                    "owner": doc.owner,
                    "last_updated": doc.last_updated,
                    "chunk_count": doc.chunk_count,
                    "accessible": accessible,
                    "preview": (
                        doc.raw_content[:360] + "..."
                        if accessible
                        else f"[LOCKED — Requires {doc.clearance} clearance]"
                    ),
                }
            )
        return docs
