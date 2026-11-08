import { ROLE_PROFILES } from "./security";

export interface ClusterRow {
  node_id: string;
  region: string;
  workload_module: string;
  cpu_pct: number;
  memory_pct: number;
  latency_ms: number;
  uptime_sla_pct: number;
  status: string;
}

export interface TelecomRow {
  region: string;
  active_bts_count: number;
  cdr_throughput_m_hr: number;
  packet_loss_pct: number;
  dropped_call_pct: number;
  anomaly_score: number;
  sector_alerts: number;
  pipeline_status: string;
}

export interface BankingRow {
  alert_id: string;
  channel: string;
  masked_customer_ref: string;
  amount_idr: number;
  risk_score: number;
  pattern_detected: string;
  status: string;
}

export interface ContractRow {
  contract_code: string;
  client_sector: string;
  region_scope: string;
  acv_billion_idr: number;
  gross_margin_pct: number;
  sla_penalty_risk_billion_idr: number;
  renewal_quarter: string;
}

export interface TicketRow {
  ticket_id: string;
  priority: string;
  title: string;
  assigned_squad: string;
  target_node_or_region: string;
  status: string;
  sop_reference: string;
  created_at: string;
}

export const CLUSTER_TELEMETRY: ClusterRow[] = [
  { node_id: "sby-kafka-02", region: "Surabaya", workload_module: "Kafka-Broker", cpu_pct: 91.4, memory_pct: 89.5, latency_ms: 640, uptime_sla_pct: 99.72, status: "DEGRADED" },
  { node_id: "ygk-gpu-ai-01", region: "Yogyakarta", workload_module: "GPU-Inference", cpu_pct: 86.2, memory_pct: 88.4, latency_ms: 520, uptime_sla_pct: 99.88, status: "DEGRADED" },
  { node_id: "jkt-spark-01", region: "Jakarta", workload_module: "Spark-Streaming", cpu_pct: 78.5, memory_pct: 81.0, latency_ms: 290, uptime_sla_pct: 99.94, status: "WARNING" },
  { node_id: "jkt-spark-02", region: "Jakarta", workload_module: "Spark-Batch-ETL", cpu_pct: 62.1, memory_pct: 68.4, latency_ms: 175, uptime_sla_pct: 99.98, status: "HEALTHY" },
  { node_id: "jkt-ozone-01", region: "Jakarta", workload_module: "Iceberg-Storage", cpu_pct: 54.0, memory_pct: 71.2, latency_ms: 130, uptime_sla_pct: 99.99, status: "HEALTHY" },
  { node_id: "ygk-spark-02", region: "Yogyakarta", workload_module: "FeatureStore", cpu_pct: 64.8, memory_pct: 70.1, latency_ms: 195, uptime_sla_pct: 99.96, status: "HEALTHY" },
  { node_id: "bdg-ranger-01", region: "Bandung", workload_module: "Ranger-Auth", cpu_pct: 41.3, memory_pct: 52.0, latency_ms: 88, uptime_sla_pct: 99.99, status: "HEALTHY" },
];

