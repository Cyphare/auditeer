"use client";

import React from "react";

function renderInlineFormatting(text: string): React.ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[A-Z]{2,6}-[A-Z0-9-]+\])/g;
  const parts = text.split(pattern);

  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={idx}
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-800"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (/^\[[A-Z]{2,6}-[A-Z0-9-]+\]$/.test(part)) {
      return (
        <span
          key={idx}
          className="mx-0.5 inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 font-mono text-xs font-medium text-blue-700 border border-blue-200/80"
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-2.5 text-[15px] leading-relaxed text-slate-700">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) return null;

        if (line.startsWith("### ")) {
          return (
            <h3 key={index} className="pt-1 text-base font-semibold text-slate-900">
              {renderInlineFormatting(line.slice(4))}
            </h3>
          );
        }

        if (line.startsWith("> ")) {
          return (
            <blockquote
              key={index}
              className="rounded-lg border-l-2 border-amber-400 bg-amber-50/70 px-3.5 py-2 text-sm text-amber-900"
            >
              {renderInlineFormatting(line.slice(2))}
            </blockquote>
          );
        }

        if (line.startsWith("- ")) {
          return (
            <div key={index} className="flex items-start gap-2.5">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <div className="flex-1">{renderInlineFormatting(line.slice(2))}</div>
            </div>
          );
        }

        return <p key={index}>{renderInlineFormatting(line)}</p>;
      })}
    </div>
  );
}
