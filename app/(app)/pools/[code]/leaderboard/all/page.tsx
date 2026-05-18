import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LeaderboardRow } from "../LeaderboardRow";

export default async function LeaderboardAllPage({
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
      "id, name, join_code, owner_id, status, actual_total_goals, actual_final_first_goal_minute"
    )
    .eq("join_code", code.toUpperCase())
    .single();

  if (!pool) notFound();

  const poolLocked = pool.status === "locked" || pool.status === "completed";
  if (!poolLocked) redirect(`/pools/${pool.join_code}/leaderboard`);

  const [{ data: entriesData }, { data: cacheData }] = await Promise.all([
    supabase
      .from("entries")
      .select("id, display_name, user_id, tiebreaker_total_goals, tiebreaker_final_minute")
      .eq("pool_id", pool.id)
      .not("submitted_at", "is", null)
      .order("display_name"),
    supabase
      .from("standings_cache")
      .select("entry_id, points, rank")
      .eq("pool_id", pool.id),
  ]);

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

  const displayRanks = new Map<string, number>();
  for (let i = 0; i < allRows.length; i++) {
    if (i === 0) { displayRanks.set(allRows[i].entryId, 1); continue; }
    const prev = allRows[i - 1];
    const curr = allRows[i];
    let tiedWithPrev = prev.points === curr.points;
    if (tiedWithPrev && actualTotalGoals !== null) {
      const pd = prev.tiebreakerGoals !== null ? Math.abs(prev.tiebreakerGoals - actualTotalGoals) : Infinity;
      const cd = curr.tiebreakerGoals !== null ? Math.abs(curr.tiebreakerGoals - actualTotalGoals) : Infinity;
      if (pd !== cd) tiedWithPrev = false;
    }
    if (tiedWithPrev && actualFinalMinute !== null) {
      const pd = prev.tiebreakerMinute !== null ? Math.abs(prev.tiebreakerMinute - actualFinalMinute) : Infinity;
      const cd = curr.tiebreakerMinute !== null ? Math.abs(curr.tiebreakerMinute - actualFinalMinute) : Infinity;
      if (pd !== cd) tiedWithPrev = false;
    }
    displayRanks.set(curr.entryId, tiedWithPrev ? displayRanks.get(prev.entryId)! : i + 1);
  }

  const pointsCounts = new Map<number, number>();
  allRows.forEach((r) =>
    pointsCounts.set(r.points, (pointsCounts.get(r.points) ?? 0) + 1)
  );
  const isTied = (pts: number) => (pointsCounts.get(pts) ?? 0) > 1;

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <Link
          href={`/pools/${pool.join_code}/leaderboard`}
          className="text-sm text-text-muted hover:text-text"
        >
          ← Back to leaderboard
        </Link>
        <h1 className="font-display mt-1 text-3xl text-text">All entries</h1>
        <p className="mt-1 text-sm text-text-muted">{allRows.length} entries</p>
      </div>

      <div className="mt-8 space-y-2">
        {allRows.map((row) => (
          <LeaderboardRow
            key={row.entryId}
            {...row}
            rank={displayRanks.get(row.entryId) ?? null}
            poolCode={pool.join_code}
            isTied={isTied(row.points)}
            actualTotalGoals={actualTotalGoals}
            actualFinalMinute={actualFinalMinute}
          />
        ))}
      </div>
    </div>
  );
}
