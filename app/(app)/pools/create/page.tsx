"use client";

import { useActionState } from "react";
import { createPool } from "./actions";
import type { CreatePoolState } from "./actions";

export default function CreatePoolPage() {
  const [state, action, pending] = useActionState<CreatePoolState, FormData>(
    createPool,
    null
  );

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-3xl text-text">Create a pool</h1>
      <p className="mt-2 text-sm text-text-muted">
        Set up your pool, then share the join code with participants.
      </p>

      <form action={action} className="mt-8 space-y-6">
        {state?.error && (
          <div className="rounded-md border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss">
            {state.error}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-sm font-medium text-text">
            Pool name <span className="text-loss">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            minLength={3}
            placeholder="e.g. The Lads' World Cup Pool"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-text placeholder:text-text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-text"
          >
            Description{" "}
            <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="A note for participants — prize info, house rules, etc."
            className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-text placeholder:text-text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="locks_at"
            className="block text-sm font-medium text-text"
          >
            Entry deadline <span className="text-loss">*</span>
          </label>
          <p className="text-xs text-text-subtle">
            Entries become read-only at this time. You can set this before the first match if needed.
          </p>
          <input
            id="locks_at"
            name="locks_at"
            type="datetime-local"
            required
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-bright disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create pool"}
        </button>
      </form>
    </div>
  );
}
