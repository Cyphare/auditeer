export interface RoleProfile {
  role: string;
  label: string;
  department: string;
  allowed_clearances: string[];
  allowed_tables: string[];
  can_create_tickets: boolean;
  badge_color: string;
}

export const ROLE_PROFILES: Record<string, RoleProfile> = {
  junior_analyst: {
    role: "junior_analyst",
    label: "Junior Analyst",
    department: "BI & Reporting",
    allowed_clearances: ["PUBLIC_INTERNAL"],
    allowed_tables: ["cluster_telemetry", "incident_tickets"],
    can_create_tickets: false,
    badge_color: "amber",
  },
  data_engineer: {
    role: "data_engineer",
    label: "Data Engineer",
    department: "Platform Engineering",
    allowed_clearances: ["PUBLIC_INTERNAL", "ENGINEERING"],
    allowed_tables: ["cluster_telemetry", "telecom_cdr_metrics", "incident_tickets"],
    can_create_tickets: true,
    badge_color: "cyan",
  },
  compliance_officer: {
    role: "compliance_officer",
    label: "Compliance Officer",
    department: "Risk & Privacy",
    allowed_clearances: ["PUBLIC_INTERNAL", "COMPLIANCE"],
    allowed_tables: ["banking_risk_alerts", "incident_tickets", "audit_logs"],
    can_create_tickets: true,
    badge_color: "emerald",
  },
  executive: {
    role: "executive",
    label: "Executive",
    department: "Leadership",
    allowed_clearances: ["PUBLIC_INTERNAL", "ENGINEERING", "COMPLIANCE", "EXECUTIVE"],
    allowed_tables: [
      "cluster_telemetry",
      "telecom_cdr_metrics",
      "banking_risk_alerts",
      "executive_contracts",
      "incident_tickets",
      "audit_logs",
    ],
    can_create_tickets: true,
    badge_color: "violet",
  },
};

const NPWP_RE = /\b\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}\b/g;
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_RE = /(?<!\d)(?:\+62|62|0)8[1-9][0-9]{1,2}[\s.-]?[0-9]{3,4}[\s.-]?[0-9]{3,5}(?!\d)/g;
const NIK_RE = /(?<!\d)(?:1[1-9]|21|3[1-6]|5[1-3]|6[1-5]|7[1-6]|8[1-2]|9[1-6])\d{2}[\s-]?\d{6}[\s-]?\d{6}(?!\d)/g;
const CARD_RE = /(?<!\d)(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6011)[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}(?!\d)/g;

export function redactPII(text: string): {
  sanitized: string;
  redactions: { pii_type: string; count: number; law_reference: string }[];
} {
  const events: { pii_type: string; count: number; law_reference: string }[] = [];
  let sanitized = text;

  const patterns: [string, RegExp, string][] = [
    ["NPWP Tax ID", NPWP_RE, "[REDACTED-NPWP]"],
    ["Indonesian NIK (KTP)", NIK_RE, "[REDACTED-NIK]"],
    ["Payment Card Number", CARD_RE, "[REDACTED-CARD]"],
    ["Indonesian Mobile Number", PHONE_RE, "[REDACTED-PHONE]"],
    ["Personal Email Address", EMAIL_RE, "[REDACTED-EMAIL]"],
  ];

  for (const [label, re, rep] of patterns) {
    const matches = sanitized.match(re);
    if (matches && matches.length > 0) {
      sanitized = sanitized.replace(re, rep);
      events.push({
        pii_type: label,
        count: matches.length,
        law_reference: "UU PDP No. 27 Tahun 2022",
      });
    }
  }

  return { sanitized, redactions: events };
}
