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

  allRows.sort((a, b) => {
    if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
    if (a.rank !== null) return -1;
    if (b.rank !== null) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  const pointsCounts = new Map<number, number>();
  allRows.forEach((r) =>
    pointsCounts.set(r.points, (pointsCounts.get(r.points) ?? 0) + 1)
  );
  const isTied = (pts: number) => (pointsCounts.get(pts) ?? 0) > 1;

  const actualTotalGoals = pool.actual_total_goals as number | null;
  const actualFinalMinute = pool.actual_final_first_goal_minute as number | null;

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
