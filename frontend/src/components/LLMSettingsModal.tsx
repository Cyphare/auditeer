"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import type { LLMConfig, LLMProviderType } from "@/lib/types";

interface Props {
  isOpen: boolean;
  config: LLMConfig;
  onSave: (next: LLMConfig) => void;
  onClose: () => void;
}

const PROVIDERS: {
  id: LLMProviderType;
  title: string;
  subtitle: string;
  defaultModel: string;
}[] = [
  {
    id: "zero_key",
    title: "Local Grounded Engine",
    subtitle: "Works offline with no API key",
    defaultModel: "auditeer-grounded-v1",
  },
  {
    id: "ollama",
    title: "Ollama (On-Premise)",
    subtitle: "Local open-weights model",
    defaultModel: "qwen2.5:7b",
  },
  {
    id: "gemini",
    title: "Google Gemini",
    subtitle: "Cloud API",
    defaultModel: "gemini-2.5-flash",
  },
  {
    id: "openai",
    title: "OpenAI / vLLM",
    subtitle: "OpenAI-compatible endpoint",
    defaultModel: "gpt-4o-mini",
  },
];

export function LLMSettingsModal({ isOpen, config, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<LLMConfig>(config);

  if (!isOpen) return null;

  const selectProvider = (id: LLMProviderType, defaultModel: string) => {
    setDraft((prev) => ({
      ...prev,
      provider: id,
      model: defaultModel,
      base_url:
        id === "ollama"
          ? "http://localhost:11434"
          : id === "openai"
          ? "https://api.openai.com/v1"
          : "",
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-base font-semibold text-slate-900">
            Model Settings
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {PROVIDERS.map((p) => {
            const active = draft.provider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selectProvider(p.id, p.defaultModel)}
                className={`rounded-xl border p-3.5 text-left transition ${
                  active
                    ? "border-blue-600 bg-blue-50/50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="text-sm font-semibold text-slate-900">
                  {p.title}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">{p.subtitle}</div>
              </button>
            );
          })}
        </div>

        {draft.provider !== "zero_key" ? (
          <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 border border-slate-200/80">
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Model Name
              </label>
              <input
                type="text"
                value={draft.model || ""}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, model: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {draft.provider === "ollama" || draft.provider === "openai" ? (
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Base URL
                </label>
                <input
                  type="text"
                  value={draft.base_url || ""}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, base_url: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
            ) : null}

            {draft.provider === "gemini" || draft.provider === "openai" ? (
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  API Key (optional if set in .env)
                </label>
                <input
                  type="password"
                  value={draft.api_key || ""}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, api_key: e.target.value }))
                  }
                  placeholder="sk-..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
