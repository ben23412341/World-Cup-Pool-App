"use client";

import { useActionState } from "react";
import { findPool } from "./actions";
import type { FindPoolState } from "./actions";

export default function JoinPage() {
  const [state, action, pending] = useActionState<FindPoolState, FormData>(
    findPool,
    null
  );

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="font-display text-3xl text-text">Join a pool</h1>
      <p className="mt-2 text-sm text-text-muted">
        Enter the 6-character code shared by the pool organiser.
      </p>

      <form action={action} className="mt-8 space-y-6">
        {state?.error && (
          <div className="rounded-md border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss">
            {state.error}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="code" className="block text-sm font-medium text-text">
            Join code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            autoComplete="off"
            spellCheck={false}
            maxLength={6}
            placeholder="AB12CD"
            onChange={(e) => {
              e.target.value = e.target.value.toUpperCase();
            }}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-lg uppercase tracking-widest text-text placeholder:text-text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-bright disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Looking up…" : "Find pool"}
        </button>
      </form>
    </div>
  );
}
