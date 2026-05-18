import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { maybeAutoLock } from "@/lib/pools/auto-lock";
import { CopyButton } from "@/components/pool/CopyButton";
import { PoolStatusControls } from "./PoolStatusControls";
import { EmptyState } from "@/components/ui/EmptyState";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-surface-elevated text-text-muted",
  open: "bg-primary/15 text-primary",
  locked: "bg-accent/15 text-accent",
  completed: "bg-surface-elevated text-text-subtle",
};

export default async function PoolDashboardPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rawPool } = await supabase
    .from("pools")
    .select("id, name, description, join_code, owner_id, status, locks_at, status_changed_at, previous_status, actual_total_goals, actual_final_first_goal_minute")
    .eq("join_code", code.toUpperCase())
    .single();

  if (!rawPool) notFound();

  const pool = await maybeAutoLock(supabase, rawPool);

  const isOwner = user?.id === pool.owner_id;
  const poolUnlocked = pool.status === "locked" || pool.status === "completed";
  const showJoinCode = isOwner && (pool.status === "draft" || pool.status === "open");

  // Non-owner on a draft pool — they can't have joined, show a holding message
  if (!isOwner && pool.status === "draft") {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl text-text">{pool.name}</h1>
        <div className="mt-8 rounded-lg border border-border bg-surface px-6 py-10 text-center">
          <p className="text-text-muted">This pool isn't open yet.</p>
          <p className="mt-2 text-sm text-text-subtle">
            Check back once the organizer opens entries.
          </p>
        </div>
      </div>
    );
  }

  // RLS: owner sees all entries; member sees only their own
  const { data: entriesData } = await supabase
    .from("entries")
    .select("id, display_name, submitted_at, user_id, tiebreaker_total_goals, tiebreaker_final_minute")
    .eq("pool_id", pool.id)
    .order("submitted_at", { ascending: true, nullsFirst: true });

  const allEntries = entriesData ?? [];
  const myEntry = allEntries.find((e) => e.user_id === user?.id) ?? null;
  const submittedCount = allEntries.filter((e) => e.submitted_at).length;

  const { data: standingsData } = await supabase
    .from("standings_cache")
    .select("entry_id, points")
    .eq("pool_id", pool.id);

  const pointsMap = new Map((standingsData ?? []).map((r) => [r.entry_id as string, r.points as number]));
  const actualTotalGoals = pool.actual_total_goals as number | null;
  const actualFinalMinute = pool.actual_final_first_goal_minute as number | null;

  const sortableRows = allEntries
    .filter((e) => e.submitted_at)
    .map((e) => ({
      entryId: e.id as string,
      displayName: e.display_name as string,
      isMe: e.user_id === user?.id,
      points: pointsMap.get(e.id as string) ?? 0,
      tiebreakerGoals: e.tiebreaker_total_goals as number | null,
      tiebreakerMinute: e.tiebreaker_final_minute as number | null,
    }));

  sortableRows.sort((a, b) => {
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

  const rankMap = new Map<string, number>();
  for (let i = 0; i < sortableRows.length; i++) {
    if (i === 0) { rankMap.set(sortableRows[i].entryId, 1); continue; }
    const prev = sortableRows[i - 1];
    const curr = sortableRows[i];
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
    rankMap.set(curr.entryId, tiedWithPrev ? rankMap.get(prev.entryId)! : i + 1);
  }

  const rankedRows = sortableRows.map((r) => ({ ...r, rank: rankMap.get(r.entryId) ?? null }));
  const previewRows = rankedRows.slice(0, 5);
  const myRankedRow = rankedRows.find((r) => r.isMe) ?? null;
  const myStanding = myRankedRow ? { rank: myRankedRow.rank, points: myRankedRow.points } : null;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl text-text">{pool.name}</h1>
            {!isOwner && (
              <span
                className={
                  "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize " +
                  (STATUS_BADGE[pool.status] ?? STATUS_BADGE.draft)
                }
              >
                {pool.status}
              </span>
            )}
          </div>
          {pool.description && (
            <p className="mt-1 text-sm text-text-muted">{pool.description}</p>
          )}
          {pool.locks_at && (pool.status === "open" || pool.status === "draft") && (
            <p className="mt-1 text-sm text-text-subtle">
              Locks{" "}
              {new Date(pool.locks_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZone: "America/New_York",
                timeZoneName: "short",
              })}
            </p>
          )}
        </div>
        <Link
          href={`/pools/${pool.join_code}/leaderboard`}
          className="flex-shrink-0 rounded-md border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
        >
          Leaderboard
        </Link>
      </div>

      {/* Owner-only: join code card + status controls */}
      {isOwner && (
        <div className="mt-6 rounded-lg border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {showJoinCode && (
                  <p className="text-xs text-text-muted">Join code</p>
                )}
                <span
                  className={
                    "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize " +
                    (STATUS_BADGE[pool.status] ?? STATUS_BADGE.draft)
                  }
                >
                  {pool.status}
                </span>
              </div>

              {showJoinCode ? (
                <p className="mt-1 font-mono text-3xl tracking-[0.25em] text-primary">
                  {pool.join_code}
                </p>
              ) : (
                <p className="mt-2 text-sm text-text-subtle">
                  {pool.status === "locked"
                    ? "Pool is locked — no new entries."
                    : "Pool is complete — final standings are frozen."}
                </p>
              )}
            </div>

            {showJoinCode && <CopyButton text={pool.join_code} />}
          </div>

          <p className="mt-3 border-t border-border pt-3 text-sm text-text-muted">
            {allEntries.length}{" "}
            {allEntries.length === 1 ? "entry" : "entries"} joined,{" "}
            {submittedCount} submitted
          </p>

          <PoolStatusControls
            poolCode={pool.join_code}
            status={pool.status}
            statusChangedAt={pool.status_changed_at ?? null}
            previousStatus={pool.previous_status ?? null}
          />
        </div>
      )}

      {/* My entry section */}
      <section className="mt-8">
        <h2 className="font-display text-xl text-text">My entry</h2>

        <div className="mt-4">
          {myEntry ? (
            <div className="flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3">
              <span
                className={
                  "w-6 flex-shrink-0 text-right font-mono text-sm tabular-nums " +
                  (myStanding?.rank === 1 ? "text-accent" : "text-text-muted")
                }
              >
                {myStanding?.rank ?? "—"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text">{myEntry.display_name}</p>
                <p className="mt-0.5 text-xs text-text-subtle">
                  {myEntry.submitted_at
                    ? `Submitted ${new Date(myEntry.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                    : "In progress"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {myStanding && myEntry.submitted_at && (
                  <span className="font-mono text-sm tabular-nums text-text">
                    {myStanding.points} pts
                  </span>
                )}
                <span
                  className={
                    "rounded-full px-2.5 py-0.5 text-xs font-medium " +
                    (myEntry.submitted_at
                      ? "bg-primary/15 text-primary"
                      : "bg-surface-elevated text-text-muted")
                  }
                >
                  {myEntry.submitted_at ? "submitted" : "in progress"}
                </span>
                {myEntry.submitted_at ? (
                  <Link
                    href={`/pools/${pool.join_code}/entries/${myEntry.id}`}
                    className="text-sm text-primary hover:text-primary-bright"
                  >
                    View →
                  </Link>
                ) : (
                  <Link
                    href={`/pools/${pool.join_code}/entries/new`}
                    className="text-sm text-primary hover:text-primary-bright"
                  >
                    Continue →
                  </Link>
                )}
              </div>
            </div>
          ) : pool.status === "open" ? (
            <div className="rounded-lg border border-border bg-surface px-4 py-3">
              <p className="text-sm text-text-muted">
                You haven&apos;t submitted an entry yet.{" "}
                <Link
                  href={`/pools/${pool.join_code}/join`}
                  className="text-primary hover:text-primary-bright"
                >
                  Join this pool →
                </Link>
              </p>
            </div>
          ) : (
            <p className="text-sm text-text-muted">You haven&apos;t submitted an entry.</p>
          )}
        </div>

      </section>

      {/* Owner: all entries list */}
      {isOwner && (
        <section className="mt-8">
          <h2 className="font-display text-xl text-text">All entries</h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface divide-y divide-border">
            {allEntries.length === 0 ? (
              <p className="px-4 py-4 text-sm text-text-muted">No entries yet.</p>
            ) : (
              allEntries.map((e) => (
                <div key={e.id as string} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{e.display_name as string}</p>
                    <p className="mt-0.5 text-xs text-text-subtle">
                      {e.submitted_at
                        ? `Submitted ${new Date(e.submitted_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                        : "In progress"}
                    </p>
                  </div>
                  <span
                    className={
                      "flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium " +
                      (e.submitted_at
                        ? "bg-primary/15 text-primary"
                        : "bg-surface-elevated text-text-muted")
                    }
                  >
                    {e.submitted_at ? "submitted" : "in progress"}
                  </span>
                  <Link
                    href={`/pools/${pool.join_code}/entries/${e.id}`}
                    className="flex-shrink-0 text-sm text-primary hover:text-primary-bright"
                  >
                    View →
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Leaderboard preview */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-text">Leaderboard preview</h2>
          <Link
            href={`/pools/${pool.join_code}/leaderboard`}
            className="text-sm text-primary hover:text-primary-bright"
          >
            View leaderboard →
          </Link>
        </div>

        {(() => {
          const PreviewRow = ({
            entryId,
            displayName,
            rank,
            points,
            isMe,
          }: {
            entryId: string;
            displayName: string;
            rank: number | null;
            points: number | null;
            isMe: boolean;
          }) => (
            <Link
              href={`/pools/${pool.join_code}/entries/${entryId}`}
              className="relative flex items-center gap-4 overflow-hidden px-4 py-2.5 transition-colors hover:bg-surface-elevated"
            >
              {isMe && (
                <div className="absolute bottom-0 left-0 top-0 w-0.5 bg-primary" />
              )}
              <span
                className={
                  "w-6 flex-shrink-0 text-right font-mono text-sm tabular-nums " +
                  (rank === 1 ? "text-accent" : "text-text-muted")
                }
              >
                {rank ?? "—"}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate text-sm text-text">{displayName}</span>
                {isMe && (
                  <span className="flex-shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">
                    YOU
                  </span>
                )}
              </span>
              <span className="font-mono text-sm tabular-nums text-text-muted">
                {points !== null ? `${points} pts` : "0 pts"}
              </span>
            </Link>
          );

          if (previewRows.length > 0) {
            const myInTop5 = myRankedRow !== null && previewRows.some((r) => r.entryId === myRankedRow!.entryId);
            const showMyRow = !myInTop5 && myRankedRow !== null;

            return (
              <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface divide-y divide-border">
                {previewRows.map((row) => (
                  <PreviewRow
                    key={row.entryId}
                    entryId={row.entryId}
                    displayName={row.displayName}
                    rank={row.rank}
                    points={row.points}
                    isMe={row.isMe}
                  />
                ))}

                {showMyRow && (
                  <>
                    <div className="flex items-center gap-4 px-4 py-1">
                      <span className="w-6 text-center text-xs text-text-subtle">·</span>
                      <span className="text-xs text-text-subtle">···</span>
                    </div>
                    <PreviewRow
                      entryId={myRankedRow!.entryId}
                      displayName={myRankedRow!.displayName}
                      rank={myRankedRow!.rank}
                      points={myRankedRow!.points}
                      isMe={true}
                    />
                  </>
                )}
              </div>
            );
          }

          if (allEntries.some((e) => e.submitted_at)) {
            return (
              <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface divide-y divide-border">
                {allEntries.filter((e) => e.submitted_at).slice(0, 5).map((e) => (
                  <PreviewRow
                    key={e.id as string}
                    entryId={String(e.id)}
                    displayName={String(e.display_name)}
                    rank={null}
                    points={null}
                    isMe={e.user_id === user?.id}
                  />
                ))}
              </div>
            );
          }

          return (
            <p className="mt-4 text-sm text-text-muted">
              No entries yet.
            </p>
          );
        })()}
      </section>

      {/* Owner links */}
      {isOwner && (
        <div className="mt-10 flex flex-wrap gap-6 border-t border-border pt-6">
          <Link
            href={`/pools/${pool.join_code}/matches/admin`}
            className="text-sm text-text-muted transition-colors hover:text-text"
          >
            Manage matches →
          </Link>
          <Link
            href={`/pools/${pool.join_code}/tiebreakers/admin`}
            className="text-sm text-text-muted transition-colors hover:text-text"
          >
            Manage tiebreakers →
          </Link>
          <Link
            href={`/pools/${pool.join_code}/bonus/admin`}
            className="text-sm text-text-muted transition-colors hover:text-text"
          >
            Manage bonus pool →
          </Link>
          <Link
            href={`/pools/${pool.join_code}/settings`}
            className="text-sm text-text-muted transition-colors hover:text-text"
          >
            Pool settings →
          </Link>
        </div>
      )}
    </div>
  );
}
