"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