export const TELECOM_CDR_METRICS: TelecomRow[] = [
  { region: "Jawa Timur", active_bts_count: 4820, cdr_throughput_m_hr: 11.4, packet_loss_pct: 1.84, dropped_call_pct: 1.35, anomaly_score: 0.89, sector_alerts: 14, pipeline_status: "CRITICAL_P1" },
  { region: "Jabodetabek", active_bts_count: 9450, cdr_throughput_m_hr: 18.9, packet_loss_pct: 0.96, dropped_call_pct: 0.72, anomaly_score: 0.58, sector_alerts: 5, pipeline_status: "WARNING_P2" },
  { region: "DIY & Jawa Tengah", active_bts_count: 4110, cdr_throughput_m_hr: 7.8, packet_loss_pct: 0.42, dropped_call_pct: 0.38, anomaly_score: 0.21, sector_alerts: 1, pipeline_status: "NORMAL" },
  { region: "Jawa Barat", active_bts_count: 6230, cdr_throughput_m_hr: 10.2, packet_loss_pct: 0.55, dropped_call_pct: 0.44, anomaly_score: 0.27, sector_alerts: 2, pipeline_status: "NORMAL" },
  { region: "Kalimantan", active_bts_count: 2890, cdr_throughput_m_hr: 4.3, packet_loss_pct: 0.74, dropped_call_pct: 0.61, anomaly_score: 0.39, sector_alerts: 2, pipeline_status: "NORMAL" },
  { region: "Bali & Nusra", active_bts_count: 2410, cdr_throughput_m_hr: 3.9, packet_loss_pct: 0.36, dropped_call_pct: 0.29, anomaly_score: 0.18, sector_alerts: 0, pipeline_status: "NORMAL" },
];

export const BANKING_RISK_ALERTS: BankingRow[] = [
  { alert_id: "FRD-9041", channel: "BI-FAST", masked_customer_ref: "CIF-****-8821", amount_idr: 245000000, risk_score: 0.94, pattern_detected: "Rapid Multi-Hop Structuring (<180s)", status: "AUTO_HOLD" },
  { alert_id: "FRD-9042", channel: "QRIS", masked_customer_ref: "CIF-****-3109", amount_idr: 48500000, risk_score: 0.88, pattern_detected: "New Device Velocity Spike", status: "AUTO_HOLD" },
  { alert_id: "FRD-9043", channel: "RTGS", masked_customer_ref: "CIF-****-7740", amount_idr: 890000000, risk_score: 0.86, pattern_detected: "Unusual Cross-Region Beneficiary", status: "AUTO_HOLD" },
  { alert_id: "FRD-9044", channel: "Mobile Banking", masked_customer_ref: "CIF-****-1294", amount_idr: 19000000, risk_score: 0.76, pattern_detected: "Impossible Travel Geo-IP", status: "COMPLIANCE_REVIEW" },
];

export const EXECUTIVE_CONTRACTS: ContractRow[] = [
  { contract_code: "CTR-TEL-01", client_sector: "Telco Tier-1 East", region_scope: "Jawa Timur & Bali", acv_billion_idr: 42.5, gross_margin_pct: 44.2, sla_penalty_risk_billion_idr: 1.85, renewal_quarter: "2026-Q4" },
  { contract_code: "CTR-TEL-02", client_sector: "Telco National Core", region_scope: "Jabodetabek & Nasional", acv_billion_idr: 38.0, gross_margin_pct: 41.5, sla_penalty_risk_billion_idr: 0.25, renewal_quarter: "2027-Q1" },
  { contract_code: "CTR-BNK-01", client_sector: "Bank Digital", region_scope: "Nasional", acv_billion_idr: 34.8, gross_margin_pct: 45.0, sla_penalty_risk_billion_idr: 0.00, renewal_quarter: "2027-Q2" },
  { contract_code: "CTR-GOV-01", client_sector: "Public Agency", region_scope: "Pusat Data", acv_billion_idr: 33.2, gross_margin_pct: 39.8, sla_penalty_risk_billion_idr: 0.15, renewal_quarter: "2026-Q4" },
];

export const INCIDENT_TICKETS: TicketRow[] = [
  { ticket_id: "AUD-101", priority: "P2", title: "Spark Executor Backpressure on jkt-spark-01", assigned_squad: "Platform Squad", target_node_or_region: "jkt-spark-01", status: "IN_PROGRESS", sop_reference: "DOC-LAKE-01", created_at: "2026-11-08 15:20 WIB" },
  { ticket_id: "AUD-102", priority: "P2", title: "BI-FAST Velocity Rule Calibration", assigned_squad: "Risk Analytics", target_node_or_region: "BI-FAST Engine", status: "OPEN", sop_reference: "POL-PDP-03", created_at: "2026-11-08 16:50 WIB" },
];

