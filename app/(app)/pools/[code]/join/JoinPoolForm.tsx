"use client";

import { useActionState } from "react";
import { joinPool } from "./actions";
import type { JoinPoolState } from "./actions";

export default function JoinPoolForm({
  poolId,
  poolCode,
  defaultDisplayName,
}: {
  poolId: string;
  poolCode: string;
  defaultDisplayName: string;
}) {
  const [state, action, pending] = useActionState<JoinPoolState, FormData>(
    joinPool,
    null
  );

  return (
    <form action={action} className="mt-8 space-y-6">
      <input type="hidden" name="pool_id" value={poolId} />
      <input type="hidden" name="pool_code" value={poolCode} />

      {state?.error && (
        <div className="rounded-md border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss">
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="display_name"
          className="block text-sm font-medium text-text"
        >
          Your display name in this pool
        </label>
        <p className="text-xs text-text-subtle">
          This is how you&apos;ll appear on the leaderboard.
        </p>
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          defaultValue={defaultDisplayName}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-text placeholder:text-text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-text">Which player referred you?</p>
          <p className="mt-0.5 text-xs text-text-subtle">Required — enter the name of the player who invited you.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="referred_by_first_name" className="block text-xs font-medium text-text-muted">
              First name
            </label>
            <input
              id="referred_by_first_name"
              name="referred_by_first_name"
              type="text"
              required
              autoComplete="off"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-text placeholder:text-text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="referred_by_last_name" className="block text-xs font-medium text-text-muted">
              Last name
            </label>
            <input
              id="referred_by_last_name"
              name="referred_by_last_name"
              type="text"
              required
              autoComplete="off"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-text placeholder:text-text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-bright disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Joining…" : "Join this pool"}
      </button>
    </form>
  );
}
