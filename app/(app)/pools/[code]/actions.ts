'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const UNDO_WINDOW_MS = 5 * 60 * 1000

async function getPoolAndVerifyOwner(poolCode: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const { data: pool } = await supabase
    .from('pools')
    .select('id, status, owner_id, locks_at, status_changed_at, previous_status')
    .eq('join_code', poolCode.toUpperCase())
    .maybeSingle()

  if (!pool) return { error: 'Pool not found' as const }
  if (pool.owner_id !== user.id) return { error: 'Not authorized' as const }

  return { pool, supabase }
}

export async function openPool(poolCode: string): Promise<{ error?: string }> {
  const result = await getPoolAndVerifyOwner(poolCode)
  if ('error' in result) return { error: result.error }
  const { pool, supabase } = result

  if (pool.status !== 'draft') {
    return { error: 'Pool can only be opened from draft status.' }
  }

  const { count } = await supabase
    .from('pool_teams')
    .select('*', { count: 'exact', head: true })
    .eq('pool_id', pool.id)

  if (!count || count === 0) {
    return { error: 'Pool has no teams. Seed teams before opening.' }
  }

  const { error } = await supabase
    .from('pools')
    .update({
      status: 'open',
      status_changed_at: new Date().toISOString(),
      previous_status: pool.status,
    })
    .eq('id', pool.id)

  if (error) return { error: error.message }

  revalidatePath(`/pools/${poolCode.toUpperCase()}`)
  return {}
}

export async function lockPool(poolCode: string): Promise<{ error?: string }> {
  const result = await getPoolAndVerifyOwner(poolCode)
  if ('error' in result) return { error: result.error }
  const { pool, supabase } = result

  if (pool.status !== 'open' && pool.status !== 'draft') {
    return { error: 'Pool can only be locked from open or draft status.' }
  }

  const { error } = await supabase
    .from('pools')
    .update({
      status: 'locked',
      status_changed_at: new Date().toISOString(),
      previous_status: pool.status,
    })
    .eq('id', pool.id)

  if (error) return { error: error.message }

  revalidatePath(`/pools/${poolCode.toUpperCase()}`)
  return {}
}

export async function completePool(poolCode: string): Promise<{ error?: string }> {
  const result = await getPoolAndVerifyOwner(poolCode)
  if ('error' in result) return { error: result.error }
  const { pool, supabase } = result

  if (pool.status !== 'locked') {
    return { error: 'Pool can only be completed from locked status.' }
  }

  const { error } = await supabase
    .from('pools')
    .update({
      status: 'completed',
      status_changed_at: new Date().toISOString(),
      previous_status: pool.status,
    })
    .eq('id', pool.id)

  if (error) return { error: error.message }

  revalidatePath(`/pools/${poolCode.toUpperCase()}`)
  return {}
}

export async function revertStatus(poolCode: string): Promise<{ error?: string }> {
  const result = await getPoolAndVerifyOwner(poolCode)
  if ('error' in result) return { error: result.error }
  const { pool, supabase } = result

  if (!pool.previous_status) return { error: 'Nothing to undo.' }
  if (!pool.status_changed_at) return { error: 'No status change recorded.' }

  const elapsed = Date.now() - new Date(pool.status_changed_at).getTime()
  if (elapsed > UNDO_WINDOW_MS) return { error: 'Undo window has expired (5 minutes).' }

  const update: Record<string, string | null> = {
    status: pool.previous_status,
    previous_status: null,
    status_changed_at: new Date().toISOString(),
  }

  // Null out locks_at when reverting locked → open so that maybeAutoLock
  // doesn't immediately re-lock the pool on the next render (the old deadline
  // is already in the past). Owner can set a new deadline from settings.
  if (pool.status === 'locked' && pool.previous_status === 'open') {
    update.locks_at = null
  }

  const { error } = await supabase.from('pools').update(update).eq('id', pool.id)

  if (error) return { error: error.message }

  revalidatePath(`/pools/${poolCode.toUpperCase()}`)
  return {}
}