'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { updatePoolSettingsSchema } from '@/lib/schemas/pool'

export type UpdatePoolSettingsState = { error?: string; success?: boolean } | null

export async function updatePoolSettings(
  poolCode: string,
  _prevState: UpdatePoolSettingsState,
  formData: FormData
): Promise<UpdatePoolSettingsState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: pool } = await supabase
    .from('pools')
    .select('id, status, owner_id, locks_at')
    .eq('join_code', poolCode.toUpperCase())
    .maybeSingle()

  if (!pool) return { error: 'Pool not found' }
  if (pool.owner_id !== user.id) return { error: 'Not authorized' }

  const rawDescription = (formData.get('description') as string).trim()
  const rawLocksAt = (formData.get('locks_at') as string).trim()

  const raw = {
    name: (formData.get('name') as string).trim(),
    description: rawDescription || null,
    locks_at: rawLocksAt || null,
  }

  const parsed = updatePoolSettingsSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const updatePayload: Record<string, unknown> = {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    updated_at: new Date().toISOString(),
  }

  const locksEditable = pool.status === 'draft' || pool.status === 'open'

  if (locksEditable) {
    if (parsed.data.locks_at) {
      const lockDate = new Date(parsed.data.locks_at)
      if (isNaN(lockDate.getTime())) {
        return { error: 'Invalid lock time format.' }
      }
      if (pool.status === 'open' && lockDate <= new Date()) {
        return { error: 'Lock time must be in the future.' }
      }
      updatePayload.locks_at = lockDate.toISOString()
    } else {
      updatePayload.locks_at = null
    }
  } else if (parsed.data.locks_at) {
    // Input is disabled in UI for locked/completed; warn if bypassed via dev tools
    console.warn(
      `[updatePoolSettings] Ignoring locks_at on ${pool.status} pool ${pool.id}`
    )
  }

  const { error } = await supabase
    .from('pools')
    .update(updatePayload)
    .eq('id', pool.id)

  if (error) return { error: error.message }

  revalidatePath(`/pools/${poolCode.toUpperCase()}`)
  revalidatePath(`/pools/${poolCode.toUpperCase()}/settings`)
  return { success: true }
}