export const AUDIT_LOGS = [
  { id: 1, timestamp: "2026-11-08 17:00 UTC", role: "data_engineer", intent: "HYBRID_RAG + LAKEHOUSE_SQL", prompt_preview: "Regional mana packet loss CDR tertinggi?", pii_masked_count: 0, rbac_blocked: 0, latency_ms: 3.2 },
  { id: 2, timestamp: "2026-11-08 17:05 UTC", role: "junior_analyst", intent: "HYBRID_RAG", prompt_preview: "Berapa nilai kontrak ACV Q3 eksekutif?", pii_masked_count: 0, rbac_blocked: 1, latency_ms: 2.1 },
];

export function executeSafeSQL(sql: string, role: string) {
  const q = sql.trim().toUpperCase();
  if (q.includes(";") && q.indexOf(";") < q.length - 1) {
    throw new Error("Multi-statement execution is blocked.");
  }
  if (!q.startsWith("SELECT") && !q.startsWith("WITH")) {
    throw new Error("Only read-only SELECT queries are allowed.");
  }
  if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)\b/.test(q)) {
    throw new Error("Data modifying keywords are strictly blocked.");
  }

  const profile = ROLE_PROFILES[role] || ROLE_PROFILES.junior_analyst;

  if (q.includes("EXECUTIVE_CONTRACTS") && !profile.allowed_tables.includes("executive_contracts")) {
    throw new Error(`Role '${profile.label}' does not have permission to query 'executive_contracts'.`);
  }
  if (q.includes("TELECOM_CDR_METRICS") && !profile.allowed_tables.includes("telecom_cdr_metrics")) {
    throw new Error(`Role '${profile.label}' does not have permission to query 'telecom_cdr_metrics'.`);
  }
  if (q.includes("BANKING_RISK_ALERTS") && !profile.allowed_tables.includes("banking_risk_alerts")) {
    throw new Error(`Role '${profile.label}' does not have permission to query 'banking_risk_alerts'.`);
  }

  if (q.includes("EXECUTIVE_CONTRACTS")) {
    return {
      sql,
      description: "Executive Contracts & Margin Exposure",
      tables_used: ["executive_contracts"],
      row_count: EXECUTIVE_CONTRACTS.length,
      columns: Object.keys(EXECUTIVE_CONTRACTS[0]),
      rows: EXECUTIVE_CONTRACTS,
      chart_label_col: "contract_code",
      chart_value_col: "acv_billion_idr",
    };
  }

  if (q.includes("TELECOM_CDR_METRICS")) {
    return {
      sql,
      description: "Telecom CDR Telemetry",
      tables_used: ["telecom_cdr_metrics"],
      row_count: TELECOM_CDR_METRICS.length,
      columns: Object.keys(TELECOM_CDR_METRICS[0]),
      rows: TELECOM_CDR_METRICS,
      chart_label_col: "region",
      chart_value_col: "packet_loss_pct",
    };
  }

  if (q.includes("BANKING_RISK_ALERTS")) {
    return {
      sql,
      description: "Banking Risk Alerts",
      tables_used: ["banking_risk_alerts"],
      row_count: BANKING_RISK_ALERTS.length,
      columns: Object.keys(BANKING_RISK_ALERTS[0]),
      rows: BANKING_RISK_ALERTS,
      chart_label_col: "alert_id",
      chart_value_col: "risk_score",
    };
  }

  return {
    sql,
    description: "Lakehouse Cluster Telemetry",
    tables_used: ["cluster_telemetry"],
    row_count: CLUSTER_TELEMETRY.length,
    columns: Object.keys(CLUSTER_TELEMETRY[0]),
    rows: CLUSTER_TELEMETRY,
    chart_label_col: "node_id",
    chart_value_col: "cpu_pct",
  };
}
