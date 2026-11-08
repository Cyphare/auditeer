# Tactical Interview & Demo Playbook — Solusi247

> Prepared specifically for **PT Dua Empat Tujuh (Solusi247)** — **Pengembangan Enterprise AI Assistant Project**.

---

## 1. Why This Project Resonates Deeply with Solusi247 Mentors

Solusi247 is not a generic consumer web agency—they are **Indonesia's Big Data & Enterprise AI pioneer** (established in 2000, offices in Jakarta & Yogyakarta), known for:
- **YAVA247 Data Platform** & **HGrid247 (DE & AN):** Open-source-based (Apache Spark, Kafka, Hadoop/Ozone) data engineering & low-code analytics without vendor lock-in.
- **Lyana Enterprise AI Assistant:** Productivity & operational knowledge assistant for corporate clients.
- **Core Sectors:** Tier-1 Telecommunications (massive CDR streams), Banking/Financial Services (fraud & OJK/UU PDP compliance), Government, and High-Tech Radar/VTS systems.

Most internship applicants show up with a basic *"Upload a PDF to LangChain + OpenAI API"* tutorial.  
You are walking in with **Auditeer**—an enterprise-grade system proving you already think like a senior systems engineer:
1. **Unstructured SOPs + Structured Lakehouse Telemetry** working together in a single query.
2. **Pre-LLM Zero-Trust RBAC** (enforced *before* chunks or SQL rows ever enter the prompt!).
3. **Indonesian Regulatory Readiness (UU PDP No. 27/2022)** masking 16-digit NIK, NPWP, phone numbers, emails, and card numbers automatically.
4. **Zero Vendor Lock-In** supporting **Local On-Premise Ollama (`qwen2.5` / `llama3.2`)**, `vLLM`, `Gemini`, and an offline deterministic synthesizer.
5. **Quantitative Engineering Rigor** via a 10-case automated evaluation suite measuring `MRR`, `Hit@3`, `RBAC Block Rate`, and `p95 Latency`.

---

## 2. The 3-Minute Live Interview Demo Script

Open `http://localhost:3000` during screen-share and walk through these 4 beats:

### Beat 1 — Bilingual Hybrid RAG + Live Lakehouse SQL + Agentic Ticket Dispatch (60s)
1. Keep RBAC Persona on **`Data & AI Engineer`**.
2. Click Scenario 1 (*"Telco CDR Anomaly + SOP"*): point out how Auditeer simultaneously queries `telecom_cdr_metrics` (`Jawa Timur` at `1.84%` packet loss) **and** retrieves `[SOP-CDR-02]` (`10-minute P1 MTTA`).
3. Click Scenario 2 (*"Auto-Dispatch P1 Ticket for Degraded Cluster"*): show the green **`AUD-103` P1 Ticket** created automatically for `sby-kafka-02` (`91.4% CPU`), and point to the **Agentic Execution X-Ray Trace** on the right showing millisecond latency at every stage.

### Beat 2 — Pre-LLM Zero-Trust RBAC & UU PDP PII Masking (60s)
1. Switch the top-right **RBAC Persona** to **`Junior Data Analyst`**.
2. Click Scenario 3 (*"Test Zero-Trust RBAC Block"*): show that asking for Executive Q3 ACV & Contract Margins is **deterministically blocked**—and point to the red **`Withheld by Pre-LLM RBAC Gate`** card in the X-Ray panel proving `EXEC-FIN-04` was scrubbed *before* LLM synthesis.
3. Switch Persona to **`Risk & Compliance Officer`** and click Scenario 4 (*"Test UU PDP PII Masking"*): show the NIK `3404071205990002`, mobile number, and email masked into `[REDACTED-*]` tokens in compliance with **UU No. 27 Tahun 2022**.

