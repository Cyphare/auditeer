"use client";

import React, { useEffect, useState } from "react";
import { Lock, Plus, Search, X } from "lucide-react";
import {
  fetchDocuments,
  ingestDocument,
  searchVaultChunks,
} from "@/lib/api";
import type {
  CitationChunk,
  ClearanceLevel,
  RoleType,
  VaultDocument,
} from "@/lib/types";

interface Props {
  activeRole: RoleType;
  onVaultUpdated?: () => void;
}

export function KnowledgeVaultTab({ activeRole, onVaultUpdated }: Props) {
  const [docs, setDocs] = useState<VaultDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Optional Search
  const [searchQuery, setSearchQuery] = useState("");
  const [authHits, setAuthHits] = useState<CitationChunk[]>([]);
  const [blockedHits, setBlockedHits] = useState<CitationChunk[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Collapsible Add Document Panel
  const [showAddForm, setShowAddForm] = useState(false);
  const [docId, setDocId] = useState("SOP-VTS-06");
  const [title, setTitle] = useState("SOP Kalibrasi Radar Maritim VTS");
  const [category, setCategory] = useState("Operations SOP");
  const [clearance, setClearance] = useState<ClearanceLevel>("ENGINEERING");
  const [content, setContent] = useState(
    "## Kalibrasi Frekuensi\nSetiap stasiun VTS wajib melakukan kalibrasi antena setiap 14 hari dengan batas deviasi 0.03 dB."
  );
  const [ingestMsg, setIngestMsg] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);

  const loadVault = async () => {
    setLoadingDocs(true);
    try {
      const data = await fetchDocuments(activeRole);
      setDocs(data.documents);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadVault();
    setHasSearched(false);
    setAuthHits([]);
    setBlockedHits([]);
  }, [activeRole]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setHasSearched(false);
      return;
    }
    const res = await searchVaultChunks({
      query: searchQuery,
      role: activeRole,
      top_k: 4,
    });
    setAuthHits(res.authorized_chunks);
    setBlockedHits(res.blocked_chunks);
    setHasSearched(true);
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngesting(true);
    setIngestMsg(null);
    try {
      const res = await ingestDocument({
        doc_id: docId,
        title,
        category,
        clearance,
        owner: "Internal Team",
        content,
      });
      setIngestMsg(`Saved ${res.doc_id} (${res.chunk_count} sections).`);
      await loadVault();
      onVaultUpdated?.();
      setShowAddForm(false);
    } catch (err) {
      setIngestMsg(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Documents</h1>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAddForm ? "Close" : "Add Document"}
        </button>
      </div>

      {ingestMsg ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          {ingestMsg}
        </div>
      ) : null}

      {/* Collapsible Add Document Form */}
      {showAddForm ? (
        <form
          onSubmit={handleIngest}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Doc ID
              </label>
              <input
                type="text"
                required
                value={docId}
                onChange={(e) => setDocId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Category
              </label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Access Level
              </label>
              <select
                value={clearance}
                onChange={(e) => setClearance(e.target.value as ClearanceLevel)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="PUBLIC_INTERNAL">Public Internal</option>
                <option value="ENGINEERING">Engineering</option>
                <option value="COMPLIANCE">Compliance</option>
                <option value="EXECUTIVE">Executive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">
              Content (Markdown)
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-mono text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={ingesting}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {ingesting ? "Indexing..." : "Save & Index"}
            </button>
          </div>
        </form>
      ) : null}

      {/* Simple Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Test search across indexed sections..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-4 pl-10 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Search
        </button>
      </form>

      {/* Search Results (Only if searched) */}
      {hasSearched ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Search results</span>
            <button
              type="button"
              onClick={() => {
                setHasSearched(false);
                setSearchQuery("");
              }}
              className="text-blue-600 hover:underline"
            >
              Clear
            </button>
          </div>
          {authHits.length === 0 && blockedHits.length === 0 ? (
            <p className="text-sm text-slate-500">No matching sections.</p>
          ) : null}
          {authHits.map((c) => (
            <div
              key={c.chunk_id}
              className="rounded-xl border border-blue-200/80 bg-white p-4"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-blue-700">
                  {c.doc_id} · {c.section}
                </span>
                <span className="font-mono text-slate-400">
                  RRF {c.rrf_score}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                {c.snippet}
              </p>
            </div>
          ))}
          {blockedHits.map((b) => (
            <div
              key={b.chunk_id}
              className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-sm text-rose-800"
            >
              <span className="font-mono font-semibold">{b.doc_id}</span> — Restricted ({b.clearance})
            </div>
          ))}
        </div>
      ) : null}

      {/* Clean Document List */}
      <div className="space-y-3">
        {loadingDocs ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : (
          docs.map((doc) => (
            <div
              key={doc.doc_id}
              className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-700">
                    {doc.doc_id}
                  </span>
                  <h2 className="text-[15px] font-semibold text-slate-900">
                    {doc.title}
                  </h2>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    doc.accessible
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {!doc.accessible ? <Lock className="h-3 w-3" /> : null}
                  {doc.clearance}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {doc.preview}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
