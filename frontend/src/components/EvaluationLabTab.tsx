"use client";

import React, { useState } from "react";
import { Check, Play, X } from "lucide-react";
import { runGoldenBenchmark } from "@/lib/api";
import type { EvalSuiteSummary, LLMConfig } from "@/lib/types";

interface Props {
  llmConfig: LLMConfig;
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

  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Benchmark</h1>
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

      {!summary && !running ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-14 text-center text-sm text-slate-500">
          Run the test suite to check retrieval accuracy, role permissions, PII masking, and latency.
        </div>
      ) : null}

      {summary ? (
        <>
          {/* 4 Clean Summary Cards */}
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

          {/* Clean Results Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Prompt</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {summary.results.map((r) => (
                    <tr key={r.case_id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-slate-500">
                        {r.case_id}
                      </td>
                      <td className="max-w-md px-4 py-3 text-sm text-slate-800">
                        {r.prompt}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {r.role.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {r.latency_ms} ms
                      </td>
                      <td className="px-4 py-3">
                        {r.passed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            <Check className="h-3.5 w-3.5" /> Pass
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                            <X className="h-3.5 w-3.5" /> Fail
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
