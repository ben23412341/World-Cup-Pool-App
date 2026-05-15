import type { SupabaseClient } from '@supabase/supabase-js'

type PoolWithLock = {
  id: string
  status: string
  locks_at: string | null
}

// Transitions an 'open' pool to 'locked' if its locks_at deadline has passed.
// The conditional WHERE status='open' makes this safe against parallel requests:
// the second update is a no-op and both callers get back status='locked'.
export async function maybeAutoLock<T extends PoolWithLock>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  pool: T
): Promise<T> {
  if (
    pool.status !== 'open' ||
    !pool.locks_at ||
    new Date(pool.locks_at) > new Date()
  ) {
    return pool
  }

  await supabase
    .from('pools')
    .update({
      status: 'locked',
      status_changed_at: new Date().toISOString(),
      previous_status: 'open',
    })
    .eq('id', pool.id)
    .eq('status', 'open')

  return { ...pool, status: 'locked' }
}
