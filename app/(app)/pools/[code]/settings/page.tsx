import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from './SettingsForm'

function formatLockCountdown(locksAt: string): string | null {
  const msLeft = new Date(locksAt).getTime() - Date.now()
  if (msLeft <= 0) return null

  const days = Math.floor(msLeft / (1000 * 60 * 60 * 24))
  const hours = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60))

  const parts: string[] = []
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`)
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`)
  if (days === 0 && minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`)

  return parts.length > 0 ? `Auto-locks in ${parts.join(' ')}` : 'Auto-locks in less than a minute'
}

export default async function PoolSettingsPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: pool } = await supabase
    .from('pools')
    .select('id, name, description, join_code, owner_id, status, locks_at, created_at')
    .eq('join_code', code.toUpperCase())
    .single()

  if (!pool) notFound()

  if (pool.owner_id !== user?.id) {
    redirect(`/pools/${pool.join_code}`)
  }

  const lockCountdown =
    pool.status === 'open' && pool.locks_at
      ? formatLockCountdown(pool.locks_at)
      : null

  return (
    <div className="mx-auto max-w-[600px]">
      {/* Back link */}
      <Link
        href={`/pools/${pool.join_code}`}
        className="text-sm text-text-muted transition-colors hover:text-text"
      >
        ← {pool.name}
      </Link>

      <h1 className="mt-4 font-display text-3xl text-text">Pool settings</h1>

      <div className="mt-8">
        <SettingsForm
          poolCode={pool.join_code}
          name={pool.name}
          description={pool.description}
          locksAt={pool.locks_at}
          status={pool.status}
          joinCode={pool.join_code}
          poolId={pool.id}
          createdAt={pool.created_at}
          lockCountdown={lockCountdown}
        />
      </div>
    </div>
  )
}
