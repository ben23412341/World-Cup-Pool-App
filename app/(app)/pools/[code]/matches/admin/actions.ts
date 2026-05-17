'use server'

import { createClient } from '@/lib/supabase/server'

type SavePayload = {
  home_team_id: string
  away_team_id: string
  home_score: number
  away_score: number
  went_to_extra_time: boolean
  went_to_penalties: boolean
  home_penalty_score: number | null
  away_penalty_score: number | null
}

export async function saveMatchResult(
  matchId: string,
  payload: SavePayload,
): Promise<{ success?: true; error?: string }> {
  const supabase = await createClient()

  if (!payload.home_team_id || !payload.away_team_id) {
    return { error: 'Both teams are required' }
  }
  if (payload.home_team_id === payload.away_team_id) {
    return { error: 'Home and away teams must be different' }
  }
  if (
    !Number.isInteger(payload.home_score) ||
    !Number.isInteger(payload.away_score) ||
    payload.home_score < 0 ||
    payload.away_score < 0
  ) {
    return { error: 'Scores must be non-negative integers' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: match } = await supabase
    .from('matches')
    .select('stage, pool_id')
    .eq('id', matchId)
    .single()

  if (!match) return { error: 'Match not found' }

  const { data: pool } = await supabase
    .from('pools')
    .select('status, owner_id')
    .eq('id', match.pool_id)
    .single()

  if (!pool) return { error: 'Pool not found' }
  if (pool.owner_id !== user.id) return { error: 'Not authorized' }
  if (pool.status !== 'locked' && pool.status !== 'completed') {
    return { error: 'Match results can only be entered after the pool is locked.' }
  }

  if (match.stage === 'group' && payload.went_to_penalties) {
    return { error: 'Group stage matches cannot go to penalties' }
  }

  let penaltyWinnerId: string | null = null
  if (payload.went_to_penalties) {
    const h = payload.home_penalty_score
    const a = payload.away_penalty_score
    if (h === null || a === null || !Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0) {
      return { error: 'Penalty shootout scores are required' }
    }
    if (h === a) {
      return { error: 'Penalty scores cannot be equal — there must be a winner' }
    }
    penaltyWinnerId = h > a ? payload.home_team_id : payload.away_team_id
  }

  const { error: updateError } = await supabase
    .from('matches')
    .update({
      home_team_id: payload.home_team_id,
      away_team_id: payload.away_team_id,
      home_score: payload.home_score,
      away_score: payload.away_score,
      went_to_extra_time: payload.went_to_extra_time,
      went_to_penalties: payload.went_to_penalties,
      home_penalty_score: payload.went_to_penalties ? payload.home_penalty_score : null,
      away_penalty_score: payload.went_to_penalties ? payload.away_penalty_score : null,
      penalty_winner_team_id: penaltyWinnerId,
      status: 'finished',
    })
    .eq('id', matchId)

  if (updateError) return { error: updateError.message }

  await supabase.rpc('recompute_pool_standings', { p_pool_id: match.pool_id })

  return { success: true }
}
