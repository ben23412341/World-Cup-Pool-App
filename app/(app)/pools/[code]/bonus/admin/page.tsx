import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  BonusAdminClient,
  type QuestionData,
  type EntryAnswerRow,
  type TeamOption,
} from './BonusAdminClient'

type BonusQuestion = {
  id: number
  text: string
  type: 'team' | 'text' | 'number'
}

export default async function BonusAdminPage({
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
    .select('id, name, join_code, owner_id, bonus_finalized')
    .eq('join_code', code.toUpperCase())
    .single()

  if (!pool) notFound()
  if (pool.owner_id !== user?.id) redirect(`/pools/${pool.join_code}`)

  const [
    { data: settingsData },
    { data: teamsData },
    { data: entriesData },
    { data: correctAnswersData },
  ] = await Promise.all([
    supabase
      .from('pool_settings')
      .select('bonus_questions')
      .eq('pool_id', pool.id)
      .maybeSingle(),
    supabase.from('teams').select('id, name, code').order('name'),
    supabase
      .from('entries')
      .select('id, display_name')
      .eq('pool_id', pool.id)
      .not('submitted_at', 'is', null),
    supabase
      .from('bonus_correct_answers')
      .select('question_index, answer_text, answer_number')
      .eq('pool_id', pool.id),
  ])

  const bonusQuestions: BonusQuestion[] = Array.isArray(settingsData?.bonus_questions)
    ? (settingsData.bonus_questions as BonusQuestion[])
    : []

  const allTeams: TeamOption[] = (teamsData ?? []).map((t) => ({
    id: t.id as string,
    name: t.name as string,
    code: (t.code as string).trim(),
  }))

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

  // Build lookup maps
  const teamNameMap = new Map(allTeams.map((t) => [t.id, t.name]))

  const correctAnswersMap = new Map(
    (correctAnswersData ?? []).map((ca) => [
      ca.question_index as number,
      {
        answerText: ca.answer_text as string | null,
        answerNumber: ca.answer_number as number | null,
      },
    ]),
  )

  // Group bonus answers by question index, filtering out unanswered rows
  const answersByQuestion = new Map<number, EntryAnswerRow[]>()

  for (const answer of bonusAnswers) {
    const qIndex = answer.question_index as number
    const answerText = answer.answer_text as string | null
    const answerNumber = answer.answer_number as number | null

    if (answerText === null && answerNumber === null) continue

    const entryRow = entries.find((e) => e.id === answer.entry_id)
    if (!entryRow) continue

    const question = bonusQuestions.find((q) => q.id === qIndex)

    let resolvedAnswer: string
    if (question?.type === 'team' && answerText) {
      resolvedAnswer = teamNameMap.get(answerText) ?? answerText
    } else if (answerNumber !== null) {
      resolvedAnswer = String(answerNumber)
    } else {
      resolvedAnswer = answerText ?? '—'
    }

    if (!answersByQuestion.has(qIndex)) answersByQuestion.set(qIndex, [])
    answersByQuestion.get(qIndex)!.push({
      entryId: answer.entry_id as string,
      displayName: entryRow.display_name as string,
      answerText,
      answerNumber,
      isCorrect: answer.is_correct as boolean | null,
      resolvedAnswer,
    })
  }

  const questionData: QuestionData[] = bonusQuestions.map((q) => {
    const correct = correctAnswersMap.get(q.id)
    return {
      index: q.id,
      text: q.text,
      type: q.type,
      correctAnswerText: correct?.answerText ?? null,
      correctAnswerNumber: correct?.answerNumber ?? null,
      entries: answersByQuestion.get(q.id) ?? [],
    }
  })

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/pools/${pool.join_code}`}
        className="text-sm text-text-muted transition-colors hover:text-text"
      >
        ← {pool.name}
      </Link>
      <h1 className="mt-4 font-display text-3xl text-text">Manage bonus pool</h1>

      {bonusQuestions.length === 0 ? (
        <div className="mt-8 rounded-lg border border-border bg-surface px-6 py-10 text-center">
          <p className="text-text-muted">No bonus questions are configured for this pool.</p>
          <Link
            href={`/pools/${pool.join_code}/settings`}
            className="mt-4 inline-block text-sm text-primary hover:text-primary-bright"
          >
            Configure in pool settings →
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <BonusAdminClient
            poolCode={pool.join_code as string}
            bonusFinalized={pool.bonus_finalized as boolean}
            questions={questionData}
            allTeams={allTeams}
          />
        </div>
      )}
    </div>
  )
}
