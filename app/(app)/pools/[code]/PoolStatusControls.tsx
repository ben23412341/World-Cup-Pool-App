'use client'

import { useState, useEffect } from 'react'
import { openPool, lockPool, completePool, revertStatus } from './actions'
const UNDO_WINDOW_MS = 5 * 60 * 1000

type Props = {
  poolCode: string
  status: string
  statusChangedAt: string | null
  previousStatus: string | null
}

function formatMs(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function PoolStatusControls({ poolCode, status, statusChangedAt, previousStatus }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [msLeft, setMsLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!statusChangedAt || !previousStatus) {
      setMsLeft(null)
      return
    }

    const deadline = new Date(statusChangedAt).getTime() + UNDO_WINDOW_MS

    function tick() {
      const remaining = deadline - Date.now()
      setMsLeft(remaining > 0 ? remaining : 0)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [statusChangedAt, previousStatus])

  async function run(action: () => Promise<{ error?: string }>) {
    setPending(true)
    setError(null)
    const result = await action()
    setPending(false)
    if (result.error) setError(result.error)
  }

  const canUndo = msLeft !== null && msLeft > 0

  return (
    <div className="mt-4 border-t border-border pt-4">
      {error && <p className="mb-3 text-sm text-[#C44545]">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        {status === 'draft' && (
          <button
            onClick={() => run(() => openPool(poolCode))}
            disabled={pending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-bright disabled:opacity-50"
          >
            Open pool for entries
          </button>
        )}

        {status === 'open' && (
          <button
            onClick={() => {
              if (
                !window.confirm(
                  'Lock this pool? No new entries or edits will be allowed.'
                )
              )
                return
              run(() => lockPool(poolCode))
            }}
            disabled={pending}
            className="rounded-md border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface-elevated hover:text-text disabled:opacity-50"
          >
            Lock pool now
          </button>
        )}

        {status === 'locked' && (
          <button
            onClick={() => {
              if (!window.confirm('Mark this pool as completed? This is final.')) return
              run(() => completePool(poolCode))
            }}
            disabled={pending}
            className="rounded-md border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface-elevated hover:text-text disabled:opacity-50"
          >
            Mark pool completed
          </button>
        )}

        {canUndo && (
          <span className="flex items-center gap-2">
            <span className="text-xs text-text-subtle tabular-nums">
              Undo available — {formatMs(msLeft!)}
            </span>
            <button
              onClick={() => run(() => revertStatus(poolCode))}
              disabled={pending}
              className="rounded px-3 py-1.5 text-xs text-text-muted underline underline-offset-2 transition-colors hover:text-text disabled:opacity-50"
            >
              Undo
            </button>
          </span>
        )}
      </div>
    </div>
  )
}
