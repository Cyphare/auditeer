"use client";

import React, { useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  ChevronUp,
  FileText,
  Lock,
  TicketCheck,
} from "lucide-react";
import { sendChatMessage } from "@/lib/api";
import type { ChatResponse, LLMConfig, RoleType } from "@/lib/types";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface ConversationTurn {
  id: string;
  userPrompt: string;
  response: ChatResponse;
}

interface Props {
  activeRole: RoleType;
  llmConfig: LLMConfig;
}

const SAMPLE_PROMPTS = [
  {
    tag: "Telecom CDR",
    text: "Regional mana yang mengalami packet loss CDR tertinggi dan bagaimana eskalasi P1?",
  },
  {
    tag: "Action Dispatch",
    text: "Check degraded cluster nodes with CPU > 85% and open a P1 ticket.",
  },
  {
    tag: "RBAC Security",
    text: "Berapa nilai kontrak ACV Q3 dan gross margin pada laporan eksekutif?",
  },
  {
    tag: "UU PDP Compliance",
    text: "Cek aturan UU PDP untuk nasabah NIK 3404071205990002 HP 081234567890",
  },
];

export function CopilotWorkspace({ activeRole, llmConfig }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [openTraceIds, setOpenTraceIds] = useState<Record<string, boolean>>({});

  const toggleTrace = (id: string) => {
    setOpenTraceIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const executePrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setInput("");

    try {
      const resp = await sendChatMessage({
        message: trimmed,
        role: activeRole,
        llm_config: llmConfig,
        auto_action: true,
      });
      setTurns((prev) => [
        ...prev,
        { id: `turn-${Date.now()}`, userPrompt: trimmed, response: resp },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Empty State */}
      {turns.length === 0 && !loading ? (
        <div className="py-10">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Ask internal docs or operational data
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-xl">
            Query standard operating procedures, Lakehouse telemetry, and compliance rules in Indonesian or English.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SAMPLE_PROMPTS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => executePrompt(item.text)}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-400 hover:shadow-xs"
              >
                <span className="text-[11px] font-semibold tracking-wide text-blue-600 uppercase">
                  {item.tag}
                </span>
                <p className="mt-1 text-sm font-medium text-slate-800 group-hover:text-blue-900 leading-snug">
                  {item.text}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Conversation Stream */}
      {turns.length > 0 ? (
        <div className="space-y-6 pb-6">
          {turns.map((turn) => {
            const r = turn.response;
            const traceOpen = !!openTraceIds[turn.id];

            return (
              <div key={turn.id} className="space-y-3">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xs">
                    {turn.userPrompt}
                  </div>
                </div>

                {/* Assistant Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <MarkdownRenderer content={r.answer} />

                  {/* SQL Table if returned */}
                  {r.sql_result && r.sql_result.rows.length > 0 ? (
                    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                          <tr>
                            {r.sql_result.columns.slice(0, 6).map((col) => (
                              <th key={col} className="px-3.5 py-2">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                          {r.sql_result.rows.slice(0, 5).map((row, rIdx) => (
                            <tr key={rIdx}>
                              {r.sql_result!.columns.slice(0, 6).map((col) => (
                                <td key={col} className="px-3.5 py-2 font-mono">
                                  {String(row[col] ?? "")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {/* Created Ticket */}
                  {r.ticket_created ? (
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm">
                      <div className="flex items-center gap-2.5 text-emerald-950 font-medium">
                        <TicketCheck className="h-4 w-4 text-emerald-600" />
                        <span className="font-mono font-bold">
                          {r.ticket_created.ticket_id}
                        </span>
                        <span>— {r.ticket_created.title}</span>
                      </div>
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                        {r.ticket_created.priority}
                      </span>
                    </div>
                  ) : null}

                  {/* Subtle Footer: Sources + Expandable Trace */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {r.citations.map((c) => (
                        <span
                          key={c.chunk_id}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-slate-700 font-medium"
                        >
                          <FileText className="h-3 w-3 text-slate-400" />
                          <span className="font-mono">{c.doc_id}</span>
                        </span>
                      ))}
                      {r.rbac_blocked ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-rose-700 font-medium">
                          <Lock className="h-3 w-3" />
                          Restricted for {r.role_label}
                        </span>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleTrace(turn.id)}
                      className="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-slate-800"
                    >
                      <span>Trace ({r.total_latency_ms} ms)</span>
                      {traceOpen ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Clean Collapsible Trace (Only visible when clicked) */}
                  {traceOpen ? (
                    <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 border border-slate-200">
                      {r.trace.map((st) => (
                        <div
                          key={st.step}
                          className="flex items-start justify-between gap-4"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">
                              {st.step}. {st.title}:
                            </span>{" "}
                            <span>{st.detail}</span>
                          </div>
                          <span className="shrink-0 font-mono text-slate-400">
                            {st.latency_ms} ms
                          </span>
                        </div>
                      ))}

                      {r.sql_result ? (
                        <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-2.5 font-mono text-xs text-slate-100">
                          {r.sql_result.sql}
                        </pre>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {loading ? (
        <div className="py-4 text-sm font-medium text-slate-500">Thinking...</div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {/* Clean Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          executePrompt(input);
        }}
        className="sticky bottom-5 mt-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 bg-transparent px-3 py-2 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-35"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
