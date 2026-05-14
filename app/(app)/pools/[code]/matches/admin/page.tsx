import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MatchesAdminClient } from './MatchesAdminClient'

export default async function MatchesAdminPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: pool } = await supabase
    .from('pools')
    .select('id, name, join_code, owner_id')
    .eq('join_code', code.toUpperCase())
    .single()

  if (!pool) notFound()
  if (pool.owner_id !== user.id) redirect(`/pools/${code}`)

  const { data: matches } = await supabase
    .from('matches')
    .select(
      'id, match_number, stage, kickoff_at, home_team_id, away_team_id, home_score, away_score, went_to_extra_time, went_to_penalties, penalty_winner_team_id, status',
    )
    .eq('pool_id', pool.id)
    .order('match_number', { ascending: true })

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, code')
    .order('name', { ascending: true })

  return (
    <MatchesAdminClient
      pool={{ id: pool.id, name: pool.name, join_code: pool.join_code }}
      initialMatches={matches ?? []}
      teams={teams ?? []}
    />
  )
}
