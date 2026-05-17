import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type BonusQuestion = {
  id: number
  text: string
  type: 'team' | 'text' | 'number'
}

export default async function EntryBonusDetailPage({
  params,
}: {
  params: Promise<{ code: string; id: string }>
}) {
  const { code, id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: pool } = await supabase
    .from('pools')
    .select('id, name, join_code, owner_id, status')
    .eq('join_code', code.toUpperCase())
    .single()

  if (!pool) notFound()

  const { data: entry } = await supabase
    .from('entries')
    .select('id, pool_id, user_id, display_name')
    .eq('id', id)
    .single()

  if (!entry) notFound()
  if (entry.pool_id !== pool.id) notFound()

  const isEntryOwner = user?.id === entry.user_id
  const poolLocked = pool.status === 'locked' || pool.status === 'completed'
  const canView = isEntryOwner || poolLocked

  if (!canView) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mt-16 rounded-lg border border-border bg-surface px-6 py-12 text-center">
          <p className="text-text-muted">Entry hidden until pool locks.</p>
          <Link
            href={`/pools/${pool.join_code}`}
            className="mt-4 inline-block text-sm text-primary hover:text-primary-bright"
          >
            ← Back to {pool.name}
          </Link>
        </div>
      </div>
    )
  }

  const [{ data: bonusAnswers }, { data: settingsData }] = await Promise.all([
    supabase
      .from('entry_bonus_answers')
      .select('question_index, answer_text, answer_number, is_correct')
      .eq('entry_id', id)
      .order('question_index'),
    supabase
      .from('pool_settings')
      .select('bonus_questions')
      .eq('pool_id', pool.id)
      .maybeSingle(),
  ])

  const bonusQuestions: BonusQuestion[] = Array.isArray(settingsData?.bonus_questions)
    ? (settingsData.bonus_questions as BonusQuestion[])
    : []

  const hasBonus = (bonusAnswers ?? []).some(
    (a) => a.answer_text !== null || a.answer_number !== null,
  )

  // Resolve team names for team-type answers
  const teamAnswerIds = (bonusAnswers ?? [])
    .filter((a) => {
      const q = bonusQuestions.find((q) => q.id === a.question_index)
      return q?.type === 'team' && a.answer_text
    })
    .map((a) => a.answer_text as string)

  let teamNameMap: Record<string, string> = {}
  if (teamAnswerIds.length > 0) {
    const { data: teamRows } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', teamAnswerIds)
    teamNameMap = Object.fromEntries((teamRows ?? []).map((t) => [t.id, t.name]))
  }

  const correctCount = (bonusAnswers ?? []).filter((a) => a.is_correct === true).length
  const markedCount = (bonusAnswers ?? []).filter((a) => a.is_correct !== null).length

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <Link
          href={`/pools/${pool.join_code}/entries/${id}`}
          className="text-sm text-text-muted hover:text-text"
        >
          ← {entry.display_name as string}
        </Link>
        <h1 className="font-display mt-1 text-3xl text-text">Bonus answers</h1>
        {hasBonus && markedCount > 0 && (
          <p className="mt-1 text-sm text-text-muted">
            {correctCount} / {markedCount} marked correct
          </p>
        )}
      </div>

      <div className="mt-8">
        {!hasBonus ? (
          <div className="rounded-lg border border-border bg-surface px-6 py-10 text-center">
            <p className="text-text-muted">
              This entry did not participate in the bonus pool.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bonusQuestions.map((question) => {
              const answer = (bonusAnswers ?? []).find(
                (a) => a.question_index === question.id,
              )

              let displayValue: string
              if (!answer || (answer.answer_text === null && answer.answer_number === null)) {
                displayValue = '—'
              } else if (question.type === 'team' && answer.answer_text) {
                displayValue = teamNameMap[answer.answer_text] ?? answer.answer_text
              } else if (question.type === 'number') {
                displayValue =
                  answer.answer_number !== null ? String(answer.answer_number) : '—'
              } else {
                displayValue = answer.answer_text ?? '—'
              }

              const isCorrect = answer?.is_correct ?? null

              return (
                <div
                  key={question.id}
                  className="rounded-lg border border-border bg-surface px-4 py-3"
                >
                  <p className="text-xs text-text-subtle">
                    Q{question.id} · {question.text}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <p className="text-sm text-text">{displayValue}</p>
                    {isCorrect === true && (
                      <span className="flex-shrink-0 text-sm font-medium text-primary">✓</span>
                    )}
                    {isCorrect === false && (
                      <span className="flex-shrink-0 text-sm font-medium text-red-400">✗</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-10 border-t border-border pt-6">
        <Link
          href={`/pools/${pool.join_code}/leaderboard/bonus`}
          className="text-sm text-primary hover:text-primary-bright"
        >
          ← Bonus pool leaderboard
        </Link>
      </div>
    </div>
  )
}
