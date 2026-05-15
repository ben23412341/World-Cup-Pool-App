'use client'

import { useActionState, useEffect, useState } from 'react'
import { updateActualTiebreakers, type TiebreakersState } from './actions'

type Props = {
  poolCode: string
  actualTotalGoals: number | null
  actualFinalMinute: number | null
}

export function TiebreakersForm({ poolCode, actualTotalGoals, actualFinalMinute }: Props) {
  const boundAction = updateActualTiebreakers.bind(null, poolCode)
  const [state, formAction, isPending] = useActionState<TiebreakersState, FormData>(
    boundAction,
    null
  )

  const [showSuccess, setShowSuccess] = useState(false)
  useEffect(() => {
    if (!state?.success) return
    setShowSuccess(true)
    const t = setTimeout(() => setShowSuccess(false), 3000)
    return () => clearTimeout(t)
  }, [state])

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label htmlFor="total_goals" className="block text-sm font-medium text-text">
          Total goals scored (all 104 matches)
        </label>
        <p className="mt-0.5 text-xs text-text-subtle">
          Do not count goals scored during penalty shootouts.
        </p>
        <input
          id="total_goals"
          name="total_goals"
          type="number"
          min="0"
          step="1"
          defaultValue={actualTotalGoals ?? ''}
          placeholder="e.g. 165"
          className="mt-2 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder-text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <label htmlFor="first_goal_minute" className="block text-sm font-medium text-text">
          Minute of first goal in the Final
        </label>
        <p className="mt-0.5 text-xs text-text-subtle">
          Use the match minute (e.g. 23 for a goal in the 23rd minute). Leave blank if unknown.
        </p>
        <input
          id="first_goal_minute"
          name="first_goal_minute"
          type="number"
          min="0"
          step="1"
          defaultValue={actualFinalMinute ?? ''}
          placeholder="e.g. 23"
          className="mt-2 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder-text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {state?.error && (
        <p className="rounded-md border border-loss/30 bg-loss/10 px-4 py-2.5 text-sm text-loss">
          {state.error}
        </p>
      )}
      {showSuccess && (
        <p className="rounded-md border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm text-primary">
          Tiebreakers saved — standings recomputed.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-bright disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Saving…' : 'Save tiebreakers'}
      </button>
    </form>
  )
}
