'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type TiebreakersState = { error?: string; success?: boolean } | null

export async function updateActualTiebreakers(
  poolCode: string,
  _prevState: TiebreakersState,
  formData: FormData
): Promise<TiebreakersState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: pool } = await supabase
    .from('pools')
    .select('id, owner_id')
    .eq('join_code', poolCode.toUpperCase())
    .maybeSingle()

  if (!pool) return { error: 'Pool not found' }
  if (pool.owner_id !== user.id) return { error: 'Not authorized' }

  const totalGoalsStr = (formData.get('total_goals') as string).trim()
  const firstGoalMinuteStr = (formData.get('first_goal_minute') as string).trim()

  const totalGoals = totalGoalsStr ? parseInt(totalGoalsStr, 10) : null
  const firstGoalMinute = firstGoalMinuteStr ? parseInt(firstGoalMinuteStr, 10) : null

  if (totalGoals !== null && (isNaN(totalGoals) || totalGoals < 0)) {
    return { error: 'Total goals must be a non-negative whole number.' }
  }
  if (firstGoalMinute !== null && (isNaN(firstGoalMinute) || firstGoalMinute < 0)) {
    return { error: 'First goal minute must be a non-negative whole number.' }
  }

  const { error: updateError } = await supabase
    .from('pools')
    .update({
      actual_total_goals: totalGoals,
      actual_final_first_goal_minute: firstGoalMinute,
    })
    .eq('id', pool.id)

  if (updateError) return { error: updateError.message }

  const { error: rpcError } = await supabase.rpc('recompute_pool_standings', {
    p_pool_id: pool.id,
  })
  if (rpcError) return { error: `Standings recompute failed: ${rpcError.message}` }

  revalidatePath(`/pools/${poolCode.toUpperCase()}`)
  revalidatePath(`/pools/${poolCode.toUpperCase()}/leaderboard`)
  revalidatePath(`/pools/${poolCode.toUpperCase()}/leaderboard/all`)
  revalidatePath(`/pools/${poolCode.toUpperCase()}/tiebreakers/admin`)

  return { success: true }
}
