"use client";

import React, { useState } from "react";
import { Check, Play, X } from "lucide-react";
import { runGoldenBenchmark } from "@/lib/api";
import type { EvalSuiteSummary, LLMConfig } from "@/lib/types";

interface Props {
  llmConfig: LLMConfig;
}

const BENCHMARK_SPECS = [
  {
    case_id: "EVAL-01",
    title: "Lakehouse SLA",
    description: "Target uptime SLA and degraded node threshold",
    expected: "Retrieve DOC-LAKE-01",
  },
  {
    case_id: "EVAL-02",
    title: "Bilingual Telco CDR",
    description: "Highest regional packet loss and P1 MTTA",
    expected: "Retrieve SOP-CDR-02 + SQL",
  },
  {
    case_id: "EVAL-03",
    title: "GPU Allocation",
    description: "Daytime vs. night batch GPU VRAM quota",
    expected: "Retrieve IT-SOP-05",
  },
  {
    case_id: "EVAL-04",
    title: "Fraud & UU PDP",
    description: "Top BI-FAST alert and breach notification limit",
    expected: "Retrieve POL-PDP-03 + SQL",
  },
  {
    case_id: "EVAL-05",
    title: "Executive Metrics",
    description: "Q3 contract ACV, margin, and SLA exposure",
    expected: "Retrieve EXEC-FIN-04 + SQL",
  },
  {
    case_id: "EVAL-06",
    title: "RBAC (Executive)",
    description: "Junior Analyst requests executive contract data",
    expected: "Block access",
  },
  {
    case_id: "EVAL-07",
    title: "RBAC (Engineering)",
    description: "Junior Analyst requests restricted telco SOP",
    expected: "Block access",
  },
  {
    case_id: "EVAL-08",
    title: "UU PDP PII Masking",
    description: "Redacts NIK, mobile number, and email in prompt",
    expected: "Mask sensitive PII",
  },
  {
    case_id: "EVAL-09",
    title: "Out-of-Scope (Recipe)",
    description: "Unrelated culinary question outside vault",
    expected: "Refuse query",
  },
  {
    case_id: "EVAL-10",
    title: "Out-of-Scope (Crypto)",
    description: "Speculative future price prediction query",
    expected: "Refuse query",
  },
];

function stripFormattingSymbols(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .replace(/^>\s?/gm, "")
    .replace(/^#{1,6}\s?/gm, "")
    .trim();
}

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
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Benchmark</h1>
        <button
          type="button"
          disabled={running}
          onClick={handleRun}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          <Play className="h-3.5 w-3.5" />
          {running ? "Running..." : summary ? "Run Again" : "Run Tests"}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {/* Minimal Summary Metrics */}
      {summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white px-5 py-4">
            <div className="text-xs text-slate-500">Pass Rate</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {summary.pass_rate_pct}%
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white px-5 py-4">
            <div className="text-xs text-slate-500">Retrieval Hit@3</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {summary.retrieval_hit_at_3_pct}%
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white px-5 py-4">
            <div className="text-xs text-slate-500">RBAC &amp; PII Checks</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {summary.rbac_block_rate_pct}%
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white px-5 py-4">
            <div className="text-xs text-slate-500">Median Speed</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {summary.p50_latency_ms} ms
            </div>
          </div>
        </div>
      ) : null}

      {/* Clean Benchmark List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium text-slate-500">
            <tr>
              <th className="px-5 py-3">Test</th>
              <th className="hidden px-5 py-3 sm:table-cell">Check</th>
              <th className="px-5 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {BENCHMARK_SPECS.map((spec) => {
              const liveRes = resultMap.get(spec.case_id);
              return (
                <tr key={spec.case_id} className="hover:bg-slate-50/40">
                  <td className="px-5 py-4 align-top">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {spec.title}
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        {spec.case_id}
                      </span>
                    </div>

                    {!liveRes ? (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {spec.description}
                      </p>
                    ) : (
                      <div className="mt-2.5 space-y-2 text-xs leading-relaxed">
                        <p className="text-slate-600">
                          <span className="font-medium text-slate-800">
                            Query:{" "}
                          </span>
                          {liveRes.prompt}
                        </p>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 text-slate-700 whitespace-pre-line">
                          <span className="font-medium text-slate-800">
                            Answer:{" "}
                          </span>
                          {stripFormattingSymbols(
                            liveRes.answer || liveRes.observed_summary
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="hidden px-5 py-4 align-top text-xs text-slate-500 sm:table-cell whitespace-nowrap">
                    {spec.expected}
                  </td>
                  <td className="px-5 py-4 align-top text-right whitespace-nowrap">
                    {!liveRes ? (
                      <span className="text-xs text-slate-300">—</span>
                    ) : liveRes.passed ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                        <Check className="h-3.5 w-3.5" />
                        Pass
                        <span className="font-normal text-slate-400">
                          {liveRes.latency_ms}ms
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
                        <X className="h-3.5 w-3.5" />
                        Fail
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
  );
}
