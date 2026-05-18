'use client'

import { useState } from 'react'
import {
  setBonusCorrectAnswer,
  markEntryAnswer,
  finalizeBonusPool,
  unfinalizeBonusPool,
} from './actions'

export type TeamOption = { id: string; name: string; code: string }

export type EntryAnswerRow = {
  entryId: string
  displayName: string
  answerText: string | null
  answerNumber: number | null
  isCorrect: boolean | null
  resolvedAnswer: string
}

export type QuestionData = {
  index: number
  text: string
  type: 'team' | 'text' | 'number'
  correctAnswerText: string | null
  correctAnswerNumber: number | null
  entries: EntryAnswerRow[]
}

type Props = {
  poolCode: string
  bonusFinalized: boolean
  questions: QuestionData[]
  allTeams: TeamOption[]
}

type SaveState = 'saving' | 'saved' | 'error'

export function BonusAdminClient({ poolCode, bonusFinalized, questions, allTeams }: Props) {
  const [isFinalized, setIsFinalized] = useState(bonusFinalized)
  // Local override map for is_correct: key = `${entryId}:${qIndex}`
  const [corrections, setCorrections] = useState<Map<string, boolean | null>>(new Map())
  const [saveStates, setSaveStates] = useState<Map<string, SaveState>>(new Map())
  const [openQuestions, setOpenQuestions] = useState<Set<number>>(() => {
    const open = new Set<number>()
    questions.forEach((q, i) => {
      if (i === 0 || q.entries.some((e) => e.isCorrect === null)) {
        open.add(q.index)
      }
    })
    return open
  })

  function setSaveState(key: string, state: SaveState | null) {
    setSaveStates((prev) => {
      const next = new Map(prev)
      if (state === null) next.delete(key)
      else next.set(key, state)
      return next
    })
  }

  function flashSaved(key: string) {
    setSaveState(key, 'saved')
    setTimeout(() => setSaveState(key, null), 1500)
  }

  async function handleMarkAnswer(
    entryId: string,
    questionIndex: number,
    currentValue: boolean | null,
    newValue: boolean | null,
  ) {
    const key = `mark:${entryId}:${questionIndex}`
    setCorrections((prev) => new Map(prev).set(`${entryId}:${questionIndex}`, newValue))
    setSaveState(key, 'saving')
    const result = await markEntryAnswer(poolCode, entryId, questionIndex, newValue)
    if (result.error) {
      setCorrections((prev) => new Map(prev).set(`${entryId}:${questionIndex}`, currentValue))
      setSaveState(key, 'error')
    } else {
      flashSaved(key)
    }
  }

  async function handleSetCorrectAnswer(
    questionIndex: number,
    answerText: string | null,
    answerNumber: number | null,
  ) {
    const key = `correct:${questionIndex}`
    setSaveState(key, 'saving')
    const result = await setBonusCorrectAnswer(poolCode, questionIndex, answerText, answerNumber)
    if (result.error) setSaveState(key, 'error')
    else flashSaved(key)
  }

  async function handleToggleFinalized() {
    const key = 'finalize'
    setSaveState(key, 'saving')
    const result = isFinalized
      ? await unfinalizeBonusPool(poolCode)
      : await finalizeBonusPool(poolCode)
    if (result.error) {
      setSaveState(key, 'error')
    } else {
      setIsFinalized((f) => !f)
      flashSaved(key)
    }
  }

  function getIsCorrect(entryId: string, questionIndex: number, original: boolean | null) {
    const key = `${entryId}:${questionIndex}`
    return corrections.has(key) ? corrections.get(key)! : original
  }

  function toggleQuestion(index: number) {
    setOpenQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const finalizeKey = 'finalize'
  const finalizeSave = saveStates.get(finalizeKey)

  return (
    <div className="space-y-6">
      {/* Finalize / Unmark button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleToggleFinalized}
          disabled={finalizeSave === 'saving'}
          className={
            'rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ' +
            (isFinalized
              ? 'border border-border bg-surface text-text-muted hover:bg-surface-elevated'
              : 'bg-accent text-bg hover:bg-accent/90')
          }
        >
          {finalizeSave === 'saving'
            ? 'Saving…'
            : isFinalized
              ? 'Unmark bonus pool complete'
              : 'Mark bonus pool complete'}
        </button>
        {finalizeSave === 'error' && (
          <p className="text-sm text-red-400">Save failed — try again</p>
        )}
        {isFinalized && finalizeSave !== 'error' && (
          <span className="text-sm text-accent">
            Finalized — winner visible on leaderboard
          </span>
        )}
      </div>

      {/* Question cards */}
      {questions.map((q) => {
        const isOpen = openQuestions.has(q.index)
        const correctKey = `correct:${q.index}`
        const correctSave = saveStates.get(correctKey)

        return (
          <div key={q.index} className="overflow-hidden rounded-lg border border-border bg-surface">
            {/* Card header / toggle */}
            <button
              onClick={() => toggleQuestion(q.index)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex-shrink-0 font-mono text-xs text-text-subtle">
                  Q{q.index}
                </span>
                <span className="truncate text-sm font-medium text-text">{q.text}</span>
                <span className="flex-shrink-0 rounded-full bg-surface-elevated px-2 py-0.5 text-xs text-text-muted">
                  {q.entries.length}
                </span>
              </div>
              <svg
                className={
                  'ml-3 h-4 w-4 flex-shrink-0 text-text-muted transition-transform ' +
                  (isOpen ? 'rotate-180' : '')
                }
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isOpen && (
              <div className="border-t border-border px-5 pb-5 pt-4">
                {/* Correct answer reference field */}
                <div className="mb-5">
                  <p className="mb-1.5 text-xs text-text-subtle">
                    Enter the correct answer to mark each entry
                  </p>
                  <div className="flex items-center gap-3">
                    {q.type === 'team' ? (
                      <select
                        defaultValue={q.correctAnswerText ?? ''}
                        onChange={(e) => {
                          const val = e.target.value
                          handleSetCorrectAnswer(q.index, val || null, null)
                        }}
                        className="rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">— select team —</option>
                        {allTeams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.code})
                          </option>
                        ))}
                      </select>
                    ) : q.type === 'number' ? (
                      <input
                        type="number"
                        defaultValue={q.correctAnswerNumber ?? ''}
                        min={0}
                        onBlur={(e) => {
                          const val = e.target.value.trim()
                          handleSetCorrectAnswer(
                            q.index,
                            null,
                            val !== '' ? parseInt(val, 10) : null,
                          )
                        }}
                        className="w-32 rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    ) : (
                      <input
                        type="text"
                        defaultValue={q.correctAnswerText ?? ''}
                        onBlur={(e) => {
                          const val = e.target.value.trim()
                          handleSetCorrectAnswer(q.index, val || null, null)
                        }}
                        className="w-64 rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    )}
                    <span
                      className={
                        'text-xs ' +
                        (correctSave === 'error'
                          ? 'text-red-400'
                          : correctSave === 'saving'
                            ? 'text-text-subtle'
                            : correctSave === 'saved'
                              ? 'text-primary'
                              : 'text-transparent')
                      }
                    >
                      {correctSave === 'error'
                        ? 'Save failed'
                        : correctSave === 'saving'
                          ? 'Saving…'
                          : '✓ Saved'}
                    </span>
                  </div>
                </div>

                {/* Entry answers table */}
                {q.entries.length === 0 ? (
                  <p className="text-sm text-text-muted">No entries answered this question.</p>
                ) : (
                  <div className="overflow-hidden rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-surface-elevated">
                          <th className="px-3 py-2 text-left text-xs font-medium text-text-subtle">
                            Name
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-text-subtle">
                            Answer
                          </th>
                          <th className="w-[140px] px-3 py-2 text-right text-xs font-medium text-text-subtle">
                            Mark
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {q.entries.map((entry) => {
                          const markKey = `mark:${entry.entryId}:${q.index}`
                          const markSave = saveStates.get(markKey)
                          const isCorrect = getIsCorrect(
                            entry.entryId,
                            q.index,
                            entry.isCorrect,
                          )

                          return (
                            <tr key={entry.entryId} className="hover:bg-surface-elevated/40">
                              <td className="max-w-[160px] px-3 py-2">
                                <span className="block truncate text-text">
                                  {entry.displayName}
                                </span>
                              </td>
                              <td className="max-w-[200px] px-3 py-2">
                                <span className="block truncate text-text-muted">
                                  {entry.resolvedAnswer}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center justify-end gap-1.5">
                                  {markSave === 'saving' && (
                                    <span className="text-xs text-text-subtle">…</span>
                                  )}
                                  {markSave === 'saved' && (
                                    <span className="text-xs text-primary">✓</span>
                                  )}
                                  {markSave === 'error' && (
                                    <span className="text-xs text-red-400">!</span>
                                  )}
                                  <button
                                    onClick={() =>
                                      handleMarkAnswer(
                                        entry.entryId,
                                        q.index,
                                        isCorrect,
                                        isCorrect === true ? null : true,
                                      )
                                    }
                                    disabled={markSave === 'saving'}
                                    className={
                                      'rounded px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-40 ' +
                                      (isCorrect === true
                                        ? 'bg-primary/20 text-primary'
                                        : 'border border-border text-text-muted hover:bg-surface-elevated')
                                    }
                                  >
                                    Correct
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleMarkAnswer(
                                        entry.entryId,
                                        q.index,
                                        isCorrect,
                                        isCorrect === false ? null : false,
                                      )
                                    }
                                    disabled={markSave === 'saving'}
                                    className={
                                      'rounded px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-40 ' +
                                      (isCorrect === false
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'border border-border text-text-muted hover:bg-surface-elevated')
                                    }
                                  >
                                    Incorrect
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