### Beat 3 — Live Ingestion & Sandboxed Lakehouse SQL (30s)
1. Click **`Knowledge Vault & Ingestion`** → click **"Index Document into Hybrid Vault"** to ingest `SOP-VTS-06` (Maritime VTS Radar SOP—a subtle nod to Solusi247's real VTS maritime engineering work!) in real time.
2. Click **`Lakehouse SQL & Audit Logs`** → click **"Test SQL Injection / DROP Block"** to show `DROP TABLE` rejected immediately, and inspect `audit_logs` recording every action.

### Beat 4 — Automated Release Gate Evaluation (30s)
1. Click **`Golden Benchmark Lab`** → click **"Run Live Golden Benchmark"**.
2. Show **100% Pass Rate**, **1.000 MRR**, **100% RBAC Leak Block**, **100% PII Masking**, and **< 5 ms p95 retrieval latency**.

---

## 3. High-Probability Technical Interview Questions & Winning Answers

1. **"Why did you build Hybrid BM25 + Vector RRF instead of pure dense vector search?"**
   - *Answer:* "In Indonesian telecom and banking SOPs, engineers search exact identifiers like `sby-kafka-02`, `POJK 11/2022`, `BI-FAST`, or `99.90%`. Pure dense embeddings often smooth over exact alphanumeric codes, whereas pure BM25 misses cross-lingual paraphrases (e.g., asking in English about *revenue margin* when the document says *keuntungan kontrak*). Combining Sparse BM25 Okapi + Subword/Concept Cosine Vectors via **Reciprocal Rank Fusion ($k=20$)** gives us exact acronym precision and semantic recall."

2. **"How do you guarantee the LLM doesn't leak restricted Executive documents via prompt injection?"**
   - *Answer:* "Never rely on system prompts for access control. In `Auditeer`, RBAC is enforced in Python (`rag_engine.py` and `lakehouse.py`) **before** context assembly. Unauthorized chunks and restricted SQL tables (`executive_contracts`) never enter the LLM prompt context window."

3. **"How do you prevent Text-to-SQL agents from corrupting production databases?"**
   - *Answer:* "Three layers in `execute_safe_sql`: (1) single-statement enforcement rejecting `;`, (2) strict `SELECT`/`WITH` whitelist plus regex blocking of `DROP/DELETE/UPDATE/INSERT/ALTER/PRAGMA`, and (3) pre-execution extraction of `FROM`/`JOIN` table identifiers verified against the active role's `allowed_tables` policy."

4. **"How would this scale on Solusi247's real enterprise stack (e.g., YAVA247 / HGrid247)?"**
   - *Answer:* "Each boundary is modular: the SQLite Data Mart adapter in `lakehouse.py` maps cleanly to Apache Spark Thrift Server / Trino / Iceberg over YAVA247 with Apache Ranger policies; the Hybrid RAG engine can scale horizontally to Qdrant/Milvus/OpenSearch; and `llm_gateway.py` already speaks OpenAI-compatible `/v1/chat/completions` for on-premise `vLLM` or `Ollama` GPU nodes."

---

## 4. Ready-to-Use CV & Cover Letter Bullets

### English (for Resume / GitHub Pin)
- **Auditeer — Intelligent Knowledge & Operations Copilot (`Python`, `FastAPI`, `Next.js`, `TypeScript`, `SQLite`)**
  - Engineered a bilingual (ID/EN) enterprise copilot combining **Hybrid RAG (BM25 + Subword TF-IDF Cosine + RRF)** with a **sandboxed NL-to-SQL Lakehouse engine** and automated P1 incident ticket dispatch.
  - Enforced **Pre-LLM Zero-Trust RBAC** across 4 corporate personas and **UU PDP No. 27/2022 PII redaction** (`NIK`, `NPWP`, phone, payment card, email) with immutable governance audit logging.
  - Built a 10-case automated evaluation suite achieving **100% pass rate (1.000 MRR, 0% unauthorized RBAC leakage, <5ms p95 retrieval latency)** with plug-and-play **Local Ollama / vLLM / Gemini** inference.

### Bahasa Indonesia (for Kemnaker / Kampus / HR Pitch)
- **Auditeer — Platform Audit Cerdas & Asisten Operasional Data**
  - Merancang asisten AI korporat dwibahasa (Indonesia–Inggris) yang mengintegrasikan **Hybrid RAG (BM25 + Vektor Semantik + Reciprocal Rank Fusion)** untuk dokumen SOP internal dengan **Text-to-SQL aman (Read-Only Sandbox)** di atas simulasi Data Lakehouse operasional (Telekomunikasi CDR & Perbankan).
  - Mengimplementasikan keamanan **Pre-LLM Role-Based Access Control (RBAC)** lintas 4 level jabatan serta penyamaran otomatis data sensitif (**UU PDP No. 27 Tahun 2022**: NIK, NPWP, nomor telepon, kartu pembayaran) lengkap dengan pencatatan *immutable audit log*.
  - Membangun *automated evaluation suite* (10 skenario uji) dengan capaian **100% akurasi guardrail & MRR 1.000**, serta mendukung inferensi *on-premise* bebas *vendor lock-in* (**Ollama / vLLM**) maupun Cloud API.
