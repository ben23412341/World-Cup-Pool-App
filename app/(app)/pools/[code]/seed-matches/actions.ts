'use server'

import { createClient } from '@/lib/supabase/server'

type MatchRow = {
  pool_id: string
  match_number: number
  stage: string
  kickoff_at: string
  status: string
  home_team_id: null
  away_team_id: null
}

export async function seedMatches(poolId: string): Promise<{ success?: true; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: pool } = await supabase
    .from('pools')
    .select('owner_id')
    .eq('id', poolId)
    .single()

  if (!pool || pool.owner_id !== user.id) return { error: 'Not authorized' }

  const { count } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('pool_id', poolId)

  if (count && count > 0) return { error: 'Matches already seeded for this pool' }

  const { error } = await supabase.from('matches').insert(buildMatchRows(poolId))
  if (error) return { error: error.message }

  return { success: true }
}

function buildMatchRows(poolId: string): MatchRow[] {
  const rows: MatchRow[] = []
  let n = 1

  // Group stage: 72 matches, Jun 11–27
  // First 4 days (Jun 11–14): 5 matches each at 09/12/15/18/21 UTC
  // Remaining 13 days (Jun 15–27): 4 matches each at 12/15/18/21 UTC
  const times5 = ['09:00', '12:00', '15:00', '18:00', '21:00']
  const times4 = ['12:00', '15:00', '18:00', '21:00']

  for (let d = 0; d < 17 && n <= 72; d++) {
    const day = String(11 + d).padStart(2, '0')
    const date = `2026-06-${day}`
    for (const t of d < 4 ? times5 : times4) {
      if (n > 72) break
      rows.push(row(poolId, n++, 'group', `${date}T${t}:00Z`))
    }
  }

  // Round of 32: 16 matches, Jun 29 – Jul 2 (4 per day)
  for (const [date, t] of [
    ['2026-06-29', '13:00'], ['2026-06-29', '16:00'], ['2026-06-29', '19:00'], ['2026-06-29', '22:00'],
    ['2026-06-30', '13:00'], ['2026-06-30', '16:00'], ['2026-06-30', '19:00'], ['2026-06-30', '22:00'],
    ['2026-07-01', '13:00'], ['2026-07-01', '16:00'], ['2026-07-01', '19:00'], ['2026-07-01', '22:00'],
    ['2026-07-02', '13:00'], ['2026-07-02', '16:00'], ['2026-07-02', '19:00'], ['2026-07-02', '22:00'],
  ]) {
    rows.push(row(poolId, n++, 'round_of_32', `${date}T${t}:00Z`))
  }

  // Round of 16: 8 matches, Jul 5–8 (2 per day)
  for (const [date, t] of [
    ['2026-07-05', '16:00'], ['2026-07-05', '20:00'],
    ['2026-07-06', '16:00'], ['2026-07-06', '20:00'],
    ['2026-07-07', '16:00'], ['2026-07-07', '20:00'],
    ['2026-07-08', '16:00'], ['2026-07-08', '20:00'],
  ]) {
    rows.push(row(poolId, n++, 'round_of_16', `${date}T${t}:00Z`))
  }

  // Quarter-finals: 4 matches, Jul 11–12
  for (const [date, t] of [
    ['2026-07-11', '16:00'], ['2026-07-11', '20:00'],
    ['2026-07-12', '16:00'], ['2026-07-12', '20:00'],
  ]) {
    rows.push(row(poolId, n++, 'quarter_final', `${date}T${t}:00Z`))
  }

  // Semi-finals: 2 matches, Jul 15–16
  rows.push(row(poolId, n++, 'semi_final', '2026-07-15T20:00:00Z'))
  rows.push(row(poolId, n++, 'semi_final', '2026-07-16T20:00:00Z'))

  // Third place: 1 match, Jul 18
  rows.push(row(poolId, n++, 'third_place', '2026-07-18T17:00:00Z'))

  // Final: 1 match, Jul 19
  rows.push(row(poolId, n++, 'final', '2026-07-19T20:00:00Z'))

  return rows
}

function row(poolId: string, matchNumber: number, stage: string, kickoffAt: string): MatchRow {
  return {
    pool_id: poolId,
    match_number: matchNumber,
    stage,
    kickoff_at: kickoffAt,
    status: 'scheduled',
    home_team_id: null,
    away_team_id: null,
  }
}
