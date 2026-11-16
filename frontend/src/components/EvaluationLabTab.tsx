"use client";

import React, { useState } from "react";
import { Check, ChevronDown, ChevronUp, Play, ShieldCheck, X } from "lucide-react";
import { runGoldenBenchmark } from "@/lib/api";
import type { EvalSuiteSummary, LLMConfig } from "@/lib/types";

interface Props {
  llmConfig: LLMConfig;
}

export function EvaluationLabTab({ llmConfig }: Props) {
  const [summary, setSummary] = useState<EvalSuiteSummary | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>("EVAL-01");

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await runGoldenBenchmark(llmConfig);
      setSummary(res);
      if (res.results.length > 0) {
        setExpandedCaseId(res.results[0].case_id);
      }
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
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Benchmark</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated 10-case golden evaluation suite for RAG, SQL, RBAC, and UU PDP guardrails.
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

      {!summary && !running ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-14 text-center text-sm text-slate-500">
          Click <strong className="text-slate-700">Run 10 Tests</strong> to verify retrieval accuracy, role permissions, PII masking, and latency.
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

          {/* Interactive Expandable Results List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium text-slate-500">
                Click any test case below to inspect verification proof & output
              </span>
            </div>

            {summary.results.map((r) => {
              const isExpanded = expandedCaseId === r.case_id;
              return (
                <div
                  key={r.case_id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300"
                >
                  {/* Summary Row */}
                  <div
                    onClick={() =>
                      setExpandedCaseId(isExpanded ? null : r.case_id)
                    }
                    className="flex cursor-pointer select-none flex-wrap items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50/70"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                        {r.case_id}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-blue-600">
                            {r.category}
                          </span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            Role: {r.role.replace("_", " ")}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-sm text-slate-800">
                          {r.prompt}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-slate-400">
                        {r.latency_ms} ms
                      </span>
                      {r.passed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          <Check className="h-3.5 w-3.5" /> Pass
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                          <X className="h-3.5 w-3.5" /> Fail
                        </span>
                      )}
                      <span className="text-slate-400">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Proof & Output Drawer */}
                  {isExpanded ? (
                    <div className="space-y-3.5 border-t border-slate-100 bg-slate-50/60 px-4 py-4 text-sm">
                      {/* Expected vs Observed */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-200/80 bg-white p-3">
                          <div className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                            Expected Target Behavior
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-700">
                            {r.expected_behavior}
                          </p>
                        </div>

                        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-emerald-700 uppercase">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Observed Verification Proof
                          </div>
                          <p className="mt-1 font-mono text-xs leading-relaxed text-emerald-900">
                            {r.observed_summary}
                          </p>
                        </div>
                      </div>

                      {/* Verification Pills */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700">
                          <strong>Top Doc Hit:</strong>{" "}
                          <span className="font-mono">
                            {r.top_doc_hit || "None (0 Citations)"}
                          </span>
                        </span>
                        <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700">
                          <strong>RBAC Gate:</strong>{" "}
                          {r.rbac_blocked
                            ? "Blocked Unauthorized Role"
                            : "Authorized"}
                        </span>
                        <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700">
                          <strong>UU PDP PII Masked:</strong>{" "}
                          {r.pii_masked_count ?? 0} item(s)
                        </span>
                      </div>

                      {/* Sanitized Prompt if PII was masked */}
                      {r.sanitized_prompt && r.sanitized_prompt !== r.prompt ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                          <div className="text-[11px] font-semibold tracking-wide text-amber-800 uppercase">
                            Sanitized Prompt (After UU PDP PII Masking)
                          </div>
                          <p className="mt-1 font-mono text-xs text-amber-900">
                            {r.sanitized_prompt}
                          </p>
                        </div>
                      ) : null}

                      {/* SQL Query if executed */}
                      {r.sql_query ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-900 p-3 text-slate-100">
                          <div className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                            Executed Safe Lakehouse SQL
                          </div>
                          <pre className="mt-1 overflow-x-auto font-mono text-xs text-blue-300">
                            {r.sql_query}
                          </pre>
                        </div>
                      ) : null}

                      {/* Actual Generated Answer */}
                      {r.answer ? (
                        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                          <div className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                            Actual Engine Output
                          </div>
                          <div className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-slate-800">
                            {r.answer}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
