"use client";

import { useState } from "react";

export function CodeBlock({
  code,
  lang,
  filename,
}: {
  code: string;
  lang?: string;
  filename?: string;
}) {
  const [copied, setCopied] = useState(false);
  const showBar = Boolean(filename) || Boolean(lang);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; the code is selectable either way.
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
      {showBar ? (
        <div className="flex items-center gap-3 border-b border-neutral-800 px-4 py-2 pr-20">
          {filename ? (
            <span className="truncate font-mono text-xs text-neutral-300">
              {filename}
            </span>
          ) : null}
          {lang ? (
            <span className="ml-auto font-mono text-[11px] uppercase tracking-wide text-neutral-500">
              {lang}
            </span>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={copy}
        className={`absolute right-3 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-300 transition hover:bg-neutral-700 ${
          showBar ? "top-1.5" : "top-3"
        }`}
      >
        {copied ? "Copied" : "Copy"}
      </button>

      <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-neutral-100">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}
