import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TiebreakersForm } from './TiebreakersForm'

export default async function TiebreakersAdminPage({
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
    .select('id, name, join_code, owner_id, actual_total_goals, actual_final_first_goal_minute')
    .eq('join_code', code.toUpperCase())
    .single()

  if (!pool) notFound()
  if (pool.owner_id !== user?.id) redirect(`/pools/${pool.join_code}`)

  const actualTotalGoals = pool.actual_total_goals as number | null
  const actualFinalMinute = pool.actual_final_first_goal_minute as number | null

  return (
    <div className="mx-auto max-w-[600px]">
      <Link
        href={`/pools/${pool.join_code}`}
        className="text-sm text-text-muted transition-colors hover:text-text"
      >
        ← {pool.name}
      </Link>

      <h1 className="mt-4 font-display text-3xl text-text">Manage tiebreakers</h1>
      <p className="mt-2 text-sm text-text-muted">
        Enter the actual results after the Final. Standings will recompute immediately.
      </p>

      <div className="mt-8 rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-1 text-sm font-medium text-text-muted uppercase tracking-wider">
          Tiebreaker rules
        </h2>
        <ol className="mt-3 space-y-1 text-sm text-text-muted list-decimal list-inside">
          <li>Closest guess to total goals scored across all 104 matches (no penalty shootout goals)</li>
          <li>Closest guess to the minute of the first goal in the Final</li>
        </ol>
      </div>

      <div className="mt-8">
        <TiebreakersForm
          poolCode={pool.join_code}
          actualTotalGoals={actualTotalGoals}
          actualFinalMinute={actualFinalMinute}
        />
      </div>
    </div>
  )
}
