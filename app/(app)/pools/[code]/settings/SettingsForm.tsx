'use client'

import { useActionState, useEffect, useState } from 'react'
import { CopyButton } from '@/components/pool/CopyButton'
import { updatePoolSettings, type UpdatePoolSettingsState } from './actions'

type Props = {
  poolCode: string
  name: string
  description: string | null
  locksAt: string | null
  status: string
  joinCode: string
  poolId: string
  createdAt: string
  lockCountdown: string | null
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function SettingsForm({
  poolCode,
  name,
  description,
  locksAt,
  status,
  joinCode,
  poolId,
  createdAt,
  lockCountdown,
}: Props) {
  const boundAction = updatePoolSettings.bind(null, poolCode)
  const [state, formAction, isPending] = useActionState<UpdatePoolSettingsState, FormData>(
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

  const locksEditable = status === 'draft' || status === 'open'

  return (
    <div className="space-y-10">
      {/* Settings form */}
      <form action={formAction} className="space-y-6">
        {/* Pool name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-text">
            Pool name <span className="text-loss">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={100}
            defaultValue={name}
            className="mt-1.5 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder-text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-text">
            Description{' '}
            <span className="text-text-subtle font-normal">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={500}
            defaultValue={description ?? ''}
            className="mt-1.5 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder-text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        {/* Lock time */}
        <div>
          <label
            htmlFor="locks_at"
            className={
              'block text-sm font-medium ' + (locksEditable ? 'text-text' : 'text-text-muted')
            }
          >
            Auto-lock deadline{' '}
            <span className="text-text-subtle font-normal">(optional)</span>
          </label>

          <input
            id="locks_at"
            name="locks_at"
            type="datetime-local"
            disabled={!locksEditable}
            defaultValue={toDatetimeLocal(locksAt)}
            className={
              'mt-1.5 block w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none ' +
              (locksEditable
                ? 'bg-surface text-text focus:border-primary focus:ring-1 focus:ring-primary'
                : 'bg-surface-elevated text-text-muted cursor-not-allowed')
            }
          />

          <p className="mt-1.5 text-xs text-text-subtle">
            {!locksEditable && (
              <>Lock time cannot be changed while the pool is {status}.</>
            )}
            {locksEditable && status === 'draft' && (
              <>Once you open the pool, entries will be locked automatically at this time.</>
            )}
            {locksEditable && status === 'open' && lockCountdown && (
              <span className="text-primary">{lockCountdown}</span>
            )}
            {locksEditable && status === 'open' && !lockCountdown && (
              <>No auto-lock set. Entries stay open until you lock manually.</>
            )}
          </p>
        </div>

        {/* Error / success */}
        {state?.error && (
          <p className="rounded-md border border-loss/30 bg-loss/10 px-4 py-2.5 text-sm text-loss">
            {state.error}
          </p>
        )}
        {showSuccess && (
          <p className="rounded-md border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm text-primary">
            Settings saved
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-bright disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving…' : 'Save settings'}
        </button>
      </form>

      {/* Read-only pool metadata */}
      <div className="border-t border-border pt-8">
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-subtle">
          Pool info
        </h2>
        <dl className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <dt className="text-sm text-text-muted">Join code</dt>
            <dd className="flex items-center gap-2">
              <span className="font-mono text-sm tracking-[0.15em] text-primary">
                {joinCode}
              </span>
              <CopyButton text={joinCode} />
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-sm text-text-muted">Pool ID</dt>
            <dd className="font-mono text-xs text-text-subtle break-all text-right">{poolId}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-text-muted">Created</dt>
            <dd className="text-sm text-text-subtle">
              {new Date(createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
