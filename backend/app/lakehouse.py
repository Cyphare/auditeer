from __future__ import annotations

import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .models import RoleType, SQLQueryResult, TicketActionResult
from .security import can_access_table, get_role_profile

_FORBIDDEN_SQL_RE = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|TRUNCATE|ATTACH|DETACH|PRAGMA|VACUUM)\b",
    re.IGNORECASE,
)
_TABLE_EXTRACT_RE = re.compile(r"\b(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)", re.IGNORECASE)

KNOWN_TABLES: tuple[str, ...] = (
    "cluster_telemetry",
    "telecom_cdr_metrics",
    "banking_risk_alerts",
    "executive_contracts",
    "incident_tickets",
    "audit_logs",
)


class RBACTableAccessError(PermissionError):
    def __init__(self, role: RoleType, blocked_tables: list[str]) -> None:
        self.role = role
        self.blocked_tables = blocked_tables
        super().__init__(
            f"Role '{role}' is not authorized to query Lakehouse table(s): {', '.join(blocked_tables)}"
        )


class EnterpriseLakehouse:
    """
    Simulates an Enterprise Operational Data Mart (Open Lakehouse Architecture)
    with RBAC table-level governance, read-only SQL sandboxing, incident ticket
    creation, and immutable security audit logging.
    """

    def __init__(self, db_path: Path | str) -> None:
        self.db_path = str(db_path)
        self._is_memory = self.db_path == ":memory:"
        self._persistent_conn: sqlite3.Connection | None = None
        if self._is_memory:
            self._persistent_conn = sqlite3.connect(":memory:", check_same_thread=False)
            self._persistent_conn.row_factory = sqlite3.Row
        else:
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._initialize_and_seed()

    def _connect(self) -> sqlite3.Connection:
        if self._persistent_conn is not None:
            return self._persistent_conn
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _close_if_file(self, conn: sqlite3.Connection) -> None:
        if self._persistent_conn is None:
            conn.close()

    def _initialize_and_seed(self) -> None:
        conn = self._connect()
        try:
            cur = conn.cursor()
            cur.executescript(
                """
                CREATE TABLE IF NOT EXISTS cluster_telemetry (
                    node_id TEXT PRIMARY KEY,
                    region TEXT NOT NULL,
                    workload_module TEXT NOT NULL,
                    cpu_pct REAL NOT NULL,
                    memory_pct REAL NOT NULL,
                    latency_ms INTEGER NOT NULL,
                    uptime_sla_pct REAL NOT NULL,
                    status TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS telecom_cdr_metrics (
                    region TEXT PRIMARY KEY,
                    active_bts_count INTEGER NOT NULL,
                    cdr_throughput_m_hr REAL NOT NULL,
                    packet_loss_pct REAL NOT NULL,
                    dropped_call_pct REAL NOT NULL,
                    anomaly_score REAL NOT NULL,
                    sector_alerts INTEGER NOT NULL,
                    pipeline_status TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS banking_risk_alerts (
                    alert_id TEXT PRIMARY KEY,
                    channel TEXT NOT NULL,
                    masked_customer_ref TEXT NOT NULL,
                    amount_idr INTEGER NOT NULL,
                    risk_score REAL NOT NULL,
                    pattern_detected TEXT NOT NULL,
                    status TEXT NOT NULL,
                    detected_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS executive_contracts (
                    contract_code TEXT PRIMARY KEY,
                    client_sector TEXT NOT NULL,
                    region_scope TEXT NOT NULL,
                    acv_billion_idr REAL NOT NULL,
                    gross_margin_pct REAL NOT NULL,
                    sla_penalty_risk_billion_idr REAL NOT NULL,
                    renewal_quarter TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS incident_tickets (
                    ticket_id TEXT PRIMARY KEY,
                    priority TEXT NOT NULL,
                    title TEXT NOT NULL,
                    assigned_squad TEXT NOT NULL,
                    target_node_or_region TEXT NOT NULL,
                    status TEXT NOT NULL,
                    sop_reference TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    role TEXT NOT NULL,
                    intent TEXT NOT NULL,
                    prompt_preview TEXT NOT NULL,
                    pii_masked_count INTEGER NOT NULL,
                    rbac_blocked INTEGER NOT NULL,
                    provider TEXT NOT NULL,
                    latency_ms REAL NOT NULL
                );
                """
            )

            count = cur.execute("SELECT COUNT(*) FROM cluster_telemetry").fetchone()[0]
            if count == 0:
                cur.executemany(
                    "INSERT INTO cluster_telemetry VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                        ("sby-kafka-02", "Surabaya", "DE-CDR-Kafka-Broker", 91.4, 89.5, 640, 99.72, "DEGRADED"),
                        ("ygk-gpu-ai-01", "Yogyakarta", "AN-LLM-GPU-Inference", 86.2, 88.4, 520, 99.88, "DEGRADED"),
                        ("jkt-spark-01", "Jakarta", "DE-Spark-Streaming", 78.5, 81.0, 290, 99.94, "WARNING"),
                        ("jkt-spark-02", "Jakarta", "DE-Spark-Batch-ETL", 62.1, 68.4, 175, 99.98, "HEALTHY"),
                        ("jkt-ozone-01", "Jakarta", "Lakehouse-Iceberg-Storage", 54.0, 71.2, 130, 99.99, "HEALTHY"),
                        ("ygk-spark-an-02", "Yogyakarta", "AN-ML-FeatureStore", 64.8, 70.1, 195, 99.96, "HEALTHY"),
                        ("bdg-ranger-sec-01", "Bandung", "Kerberos-Ranger-Auth", 41.3, 52.0, 88, 99.99, "HEALTHY"),
                    ],
                )

                cur.executemany(
                    "INSERT INTO telecom_cdr_metrics VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                        ("Jawa Timur", 4820, 11.4, 1.84, 1.35, 0.89, 14, "CRITICAL_P1"),
                        ("Jabodetabek", 9450, 18.9, 0.96, 0.72, 0.58, 5, "WARNING_P2"),
                        ("DIY & Jawa Tengah", 4110, 7.8, 0.42, 0.38, 0.21, 1, "NORMAL"),
                        ("Jawa Barat", 6230, 10.2, 0.55, 0.44, 0.27, 2, "NORMAL"),
                        ("Kalimantan", 2890, 4.3, 0.74, 0.61, 0.39, 2, "NORMAL"),
                        ("Bali & Nusra", 2410, 3.9, 0.36, 0.29, 0.18, 0, "NORMAL"),
                    ],
                )

                cur.executemany(
                    "INSERT INTO banking_risk_alerts VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                        ("FRD-9041", "BI-FAST", "CIF-****-8821", 245000000, 0.94, "Rapid Multi-Hop Structuring (<180s)", "AUTO_HOLD", "2026-11-08 16:42 WIB"),
                        ("FRD-9042", "QRIS", "CIF-****-3109", 48500000, 0.88, "New Device Velocity Spike + Merchant Collusion", "AUTO_HOLD", "2026-11-08 17:05 WIB"),
                        ("FRD-9043", "RTGS", "CIF-****-7740", 890000000, 0.86, "Unusual Cross-Region Corporate Beneficiary", "AUTO_HOLD", "2026-11-08 17:19 WIB"),
                        ("FRD-9044", "Mobile Banking", "CIF-****-1294", 19000000, 0.76, "Impossible Travel Geo-IP Mismatch", "COMPLIANCE_REVIEW", "2026-11-08 17:31 WIB"),
                        ("FRD-9045", "BI-FAST", "CIF-****-5532", 32000000, 0.71, "Dormant Account Reactivation Burst", "COMPLIANCE_REVIEW", "2026-11-08 17:48 WIB"),
                    ],
                )

                cur.executemany(
                    "INSERT INTO executive_contracts VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [
                        ("CTR-TEL-01", "Telco Tier-1 East", "Jawa Timur & Bali", 42.5, 44.2, 1.85, "2026-Q4"),
                        ("CTR-TEL-02", "Telco National Core", "Jabodetabek & Nasional", 38.0, 41.5, 0.25, "2027-Q1"),
                        ("CTR-BNK-01", "Bank KBMI-4 Digital", "Nasional (On-Premise)", 34.8, 45.0, 0.00, "2027-Q2"),
                        ("CTR-GOV-01", "Kementerian Strategis", "Pusat Data Nasional", 33.2, 39.8, 0.15, "2026-Q4"),
                    ],
                )

                cur.executemany(
                    "INSERT INTO incident_tickets VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                        ("AUD-101", "P2", "Spark Executor Backpressure on jkt-spark-01", "Platform DE Squad", "jkt-spark-01", "IN_PROGRESS", "DOC-LAKE-01", "2026-11-08 15:20 WIB"),
                        ("AUD-102", "P2", "BI-FAST Velocity Rule Calibration Check", "Risk Analytics Squad", "BI-FAST Engine", "OPEN", "POL-PDP-03", "2026-11-08 16:50 WIB"),
                    ],
                )
            conn.commit()
        finally:
            self._close_if_file(conn)

    def execute_safe_sql(
        self,
        sql: str,
        role: RoleType,
        description: str = "Lakehouse Analytical Query",
        chart_label_col: str | None = None,
        chart_value_col: str | None = None,
    ) -> SQLQueryResult:
        cleaned = sql.strip().rstrip(";")
        if ";" in cleaned:
            raise ValueError("Multi-statement SQL execution is blocked by security policy.")
        if not (cleaned.upper().startswith("SELECT") or cleaned.upper().startswith("WITH")):
            raise ValueError("Only read-only SELECT / WITH queries are permitted on the Lakehouse.")
        if _FORBIDDEN_SQL_RE.search(cleaned):
            raise ValueError("Mutating or administrative SQL keywords are strictly forbidden.")

        tables_found = []
        for match in _TABLE_EXTRACT_RE.finditer(cleaned):
            tbl = match.group(1).lower()
            if tbl in KNOWN_TABLES and tbl not in tables_found:
                tables_found.append(tbl)

        blocked = [t for t in tables_found if not can_access_table(role, t)]
        if blocked:
            raise RBACTableAccessError(role=role, blocked_tables=blocked)

        conn = self._connect()
        try:
            cur = conn.execute(cleaned)
            raw_rows = cur.fetchall()
            columns = [col[0] for col in cur.description] if cur.description else []
            rows = [dict(r) for r in raw_rows[:25]]
        finally:
            self._close_if_file(conn)

        # Auto-infer chart columns if omitted
        if rows and columns and (chart_label_col is None or chart_value_col is None):
            str_cols = [c for c in columns if isinstance(rows[0].get(c), str)]
            num_cols = [c for c in columns if isinstance(rows[0].get(c), (int, float))]
            if str_cols and num_cols:
                chart_label_col = chart_label_col or str_cols[0]
                chart_value_col = chart_value_col or num_cols[0]

        return SQLQueryResult(
            sql=cleaned,
            description=description,
            tables_used=tables_found,
            row_count=len(rows),
            columns=columns,
            rows=rows,
            chart_label_col=chart_label_col,
            chart_value_col=chart_value_col,
        )

    def plan_lakehouse_query(self, prompt: str) -> dict[str, str | None] | None:
        """
        Deterministic Bilingual NL-to-SQL Planner for core enterprise telemetry tables.
        """
        q = prompt.lower()

        # 1. Executive Contracts / Margin / ACV / SLA Penalty financial queries
        if any(
            kw in q
            for kw in (
                "margin", "acv", "arr", "kontrak", "contract", "penalti", "penalty",
                "miliar", "billion", "financial", "keuangan", "revenue", "pendapatan",
            )
        ):
            return {
                "sql": (
                    "SELECT contract_code, client_sector, region_scope, acv_billion_idr, "
                    "gross_margin_pct, sla_penalty_risk_billion_idr "
                    "FROM executive_contracts ORDER BY acv_billion_idr DESC"
                ),
                "description": "Executive Strategic Contracts, Gross Margin & SLA Penalty Exposure",
                "chart_label_col": "contract_code",
                "chart_value_col": "acv_billion_idr",
            }

        # 2. Telecom CDR / Packet Loss / BTS / Dropped Call queries
        if any(
            kw in q
            for kw in (
                "cdr", "packet loss", "packet", "bts", "telco", "telekomunikasi",
                "telecom", "dropped call", "jawa timur", "jabodetabek",
            )
        ):
            return {
                "sql": (
                    "SELECT region, active_bts_count, cdr_throughput_m_hr, packet_loss_pct, "
                    "dropped_call_pct, anomaly_score, sector_alerts, pipeline_status "
                    "FROM telecom_cdr_metrics ORDER BY packet_loss_pct DESC"
                ),
                "description": "Real-Time Regional Telecom CDR Pipeline & Packet Loss Telemetry",
                "chart_label_col": "region",
                "chart_value_col": "packet_loss_pct",
            }

        # 3. Banking Fraud / QRIS / BI-FAST / Risk Score queries
        if any(
            kw in q
            for kw in (
                "fraud", "kecurangan", "bi-fast", "bifast", "qris", "rtgs",
                "risk_score", "skor risiko", "risk alert", "transaksi", "perbankan", "banking",
            )
        ):
            return {
                "sql": (
                    "SELECT alert_id, channel, masked_customer_ref, amount_idr, risk_score, "
                    "pattern_detected, status FROM banking_risk_alerts ORDER BY risk_score DESC"
                ),
                "description": "Digital Banking High-Risk Fraud & Anomaly Alerts",
                "chart_label_col": "alert_id",
                "chart_value_col": "risk_score",
            }

        # 4. Cluster Telemetry / Node CPU / Degraded / Spark / Kafka / GPU health queries
        if any(
            kw in q
            for kw in (
                "cluster", "klaster", "node", "cpu", "degraded", "spark", "kafka",
                "telemetry", "telemetri", "uptime", "sby-kafka", "ygk-gpu", "kesehatan", "server",
            )
        ):
            return {
                "sql": (
                    "SELECT node_id, region, workload_module, cpu_pct, memory_pct, "
                    "latency_ms, uptime_sla_pct, status "
                    "FROM cluster_telemetry ORDER BY cpu_pct DESC"
                ),
                "description": "Lakehouse Compute, Streaming & GPU Cluster Health Telemetry",
                "chart_label_col": "node_id",
                "chart_value_col": "cpu_pct",
            }

        # 5. Incident Tickets listing
        if any(kw in q for kw in ("daftar tiket", "list ticket", "open ticket", "incident_tickets", "status tiket")):
            return {
                "sql": (
                    "SELECT ticket_id, priority, title, assigned_squad, target_node_or_region, "
                    "status, sop_reference, created_at FROM incident_tickets ORDER BY ticket_id DESC"
                ),
                "description": "Active Operational Incident Tickets",
                "chart_label_col": None,
                "chart_value_col": None,
            }

        return None

    def create_incident_ticket(
        self,
        role: RoleType,
        priority: str,
        title: str,
        assigned_squad: str,
        target_node_or_region: str,
        sop_reference: str,
    ) -> TicketActionResult:
        profile = get_role_profile(role)
        if not profile.can_create_tickets:
            raise PermissionError(
                f"Role '{profile.label}' does not have write permission to dispatch operational P1/P2 tickets."
            )

        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        conn = self._connect()
        try:
            cur = conn.cursor()
            total = cur.execute("SELECT COUNT(*) FROM incident_tickets").fetchone()[0]
            ticket_id = f"AUD-{101 + total}"
            norm_prio = priority if priority in ("P1", "P2", "P3") else "P1"
            cur.execute(
                "INSERT INTO incident_tickets VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    ticket_id,
                    norm_prio,
                    title,
                    assigned_squad,
                    target_node_or_region,
                    "OPEN",
                    sop_reference,
                    now_str,
                ),
            )
            conn.commit()
        finally:
            self._close_if_file(conn)

        return TicketActionResult(
            ticket_id=ticket_id,
            priority=norm_prio,  # type: ignore[arg-type]
            title=title,
            assigned_squad=assigned_squad,
            target_node_or_region=target_node_or_region,
            status="OPEN",
            sop_reference=sop_reference,
            created_at=now_str,
        )

    def log_audit_event(
        self,
        role: RoleType,
        intent: str,
        prompt_preview: str,
        pii_masked_count: int,
        rbac_blocked: bool,
        provider: str,
        latency_ms: float,
    ) -> None:
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        conn = self._connect()
        try:
            conn.execute(
                """
                INSERT INTO audit_logs
                (timestamp, role, intent, prompt_preview, pii_masked_count, rbac_blocked, provider, latency_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    now_str,
                    role,
                    intent,
                    prompt_preview[:140],
                    pii_masked_count,
                    1 if rbac_blocked else 0,
                    provider,
                    round(latency_ms, 2),
                ),
            )
            conn.commit()
        finally:
            self._close_if_file(conn)

    def get_dashboard_snapshot(self, role: RoleType) -> dict[str, Any]:
        conn = self._connect()
        try:
            snapshot: dict[str, Any] = {"role": role, "tables": {}}
            for tbl in KNOWN_TABLES:
                if can_access_table(role, tbl):
                    order_clause = "ORDER BY id DESC LIMIT 20" if tbl == "audit_logs" else "LIMIT 20"
                    rows = [dict(r) for r in conn.execute(f"SELECT * FROM {tbl} {order_clause}").fetchall()]
                    snapshot["tables"][tbl] = {"accessible": True, "rows": rows}
                else:
                    snapshot["tables"][tbl] = {"accessible": False, "rows": []}
            return snapshot
        finally:
            self._close_if_file(conn)
