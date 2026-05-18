"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeEntry } from "./actions";

export function RemoveEntryClient({
  entryId,
  poolCode,
  displayName,
  teamCount,
  submittedAt,
}: {
  entryId: string;
  poolCode: string;
  displayName: string;
  teamCount: number;
  submittedAt: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [nameInput, setNameInput] = useState("");
  const [checked, setChecked] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const nameMatches = nameInput.trim().toLowerCase() === displayName.toLowerCase();
  const canConfirm = nameMatches && checked;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canConfirm) return;
    setError(null);
    startTransition(async () => {
      const result = await removeEntry(entryId);
      if ("error" in result) {
        setError(result.error);
      } else {
        router.push(result.redirectTo);
        router.refresh();
      }
    });
  }

  if (step === 1) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-red-800/40 bg-red-900/10 p-5">
          <h2 className="font-semibold text-red-300">You are about to remove an entry</h2>
          <p className="mt-2 text-sm text-text-muted">
            You are about to permanently remove{" "}
            <span className="font-medium text-text">{displayName}</span> from this pool.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-text-muted list-disc list-inside">
            <li>{teamCount} team {teamCount === 1 ? "pick" : "picks"} will be deleted</li>
            <li>All tiebreaker answers will be deleted</li>
            <li>All bonus answers will be deleted</li>
            <li>Their standings will be removed</li>
            {submittedAt && (
              <li>
                Entry was submitted on{" "}
                {new Date(submittedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                })}
              </li>
            )}
          </ul>
          <p className="mt-3 text-sm font-medium text-red-400">This cannot be undone.</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="rounded-md bg-red-700/80 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Continue to remove →
          </button>
          <a
            href={`/pools/${poolCode}/entries/${entryId}`}
            className="text-sm text-text-muted hover:text-text"
          >
            Cancel
          </a>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-sm text-text-muted">
            Still sure? Once removed,{" "}
            <span className="font-medium text-text">{displayName}</span> will need to re-join the
            pool and create a new entry if they want to participate.
          </p>
          <p className="mt-3 text-sm text-text-muted">
            If this was accidental, click Cancel now.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setStep(3)}
            className="rounded-md bg-red-700/80 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Yes, I want to remove this entry →
          </button>
          <a
            href={`/pools/${poolCode}/entries/${entryId}`}
            className="text-sm text-text-muted hover:text-text"
          >
            Cancel
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-red-800/40 bg-red-900/10 p-5">
        <p className="text-sm font-medium text-red-300">Final confirmation required</p>
        <p className="mt-2 text-sm text-text-muted">
          This is the last step. Type the entry name exactly to confirm removal.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-text-muted">
            Type <span className="font-medium text-text">{displayName}</span> to confirm
          </label>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder={displayName}
            autoComplete="off"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder-text-subtle focus:border-red-700 focus:outline-none"
          />
          {nameInput.length > 0 && !nameMatches && (
            <p className="mt-1 text-xs text-red-400">Name doesn't match — check capitalisation.</p>
          )}
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-border accent-red-600"
          />
          <span className="text-sm text-text-muted">
            I understand this permanently removes{" "}
            <span className="font-medium text-text">{displayName}</span>'s entry and all associated
            data. This action cannot be undone.
          </span>
        </label>
      </div>

      {error && (
        <p className="rounded-md border border-red-800/40 bg-red-900/10 px-4 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={!canConfirm || isPending}
          className="rounded-md bg-red-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "Removing…" : "Remove entry permanently"}
        </button>
        <a
          href={`/pools/${poolCode}/entries/${entryId}`}
          className="text-sm text-text-muted hover:text-text"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
