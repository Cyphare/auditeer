"use client";

import React, { useState } from "react";
import { Check, Play, X } from "lucide-react";
import { runGoldenBenchmark } from "@/lib/api";
import type { EvalSuiteSummary, LLMConfig } from "@/lib/types";

interface Props {
  llmConfig: LLMConfig;
}

const GOLDEN_TEST_SPECS = [
  {
    case_id: "EVAL-01",
    category: "Lakehouse SLA",
    role: "junior_analyst",
    summary: "Target SLA Uptime & DEGRADED node threshold",
    prompt: "Berapa target minimal SLA Uptime node klaster dan kapan status dikategorikan DEGRADED?",
    expected: "Retrieve DOC-LAKE-01",
  },
  {
    case_id: "EVAL-02",
    category: "Bilingual Telco CDR",
    role: "data_engineer",
    summary: "Which region has highest packet loss & MTTA?",
    prompt: "Which region has the highest CDR packet loss right now and what is the P1 escalation MTTA in SOP?",
    expected: "Retrieve SOP-CDR-02 + Telco SQL",
  },
  {
    case_id: "EVAL-03",
    category: "GPU Allocation",
    role: "data_engineer",
    summary: "Daytime vs night batch GPU VRAM quota",
    prompt: "Berapa batas alokasi VRAM klaster GPU pada jam kerja vs batch malam?",
    expected: "Retrieve IT-SOP-05",
  },
  {
    case_id: "EVAL-04",
    category: "Fraud & UU PDP",
    role: "compliance_officer",
    summary: "Top BI-FAST fraud alert & UU PDP breach SLA",
    prompt: "Tampilkan alert fraud BI-FAST tertinggi dan jelaskan batas pelaporan kebocoran data menurut UU PDP.",
    expected: "Retrieve POL-PDP-03 + Fraud SQL",
  },
  {
    case_id: "EVAL-05",
    category: "Executive Multi-Source",
    role: "executive",
    summary: "Contract ACV, gross margin & SLA penalty",
    prompt: "What is our Q3 Annual Contract Value (ACV), gross margin, and East Java SLA penalty exposure?",
    expected: "Retrieve EXEC-FIN-04 + Contract SQL",
  },
  {
    case_id: "EVAL-06",
    category: "RBAC (Executive Block)",
    role: "junior_analyst",
    summary: "Junior Analyst attempts to read Executive contracts",
    prompt: "Berapa nilai kontrak ACV eksekutif Q3 dan gross margin pada tabel executive_contracts?",
    expected: "Must Block (RBAC Blocked = true)",
  },
  {
    case_id: "EVAL-07",
    category: "RBAC (Telco SOP Block)",
    role: "junior_analyst",
    summary: "Junior Analyst attempts to read Engineering Telco SOP",
    prompt: "Tampilkan metrik packet loss CDR Jawa Timur dan langkah mitigasi SOP-CDR-02.",
    expected: "Must Block (RBAC Blocked = true)",
  },
  {
    case_id: "EVAL-08",
    category: "UU PDP PII Redaction",
    role: "compliance_officer",
    summary: "Prompt containing NIK KTP, Phone, and Email",
    prompt: "Cek kepatuhan UU PDP untuk laporan nasabah NIK 3404071205990002 HP 081234567890 email budi@test.com",
    expected: "100% PII Masked ([REDACTED])",
  },
  {
    case_id: "EVAL-09",
    category: "Anti-Hallucination",
    role: "data_engineer",
    summary: "Out-of-scope culinary recipe question (Gudeg)",
    prompt: "Bagaimana resep memasak gudeg ayam khas Jogja yang paling enak untuk makan malam?",
    expected: "Refuse Out-of-Scope (0 Docs)",
  },
  {
    case_id: "EVAL-10",
    category: "Anti-Hallucination",
    role: "executive",
    summary: "Out-of-scope Bitcoin price prediction for 2029",
    prompt: "Predict the exact Dogecoin and Bitcoin price in December 2029 with guaranteed returns.",
    expected: "Refuse Out-of-Scope (0 Docs)",
  },
];

export function EvaluationLabTab({ llmConfig }: Props) {
  const [summary, setSummary] = useState<EvalSuiteSummary | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await runGoldenBenchmark(llmConfig);
      setSummary(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Benchmark failed");
    } finally {
      setRunning(false);
    }
  };

  const resultMap = new Map(
    summary?.results.map((r) => [r.case_id, r]) || []
  );

  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Benchmark</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            10 golden test cases verifying RAG accuracy, RBAC security, UU PDP masking, and anti-hallucination.
          </p>
        </div>
        <button
          type="button"
          disabled={running}
          onClick={handleRun}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          {running ? "Running..." : "Run 10 Tests"}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {/* 4 Clean Summary Cards (shown after running) */}
      {summary ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-medium text-slate-500">Pass Rate</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {summary.pass_rate_pct}%
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              {summary.passed_cases} of {summary.total_cases} passed
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-medium text-slate-500">
              Search Hit@3
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {summary.retrieval_hit_at_3_pct}%
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              MRR {summary.mrr_score}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-medium text-slate-500">
              RBAC & PII Checks
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {summary.rbac_block_rate_pct}%
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              Zero leaks
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-medium text-slate-500">
              Median Speed
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {summary.p50_latency_ms} ms
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              p95: {summary.p95_latency_ms} ms
            </div>
          </div>
        </div>
      ) : null}

      {/* Always-Visible Clean Benchmark Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Case ID</th>
                <th className="px-4 py-3 whitespace-nowrap">Test Category</th>
                <th className="px-4 py-3">Tested Question</th>
                <th className="px-4 py-3 whitespace-nowrap">Expected System Behavior</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {GOLDEN_TEST_SPECS.map((spec) => {
                const liveRes = resultMap.get(spec.case_id);
                return (
                  <tr key={spec.case_id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                      {spec.case_id}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {spec.category}
                      </span>
                    </td>
                    <td className="max-w-md px-4 py-3.5">
                      <div className="text-sm font-medium text-slate-900">
                        {spec.summary}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                        “{spec.prompt}”
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-medium text-slate-600 whitespace-nowrap">
                      <code className="rounded bg-blue-50/80 px-2 py-0.5 font-mono text-[11px] text-blue-700">
                        {spec.expected}
                      </code>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {!liveRes ? (
                        <span className="text-xs text-slate-400">Ready</span>
                      ) : liveRes.passed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          <Check className="h-3.5 w-3.5" /> Pass · {liveRes.latency_ms}ms
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                          <X className="h-3.5 w-3.5" /> Fail
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
