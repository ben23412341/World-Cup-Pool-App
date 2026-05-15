'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveMatchResult } from './actions'
import { seedMatches } from '../../seed-matches/actions'
import { EmptyState } from '@/components/ui/EmptyState'

type Match = {
  id: string
  match_number: number
  stage: string
  kickoff_at: string | null
  home_team_id: string | null
  away_team_id: string | null
  home_score: number | null
  away_score: number | null
  went_to_extra_time: boolean
  went_to_penalties: boolean
  penalty_winner_team_id: string | null
  status: string
}

type Team = {
  id: string
  name: string
  code: string
}

type Props = {
  pool: { id: string; name: string; join_code: string }
  initialMatches: Match[]
  teams: Team[]
}

type StageFilter = 'all' | 'group' | 'knockout'

const STAGE_ORDER = [
  'group',
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final',
]

const STAGE_LABELS: Record<string, string> = {
  group: 'Group Stage',
  round_of_32: 'Round of 32',
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter-finals',
  semi_final: 'Semi-finals',
  third_place: 'Third Place',
  final: 'Final',
}

export function MatchesAdminClient({ pool, initialMatches, teams }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<StageFilter>('all')
  const [isSeeding, startSeedTransition] = useTransition()
  const [seedError, setSeedError] = useState<string | null>(null)

  function handleSaved() {
    router.refresh()
  }

  function handleSeed() {
    setSeedError(null)
    startSeedTransition(async () => {
      const result = await seedMatches(pool.id)
      if (result.error) {
        setSeedError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  const filteredMatches =
    filter === 'group'
      ? initialMatches.filter((m) => m.stage === 'group')
      : filter === 'knockout'
        ? initialMatches.filter((m) => m.stage !== 'group')
        : initialMatches

  const grouped = STAGE_ORDER.filter((stage) =>
    filteredMatches.some((m) => m.stage === stage),
  ).map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    matches: filteredMatches.filter((m) => m.stage === stage),
  }))

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/pools/${pool.join_code}`}
            className="text-sm text-text-muted hover:text-text"
          >
            ← {pool.name}
          </Link>
          <h1 className="font-display mt-1 text-3xl text-text">Match results</h1>
        </div>
      </div>

      {initialMatches.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No matches scheduled"
            description="Seed all 104 World Cup 2026 fixtures with placeholder kickoff times."
            actions={[
              {
                label: isSeeding ? 'Seeding…' : 'Seed 104 fixtures',
                onClick: handleSeed,
                disabled: isSeeding,
                variant: 'primary',
              },
            ]}
          >
            {seedError && (
              <p className="mt-3 text-sm text-[#C44545]">{seedError}</p>
            )}
          </EmptyState>
        </div>
      ) : (
        <>
          {/* Filter tabs */}
          <div className="mt-6 flex gap-1 border-b border-border pb-px">
            {(['all', 'group', 'knockout'] as StageFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  'px-4 py-2 text-sm font-medium transition-colors ' +
                  (filter === f
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-text-muted hover:text-text')
                }
              >
                {f === 'all' ? 'All' : f === 'group' ? 'Group' : 'Knockout'}
              </button>
            ))}
            <span className="ml-auto self-center pr-1 text-xs text-text-subtle">
              {initialMatches.filter((m) => m.status === 'finished').length} /{' '}
              {initialMatches.length} finished
            </span>
          </div>

          {/* Grouped matches */}
          <div className="mt-4 space-y-8">
            {grouped.map(({ stage, label, matches }) => (
              <section key={stage}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-subtle">
                  {label}
                </h2>
                <div className="rounded-lg border border-border overflow-hidden">
                  {matches.map((match) => {
                    const rowKey = `${match.id}-${match.status}-${match.home_score ?? 'x'}-${match.away_score ?? 'x'}-${match.home_team_id ?? 'x'}-${match.away_team_id ?? 'x'}`
                    return (
                      <MatchRow
                        key={rowKey}
                        match={match}
                        teams={teams}
                        onSaved={handleSaved}
                      />
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function MatchRow({
  match,
  teams,
  onSaved,
}: {
  match: Match
  teams: Team[]
  onSaved: () => void
}) {
  const [isPending, startTransition] = useTransition()

  const [homeTeamId, setHomeTeamId] = useState(match.home_team_id ?? '')
  const [awayTeamId, setAwayTeamId] = useState(match.away_team_id ?? '')
  const [homeScore, setHomeScore] = useState(match.home_score?.toString() ?? '')
  const [awayScore, setAwayScore] = useState(match.away_score?.toString() ?? '')
  const [wentToExtraTime, setWentToExtraTime] = useState(match.went_to_extra_time)
  const [wentToPenalties, setWentToPenalties] = useState(match.went_to_penalties)
  const [penaltyWinnerId, setPenaltyWinnerId] = useState(match.penalty_winner_team_id ?? '')
  const [error, setError] = useState<string | null>(null)

  // Sync local state when server data changes (after router.refresh())
  useEffect(() => {
    setHomeTeamId(match.home_team_id ?? '')
    setAwayTeamId(match.away_team_id ?? '')
    setHomeScore(match.home_score?.toString() ?? '')
    setAwayScore(match.away_score?.toString() ?? '')
    setWentToExtraTime(match.went_to_extra_time)
    setWentToPenalties(match.went_to_penalties)
    setPenaltyWinnerId(match.penalty_winner_team_id ?? '')
  }, [
    match.home_team_id,
    match.away_team_id,
    match.home_score,
    match.away_score,
    match.went_to_extra_time,
    match.went_to_penalties,
    match.penalty_winner_team_id,
    match.status,
  ])

  const isDirty =
    homeTeamId !== (match.home_team_id ?? '') ||
    awayTeamId !== (match.away_team_id ?? '') ||
    homeScore !== (match.home_score?.toString() ?? '') ||
    awayScore !== (match.away_score?.toString() ?? '') ||
    wentToExtraTime !== match.went_to_extra_time ||
    wentToPenalties !== match.went_to_penalties ||
    penaltyWinnerId !== (match.penalty_winner_team_id ?? '')

  const homeScoreNum = parseInt(homeScore, 10)
  const awayScoreNum = parseInt(awayScore, 10)
  const scoresValid =
    homeScore !== '' &&
    awayScore !== '' &&
    !isNaN(homeScoreNum) &&
    !isNaN(awayScoreNum) &&
    homeScoreNum >= 0 &&
    awayScoreNum >= 0

  const canSave =
    isDirty &&
    homeTeamId &&
    awayTeamId &&
    homeTeamId !== awayTeamId &&
    scoresValid &&
    (!wentToPenalties || !!penaltyWinnerId)

  const showPenalties = match.stage !== 'group' && scoresValid

  const penaltyOptions = teams.filter((t) => t.id === homeTeamId || t.id === awayTeamId)

  const kickoffLabel = match.kickoff_at
    ? new Date(match.kickoff_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—'

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await saveMatchResult(match.id, {
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_score: homeScoreNum,
        away_score: awayScoreNum,
        went_to_extra_time: wentToExtraTime,
        went_to_penalties: wentToPenalties,
        penalty_winner_team_id: wentToPenalties ? penaltyWinnerId || null : null,
      })
      if (result.error) {
        setError(result.error)
      } else {
        onSaved()
      }
    })
  }

  const selectClass =
    'rounded border border-border bg-surface px-2 py-1 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary'
  const inputClass =
    'w-14 rounded border border-border bg-surface px-2 py-1 text-center text-sm text-text tabular-nums focus:outline-none focus:ring-1 focus:ring-primary'

  return (
    <div className="border-b border-border last:border-b-0 px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Left: match info */}
        <div className="w-24 flex-shrink-0">
          <span className="font-mono text-xs text-text-muted">#{match.match_number}</span>
          <p className="text-xs text-text-subtle">{kickoffLabel}</p>
        </div>

        {/* Middle: teams + scores */}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <select
            value={homeTeamId}
            onChange={(e) => setHomeTeamId(e.target.value)}
            className={selectClass}
            style={{ colorScheme: 'dark' }}
          >
            <option value="">— Home —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            placeholder="0"
            className={inputClass}
          />

          <span className="text-sm text-text-subtle">vs</span>

          <input
            type="number"
            min="0"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            placeholder="0"
            className={inputClass}
          />

          <select
            value={awayTeamId}
            onChange={(e) => setAwayTeamId(e.target.value)}
            className={selectClass}
            style={{ colorScheme: 'dark' }}
          >
            <option value="">— Away —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Right: status + action */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <span
            className={
              'text-xs ' +
              (match.status === 'finished' ? 'text-primary' : 'text-text-muted')
            }
          >
            {match.status}
          </span>

          {isDirty ? (
            <button
              onClick={handleSave}
              disabled={!canSave || isPending}
              className="rounded border border-primary px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
          ) : match.status === 'finished' ? (
            <span className="rounded border border-border px-2.5 py-1 text-xs text-text-subtle">
              Edit
            </span>
          ) : null}
        </div>
      </div>

      {/* Penalties / extra time row */}
      {showPenalties && (
        <div className="mt-1.5 ml-24 flex flex-wrap items-center gap-4 pl-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-text-muted">
            <input
              type="checkbox"
              checked={wentToExtraTime}
              onChange={(e) => setWentToExtraTime(e.target.checked)}
              className="accent-primary"
            />
            Extra time
          </label>

          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-text-muted">
            <input
              type="checkbox"
              checked={wentToPenalties}
              onChange={(e) => {
                setWentToPenalties(e.target.checked)
                if (!e.target.checked) setPenaltyWinnerId('')
              }}
              className="accent-primary"
            />
            Penalties
          </label>

          {wentToPenalties && (
            <select
              value={penaltyWinnerId}
              onChange={(e) => setPenaltyWinnerId(e.target.value)}
              className="rounded border border-border bg-surface px-2 py-0.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ colorScheme: 'dark' }}
            >
              <option value="">— Penalty winner —</option>
              {penaltyOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {error && <p className="mt-1 ml-24 pl-3 text-xs text-[#C44545]">{error}</p>}
    </div>
  )
}
