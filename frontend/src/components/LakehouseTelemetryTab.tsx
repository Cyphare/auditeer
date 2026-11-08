"use client";

import React, { useEffect, useState } from "react";
import { Lock, Play, RefreshCw } from "lucide-react";
import { executeCustomSQL, fetchLakehouseSnapshot } from "@/lib/api";
import type { RoleType, SQLQueryResult } from "@/lib/types";

interface Props {
  activeRole: RoleType;
}

const TABLE_LABELS: Record<string, string> = {
  cluster_telemetry: "Cluster Nodes",
  telecom_cdr_metrics: "Telecom CDR",
  banking_risk_alerts: "Banking Alerts",
  executive_contracts: "Contracts",
  incident_tickets: "Tickets",
  audit_logs: "Audit Log",
};

export function LakehouseTelemetryTab({ activeRole }: Props) {
  const [tables, setTables] = useState<
    Record<string, { accessible: boolean; rows: Record<string, string | number>[] }>
  >({});
  const [selectedTable, setSelectedTable] = useState<string>("cluster_telemetry");
  const [loading, setLoading] = useState(false);

  const [showSqlBox, setShowSqlBox] = useState(false);
  const [sqlInput, setSqlInput] = useState(
    "SELECT node_id, region, cpu_pct, latency_ms, status FROM cluster_telemetry ORDER BY cpu_pct DESC"
  );
  const [sqlResult, setSqlResult] = useState<SQLQueryResult | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);

  const loadSnapshot = async () => {
    setLoading(true);
    try {
      const snap = await fetchLakehouseSnapshot(activeRole);
      setTables(snap.tables);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshot();
    setSqlError(null);
    setSqlResult(null);
  }, [activeRole]);

  const runSQL = async (e: React.FormEvent) => {
    e.preventDefault();
    setSqlError(null);
    setSqlResult(null);
    try {
      const res = await executeCustomSQL({ sql: sqlInput, role: activeRole });
      setSqlResult(res);
    } catch (err) {
      setSqlError(err instanceof Error ? err.message : "Query blocked");
    }
  };

  const activeTableObj = tables[selectedTable];
  const rows = activeTableObj?.rows || [];
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Operational Data</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSqlBox((v) => !v)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {showSqlBox ? "Hide SQL" : "SQL Query"}
          </button>
          <button
            type="button"
            onClick={loadSnapshot}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Optional SQL Bar */}
      {showSqlBox ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <form onSubmit={runSQL} className="flex gap-2">
            <input
              type="text"
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Play className="h-3.5 w-3.5" />
              Run
            </button>
          </form>

          {sqlError ? (
            <div className="rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 border border-rose-200">
              {sqlError}
            </div>
          ) : null}

          {sqlResult ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                  <tr>
                    {sqlResult.columns.map((c) => (
                      <th key={c} className="px-4 py-2.5">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[13px] text-slate-700">
                  {sqlResult.rows.map((r, i) => (
                    <tr key={i}>
                      {sqlResult.columns.map((c) => (
                        <td key={c} className="px-4 py-2.5">
                          {String(r[c] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Table Selector Pills */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(tables).map(([tblName, info]) => {
          const active = selectedTable === tblName;
          return (
            <button
              key={tblName}
              type="button"
              onClick={() => setSelectedTable(tblName)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                active
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {!info.accessible ? <Lock className="h-3.5 w-3.5 opacity-70" /> : null}
              <span>{TABLE_LABELS[tblName] || tblName}</span>
            </button>
          );
        })}
      </div>

      {/* Table View */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        {activeTableObj && !activeTableObj.accessible ? (
          <div className="flex items-center gap-2.5 p-8 text-sm text-slate-600">
            <Lock className="h-4 w-4 text-rose-500" />
            <span>
              Your current role does not have access to{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                {selectedTable}
              </code>
              .
            </span>
          </div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No rows found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                <tr>
                  {cols.map((c) => (
                    <th key={c} className="px-4 py-3">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px] text-slate-700">
                {rows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    {cols.map((c) => (
                      <td key={c} className="px-4 py-3 font-mono">
                        {String(r[c] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
