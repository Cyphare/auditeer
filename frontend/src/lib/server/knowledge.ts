export interface ServerDoc {
  doc_id: string;
  title: string;
  category: string;
  clearance: "PUBLIC_INTERNAL" | "ENGINEERING" | "COMPLIANCE" | "EXECUTIVE";
  owner: string;
  last_updated: string;
  sections: { heading: string; content: string }[];
}

export const SERVER_DOCUMENTS: ServerDoc[] = [
  {
    doc_id: "DOC-LAKE-01",
    title: "Lakehouse Architecture & Runbook (Spark, Kafka, Governance)",
    category: "Data Platform",
    clearance: "PUBLIC_INTERNAL",
    owner: "Platform Engineering",
    last_updated: "2026-10-15",
    sections: [
      {
        heading: "1. Open Ecosystem Lakehouse",
        content:
          "Open-source lakehouse using Apache Kafka (streaming up to 45M events/hr), Apache Ozone storage with Iceberg tables, and Apache Spark 3.5 distributed ETL with Ranger security and Kerberos authentication.",
      },
      {
        heading: "2. Infrastructure SLA & Node Health Thresholds",
        content:
          "Target uptime SLA is 99.90%. Status HEALTHY: CPU < 75%, Latency < 250ms. WARNING: CPU 75-85%. Status DEGRADED (Critical): CPU > 85%, Memory > 88%, or latency > 500ms for over 10 minutes. Mandatory action: Open P1 incident ticket, run rebalance_spark_partitions.sh, and shift non-critical batch jobs.",
      },
      {
        heading: "3. Disaster Recovery & Failover",
        content:
          "For GPU AI inference node (ygk-gpu-ai-01): if VRAM utilization exceeds 90%, activate 4-bit AWQ quantization or route traffic to fallback gateway.",
      },
    ],
  },
  {
    doc_id: "SOP-CDR-02",
    title: "SOP Telecom CDR Stream & Anomaly Mitigation",
    category: "Telecom Engineering",
    clearance: "ENGINEERING",
    owner: "Telco Data Engineering",
    last_updated: "2026-10-22",
    sections: [
      {
        heading: "1. Scope & Telemetry Thresholds",
        content:
          "Normal packet loss is < 0.80%. Warning (P2) is 0.80% - 1.50%. Critical (P1 Escalation) is packet loss > 1.50% OR dropped call rate > 1.20% OR anomaly score >= 0.80. Mean Time to Acknowledge (MTTA) for P1 is maximum 10 minutes.",
      },
      {
        heading: "2. Streaming Pipeline Mitigation",
        content:
          "When P1 anomaly is detected: 1. Scale Spark micro-batch executors from 12 to 24. 2. Identify highest anomaly region on telecom_cdr_metrics. 3. Route corrupt records to quarantine dead-letter queue. 4. Auto-dispatch P1 ticket.",
      },
    ],
  },
  {
    doc_id: "POL-PDP-03",
    title: "Data Privacy Policy (UU PDP No. 27/2022) & Digital Banking Fraud",
    category: "Compliance & Risk",
    clearance: "COMPLIANCE",
    owner: "Data Governance & Privacy Office",
    last_updated: "2026-10-28",
    sections: [
      {
        heading: "1. UU PDP No. 27/2022 Compliance",
        content:
          "Mandatory automated PII redaction: 16-digit NIK KTP, payment cards, mobile numbers (+62/08), and personal emails must never be sent in plaintext to external models or logs. Personal data breaches must be notified in writing within 3 x 24 hours (72 hours).",
      },
      {
        heading: "2. Digital Banking Fraud Detection Rules",
        content:
          "Risk score >= 0.85 triggers auto-hold and step-up MFA. Triggers include rapid multi-hop structuring (<180s) and BI-FAST velocity bursts. Risk score 0.65 - 0.84 enters compliance review queue with 2-hour SLA.",
      },
    ],
  },
  {
    doc_id: "EXEC-FIN-04",
    title: "Executive Confidential Report: Q3 Margins & SLA Penalties",
    category: "Executive Board",
    clearance: "EXECUTIVE",
    owner: "Office of the CFO",
    last_updated: "2026-11-01",
    sections: [
      {
        heading: "1. Financial Performance & Contracts",
        content:
          "Strictly Confidential (Executive Only). Total Annual Contract Value (ACV) across 9 Tier-1 accounts is IDR 148.5 Billion. Gross margin is 42.8%. Annual Recurring Revenue (ARR) is IDR 64.2 Billion.",
      },
      {
        heading: "2. SLA Penalty Exposure & Q4 Expansion",
        content:
          "Potential SLA penalty exposure of IDR 1.85 Billion on East Java Telco contract (sby-kafka-02) if CDR packet loss is not resolved before audit close.",
      },
    ],
  },
  {
    doc_id: "IT-SOP-05",
    title: "Engineering Onboarding & R&D GPU Reservation Guidelines",
    category: "Internal Operations",
    clearance: "PUBLIC_INTERNAL",
    owner: "Internal IT Operations",
    last_updated: "2026-10-10",
    sections: [
      {
        heading: "1. Network Access & Zero-Trust VPN",
        content:
          "All engineers must use WireGuard Zero-Trust VPN with 2FA to access internal Git repositories and Lakehouse clusters. Activation portal: https://access.internal-platform.id.",
      },
      {
        heading: "2. GPU Cluster Allocation",
        content:
          "Interactive daytime hours (08:30 - 17:30 WIB): Maximum 16 GB VRAM per session. Night batch jobs (19:00 - 06:00 WIB): Up to 80 GB VRAM via Slurm/Kubernetes queue on ygk-gpu-ai-01.",
      },
      {
        heading: "3. Quality & Security Gates",
        content:
          "Must achieve Grounded Faithfulness >= 90%, 100% RBAC Block Rate for unauthorized roles, 100% UU PDP PII masking, and retrieval latency p95 < 500ms.",
      },
    ],
  },
];
