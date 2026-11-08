"use client";

import React, { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { fetchHealth } from "@/lib/api";
import type { LLMConfig, RoleMetadata, RoleType } from "@/lib/types";
import { CopilotWorkspace } from "@/components/CopilotWorkspace";
import { KnowledgeVaultTab } from "@/components/KnowledgeVaultTab";
import { LakehouseTelemetryTab } from "@/components/LakehouseTelemetryTab";
import { EvaluationLabTab } from "@/components/EvaluationLabTab";
import { LLMSettingsModal } from "@/components/LLMSettingsModal";

type ActiveTab = "copilot" | "vault" | "lakehouse" | "evaluation";

const FALLBACK_ROLES: RoleMetadata[] = [
  {
    role: "junior_analyst",
    label: "Junior Analyst",
    department: "BI & Reporting",
    allowed_clearances: ["PUBLIC_INTERNAL"],
    allowed_tables: ["cluster_telemetry", "incident_tickets"],
    can_create_tickets: false,
    badge_color: "amber",
  },
  {
    role: "data_engineer",
    label: "Data Engineer",
    department: "Platform Engineering",
    allowed_clearances: ["PUBLIC_INTERNAL", "ENGINEERING"],
    allowed_tables: ["cluster_telemetry", "telecom_cdr_metrics", "incident_tickets"],
    can_create_tickets: true,
    badge_color: "cyan",
  },
  {
    role: "compliance_officer",
    label: "Compliance Officer",
    department: "Risk & Privacy",
    allowed_clearances: ["PUBLIC_INTERNAL", "COMPLIANCE"],
    allowed_tables: ["banking_risk_alerts", "incident_tickets", "audit_logs"],
    can_create_tickets: true,
    badge_color: "emerald",
  },
  {
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
];

const MODEL_LABELS: Record<string, string> = {
  zero_key: "Local Engine",
  ollama: "Ollama",
  gemini: "Gemini",
  openai: "OpenAI",
};

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("copilot");
  const [activeRole, setActiveRole] = useState<RoleType>("data_engineer");
  const [roles, setRoles] = useState<RoleMetadata[]>(FALLBACK_ROLES);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({
    provider: "zero_key",
    model: "auditeer-grounded-v1",
  });

  const refreshHealth = async () => {
    try {
      const h = await fetchHealth();
      setBackendOnline(true);
      if (h.roles?.length) setRoles(h.roles);
    } catch {
      setBackendOnline(false);
    }
  };

  useEffect(() => {
    refreshHealth();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Simple, Clean Single-Row Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                backendOnline === false ? "bg-rose-500" : "bg-blue-600"
              }`}
            />
            <span className="text-[15px] font-bold tracking-tight text-slate-900">
              Auditeer
            </span>
          </div>

          {/* Minimal Navigation */}
          <nav className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {[
              { id: "copilot", label: "Assistant" },
              { id: "vault", label: "Documents" },
              { id: "lakehouse", label: "Data" },
              { id: "evaluation", label: "Benchmark" },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Role & Model Controls */}
          <div className="flex items-center gap-2">
            <select
              aria-label="Active Role"
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as RoleType)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              {roles.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <span>{MODEL_LABELS[llmConfig.provider] || llmConfig.provider}</span>
              <Settings2 className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-5 py-8">
        {activeTab === "copilot" ? (
          <CopilotWorkspace activeRole={activeRole} llmConfig={llmConfig} />
        ) : null}
        {activeTab === "vault" ? (
          <KnowledgeVaultTab activeRole={activeRole} onVaultUpdated={refreshHealth} />
        ) : null}
        {activeTab === "lakehouse" ? (
          <LakehouseTelemetryTab activeRole={activeRole} />
        ) : null}
        {activeTab === "evaluation" ? (
          <EvaluationLabTab llmConfig={llmConfig} />
        ) : null}
      </main>

      <LLMSettingsModal
        isOpen={settingsOpen}
        config={llmConfig}
        onSave={setLlmConfig}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
