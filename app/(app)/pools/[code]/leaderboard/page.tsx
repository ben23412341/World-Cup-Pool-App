import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/EmptyState";
import { LeaderboardRow } from "./LeaderboardRow";

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pool } = await supabase
    .from("pools")
    .select(
      "id, name, join_code, owner_id, status, actual_total_goals, actual_final_first_goal_minute, bonus_finalized"
    )
    .eq("join_code", code.toUpperCase())
    .single();

  if (!pool) notFound();

  const poolLocked = pool.status === "locked" || pool.status === "completed";

  const [{ data: entriesData }, { data: cacheData }] =
    await Promise.all([
      supabase
        .from("entries")
        .select("id, display_name, user_id, tiebreaker_total_goals, tiebreaker_final_minute")
        .eq("pool_id", pool.id)
        .not("submitted_at", "is", null)
        .order("display_name"),
      supabase.from("standings_cache").select("entry_id, points, rank").eq("pool_id", pool.id),
    ]);

  const entryIds = (entriesData ?? []).map((e) => e.id as string);
  const { data: bonusAnswersData } =
    entryIds.length > 0
      ? await supabase
          .from("entry_bonus_answers")
          .select("entry_id, question_index, answer_text, answer_number, is_correct")
          .in("entry_id", entryIds)
      : { data: [] };

  const cacheMap = new Map(
    (cacheData ?? []).map((r) => [r.entry_id as string, r])
  );

  const allRows = (entriesData ?? []).map((e) => {
    const cached = cacheMap.get(e.id as string);
    return {
      entryId: e.id as string,
      displayName: e.display_name as string,
      isMe: user?.id === (e.user_id as string),
      points: (cached?.points as number) ?? 0,
      rank: (cached?.rank as number) ?? null,
      tiebreakerGoals: e.tiebreaker_total_goals as number | null,
      tiebreakerMinute: e.tiebreaker_final_minute as number | null,
    };
  });

  const actualTotalGoals = pool.actual_total_goals as number | null;
  const actualFinalMinute = pool.actual_final_first_goal_minute as number | null;

  allRows.sort((a, b) => {
    if (a.rank !== null && b.rank !== null && a.rank !== b.rank) return a.rank - b.rank;
    if (a.rank !== null && b.rank === null) return -1;
    if (a.rank === null && b.rank !== null) return 1;
    // Same rank or both null — fall back to JS tiebreakers so display matches rule
    if (b.points !== a.points) return b.points - a.points;
    if (actualTotalGoals !== null) {
      const aDiff = a.tiebreakerGoals !== null ? Math.abs(a.tiebreakerGoals - actualTotalGoals) : Infinity;
      const bDiff = b.tiebreakerGoals !== null ? Math.abs(b.tiebreakerGoals - actualTotalGoals) : Infinity;
      if (aDiff !== bDiff) return aDiff - bDiff;
    }
    if (actualFinalMinute !== null) {
      const aDiff = a.tiebreakerMinute !== null ? Math.abs(a.tiebreakerMinute - actualFinalMinute) : Infinity;
      const bDiff = b.tiebreakerMinute !== null ? Math.abs(b.tiebreakerMinute - actualFinalMinute) : Infinity;
      if (aDiff !== bDiff) return aDiff - bDiff;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  const pointsCounts = new Map<number, number>();
  allRows.forEach((r) =>
    pointsCounts.set(r.points, (pointsCounts.get(r.points) ?? 0) + 1)
  );
  const isTied = (pts: number) => (pointsCounts.get(pts) ?? 0) > 1;

  const visibleRows = allRows.slice(0, 10);
  const hasMore = allRows.length > 10;

  // --- Bonus pool ---
  const bonusAnswers = bonusAnswersData ?? [];
  const bonusFinalized = pool.bonus_finalized as boolean;

  type BonusParticipant = {
    entryId: string;
    displayName: string;
    correctCount: number;
    tiebreakerGoals: number | null;
    tiebreakerMinute: number | null;
  };

  const answersByEntry = new Map<string, typeof bonusAnswers>();
  for (const a of bonusAnswers) {
    if (!answersByEntry.has(a.entry_id as string))
      answersByEntry.set(a.entry_id as string, []);
    answersByEntry.get(a.entry_id as string)!.push(a);
  }

  const bonusParticipants: BonusParticipant[] = [];
  for (const entry of entriesData ?? []) {
    const answers = answersByEntry.get(entry.id as string) ?? [];
    const hasAnyAnswer = answers.some(
      (a) => (a.answer_text as string | null) !== null || (a.answer_number as number | null) !== null
    );
    if (!hasAnyAnswer) continue;

    const correctCount = answers.filter((a) => (a.is_correct as boolean | null) === true).length;
    bonusParticipants.push({
      entryId: entry.id as string,
      displayName: entry.display_name as string,
      correctCount,
      tiebreakerGoals: entry.tiebreaker_total_goals as number | null,
      tiebreakerMinute: entry.tiebreaker_final_minute as number | null,
    });
  }

  bonusParticipants.sort((a, b) => {
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    if (actualTotalGoals !== null) {
      const aDiff = a.tiebreakerGoals !== null ? Math.abs(a.tiebreakerGoals - actualTotalGoals) : Infinity;
      const bDiff = b.tiebreakerGoals !== null ? Math.abs(b.tiebreakerGoals - actualTotalGoals) : Infinity;
      if (aDiff !== bDiff) return aDiff - bDiff;
    }
    if (actualFinalMinute !== null) {
      const aDiff = a.tiebreakerMinute !== null ? Math.abs(a.tiebreakerMinute - actualFinalMinute) : Infinity;
      const bDiff = b.tiebreakerMinute !== null ? Math.abs(b.tiebreakerMinute - actualFinalMinute) : Infinity;
      if (aDiff !== bDiff) return aDiff - bDiff;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  const anyMarkingDone = bonusAnswers.some((a) => (a.is_correct as boolean | null) !== null);

  let bonusWinners: BonusParticipant[] = [];
  if (bonusFinalized && bonusParticipants.length > 0) {
    const top = bonusParticipants[0];
    bonusWinners = bonusParticipants.filter((p) => {
      if (p.correctCount !== top.correctCount) return false;
      if (actualTotalGoals !== null) {
        const topDiff = top.tiebreakerGoals !== null ? Math.abs(top.tiebreakerGoals - actualTotalGoals) : Infinity;
        const pDiff = p.tiebreakerGoals !== null ? Math.abs(p.tiebreakerGoals - actualTotalGoals) : Infinity;
        if (topDiff !== pDiff) return false;
      }
      if (actualFinalMinute !== null) {
        const topDiff = top.tiebreakerMinute !== null ? Math.abs(top.tiebreakerMinute - actualFinalMinute) : Infinity;
        const pDiff = p.tiebreakerMinute !== null ? Math.abs(p.tiebreakerMinute - actualFinalMinute) : Infinity;
        if (topDiff !== pDiff) return false;
      }
      return true;
    });
  }

  const visibleBonusRows = bonusParticipants.slice(0, 10);
  const hasBonusMore = bonusParticipants.length > 10;

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <Link
          href={`/pools/${pool.join_code}`}
          className="text-sm text-text-muted hover:text-text"
        >
          ← {pool.name}
        </Link>
        <h1 className="font-display mt-1 text-3xl text-text">Leaderboard</h1>
      </div>

      <div className="mt-8">
        {allRows.length === 0 ? (
          <EmptyState
            title="No entries yet"
            description={poolLocked ? "Standings update automatically after each match is scored." : "Entries will appear here once players submit their picks."}
            actions={[
              { label: "Back to dashboard", href: `/pools/${pool.join_code}`, variant: "ghost" },
            ]}
          />
        ) : (
          <>
            <div className="space-y-2">
              {visibleRows.map((row) => (
                <LeaderboardRow
                  key={row.entryId}
                  {...row}
                  poolCode={pool.join_code}
                  isTied={isTied(row.points)}
                  actualTotalGoals={actualTotalGoals}
                  actualFinalMinute={actualFinalMinute}
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-4 text-center">
                <Link
                  href={`/pools/${pool.join_code}/leaderboard/all`}
                  className="text-sm text-text-muted hover:text-text"
                >
                  View all {allRows.length} entries →
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bonus pool section — only shown when anyone participated */}
      {bonusParticipants.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-xl text-text">Bonus pool</h2>

          {!anyMarkingDone ? (
            <p className="mt-4 text-sm text-text-muted">
              Bonus pool results will appear once the owner finalizes answers.
            </p>
          ) : (
            <>
              {bonusFinalized && bonusWinners.length > 0 && (
                <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
                  <p className="text-sm font-semibold text-accent">
                    {bonusWinners.length === 1
                      ? `Winner: ${bonusWinners[0].displayName}`
                      : `Winners: ${bonusWinners.map((w) => w.displayName).join(", ")} (tied)`}
                  </p>
                </div>
              )}

              <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
                <div className="divide-y divide-border">
                  {visibleBonusRows.map((row, i) => (
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

              {hasBonusMore && (
                <div className="mt-4 text-center">
                  <Link
                    href={`/pools/${pool.join_code}/leaderboard/bonus`}
                    className="text-sm text-text-muted hover:text-text"
                  >
                    View all bonus entries →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
