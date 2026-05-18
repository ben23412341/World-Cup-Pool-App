import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type BonusParticipant = {
  entryId: string
  displayName: string
  correctCount: number
  tiebreakerGoals: number | null
  tiebreakerMinute: number | null
}

function computeBonusRankings(
  entries: { id: string; display_name: string; tiebreaker_total_goals: number | null; tiebreaker_final_minute: number | null }[],
  bonusAnswers: {
    entry_id: string
    question_index: number
    answer_text: string | null
    answer_number: number | null
    is_correct: boolean | null
  }[],
  actualTotalGoals: number | null,
  actualFinalMinute: number | null,
): BonusParticipant[] {
  const answersByEntry = new Map<string, typeof bonusAnswers>()
  for (const a of bonusAnswers) {
    if (!answersByEntry.has(a.entry_id)) answersByEntry.set(a.entry_id, [])
    answersByEntry.get(a.entry_id)!.push(a)
  }

  const participants: BonusParticipant[] = []
  for (const entry of entries) {
    const answers = answersByEntry.get(entry.id as string) ?? []
    const hasAnyAnswer = answers.some(
      (a) => a.answer_text !== null || a.answer_number !== null,
    )
    if (!hasAnyAnswer) continue

    const correctCount = answers.filter((a) => a.is_correct === true).length

    participants.push({
      entryId: entry.id as string,
      displayName: entry.display_name as string,
      correctCount,
      tiebreakerGoals: entry.tiebreaker_total_goals,
      tiebreakerMinute: entry.tiebreaker_final_minute,
    })
  }

  participants.sort((a, b) => {
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount
    if (actualTotalGoals !== null) {
      const aDiff = a.tiebreakerGoals !== null ? Math.abs(a.tiebreakerGoals - actualTotalGoals) : Infinity
      const bDiff = b.tiebreakerGoals !== null ? Math.abs(b.tiebreakerGoals - actualTotalGoals) : Infinity
      if (aDiff !== bDiff) return aDiff - bDiff
    }
    if (actualFinalMinute !== null) {
      const aDiff = a.tiebreakerMinute !== null ? Math.abs(a.tiebreakerMinute - actualFinalMinute) : Infinity
      const bDiff = b.tiebreakerMinute !== null ? Math.abs(b.tiebreakerMinute - actualFinalMinute) : Infinity
      if (aDiff !== bDiff) return aDiff - bDiff
    }
    return a.displayName.localeCompare(b.displayName)
  })

  return participants
}

function computeWinners(
  participants: BonusParticipant[],
  actualTotalGoals: number | null,
  actualFinalMinute: number | null,
): BonusParticipant[] {
  if (participants.length === 0) return []
  const top = participants[0]
  return participants.filter((p) => {
    if (p.correctCount !== top.correctCount) return false
    if (actualTotalGoals !== null) {
      const topDiff = top.tiebreakerGoals !== null ? Math.abs(top.tiebreakerGoals - actualTotalGoals) : Infinity
      const pDiff = p.tiebreakerGoals !== null ? Math.abs(p.tiebreakerGoals - actualTotalGoals) : Infinity
      if (topDiff !== pDiff) return false
    }
    if (actualFinalMinute !== null) {
      const topDiff = top.tiebreakerMinute !== null ? Math.abs(top.tiebreakerMinute - actualFinalMinute) : Infinity
      const pDiff = p.tiebreakerMinute !== null ? Math.abs(p.tiebreakerMinute - actualFinalMinute) : Infinity
      if (topDiff !== pDiff) return false
    }
    return true
  })
}

export default async function BonusAllPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const supabase = await createClient()

  const { data: pool } = await supabase
    .from('pools')
    .select('id, name, join_code, owner_id, status, bonus_finalized, actual_total_goals, actual_final_first_goal_minute')
    .eq('join_code', code.toUpperCase())
    .single()

  if (!pool) notFound()

  const poolLocked = pool.status === 'locked' || pool.status === 'completed'
  if (!poolLocked) redirect(`/pools/${pool.join_code}/leaderboard`)

  const { data: entriesData } = await supabase
    .from('entries')
    .select('id, display_name, tiebreaker_total_goals, tiebreaker_final_minute')
    .eq('pool_id', pool.id)
    .not('submitted_at', 'is', null)

  const entries = entriesData ?? []
  const entryIds = entries.map((e) => e.id as string)

  const { data: bonusAnswersData } =
    entryIds.length > 0
      ? await supabase
          .from('entry_bonus_answers')
          .select('entry_id, question_index, answer_text, answer_number, is_correct')
          .in('entry_id', entryIds)
      : { data: [] }

  const bonusAnswers = bonusAnswersData ?? []
  const actualTotalGoals = pool.actual_total_goals as number | null
  const actualFinalMinute = pool.actual_final_first_goal_minute as number | null

  const participants = computeBonusRankings(entries, bonusAnswers, actualTotalGoals, actualFinalMinute)
  const bonusFinalized = pool.bonus_finalized as boolean
  const winners = bonusFinalized ? computeWinners(participants, actualTotalGoals, actualFinalMinute) : []

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <Link
          href={`/pools/${pool.join_code}/leaderboard`}
          className="text-sm text-text-muted hover:text-text"
        >
          ← Back to leaderboard
        </Link>
        <h1 className="font-display mt-1 text-3xl text-text">Bonus pool</h1>
        <p className="mt-1 text-sm text-text-muted">{participants.length} participants</p>
      </div>

      <div className="mt-8">
        {participants.length === 0 ? (
          <p className="text-sm text-text-muted">
            No entries have participated in the bonus pool.
          </p>
        ) : (
          <>
            {bonusFinalized && winners.length > 0 && (
              <div className="mb-6 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
                <p className="text-sm font-semibold text-accent">
                  {winners.length === 1
                    ? `Winner: ${winners[0].displayName}`
                    : `Winners: ${winners.map((w) => w.displayName).join(', ')} (tied)`}
                </p>
              </div>
            )}

            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <div className="divide-y divide-border">
                {participants.map((row, i) => (
                  <Link
                    key={row.entryId}
                    href={`/pools/${pool.join_code}/entries/${row.entryId}/bonus`}
                    className="flex items-center gap-4 px-4 py-2.5 transition-colors hover:bg-surface-elevated"
                  >
                    <span className="w-6 flex-shrink-0 text-right font-mono text-sm tabular-nums text-text-muted">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-text">{row.displayName}</span>
                    <span className="font-mono text-sm tabular-nums text-text-muted">
                      {row.correctCount} / 10
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
