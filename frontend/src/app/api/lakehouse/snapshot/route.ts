import { NextRequest, NextResponse } from "next/server";
import {
  CLUSTER_TELEMETRY,
  TELECOM_CDR_METRICS,
  BANKING_RISK_ALERTS,
  EXECUTIVE_CONTRACTS,
  INCIDENT_TICKETS,
  AUDIT_LOGS,
} from "@/lib/server/lakehouse";
import { ROLE_PROFILES } from "@/lib/server/security";

export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get("role") || "data_engineer";
  const profile = ROLE_PROFILES[role] || ROLE_PROFILES.junior_analyst;

  return NextResponse.json({
    role,
    tables: {
      cluster_telemetry: {
        accessible: profile.allowed_tables.includes("cluster_telemetry"),
        rows: profile.allowed_tables.includes("cluster_telemetry") ? CLUSTER_TELEMETRY : [],
      },
      telecom_cdr_metrics: {
        accessible: profile.allowed_tables.includes("telecom_cdr_metrics"),
        rows: profile.allowed_tables.includes("telecom_cdr_metrics") ? TELECOM_CDR_METRICS : [],
      },
      banking_risk_alerts: {
        accessible: profile.allowed_tables.includes("banking_risk_alerts"),
        rows: profile.allowed_tables.includes("banking_risk_alerts") ? BANKING_RISK_ALERTS : [],
      },
      executive_contracts: {
        accessible: profile.allowed_tables.includes("executive_contracts"),
        rows: profile.allowed_tables.includes("executive_contracts") ? EXECUTIVE_CONTRACTS : [],
      },
      incident_tickets: {
        accessible: profile.allowed_tables.includes("incident_tickets"),
        rows: profile.allowed_tables.includes("incident_tickets") ? INCIDENT_TICKETS : [],
      },
      audit_logs: {
        accessible: profile.allowed_tables.includes("audit_logs"),
        rows: profile.allowed_tables.includes("audit_logs") ? AUDIT_LOGS : [],
      },
    },
  });
}
