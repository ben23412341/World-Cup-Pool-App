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
    .select("id, name, description, join_code, owner_id, status, locks_at, status_changed_at, previous_status")
    .eq("join_code", code.toUpperCase())
    .single();

  if (!rawPool) notFound();

  const pool = await maybeAutoLock(supabase, rawPool);

  const isOwner = user?.id === pool.owner_id;
  const poolUnlocked = pool.status === "locked" || pool.status === "completed";
  const showJoinCode = pool.status === "draft" || pool.status === "open";

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
    .select("id, display_name, submitted_at, user_id")
    .eq("pool_id", pool.id)
    .order("submitted_at", { ascending: true, nullsFirst: true });

  const allEntries = entriesData ?? [];
  const myEntry = allEntries.find((e) => e.user_id === user?.id) ?? null;
  const submittedCount = allEntries.filter((e) => e.submitted_at).length;

  const { data: standingsPreviewData } = await supabase
    .from("standings_cache")
    .select("entry_id, points, rank, entries(display_name)")
    .eq("pool_id", pool.id)
    .order("rank", { ascending: true })
    .limit(5);

  const topStandings = standingsPreviewData ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-text">{pool.name}</h1>
          {pool.description && (
            <p className="mt-1 text-sm text-text-muted">{pool.description}</p>
          )}
        </div>
        <Link
          href={`/pools/${pool.join_code}/leaderboard`}
          className="flex-shrink-0 rounded-md border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
        >
          Leaderboard
        </Link>
      </div>

      {/* Join code / status card */}
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

        {isOwner && (
          <p className="mt-3 border-t border-border pt-3 text-sm text-text-muted">
            {allEntries.length}{" "}
            {allEntries.length === 1 ? "entry" : "entries"} joined,{" "}
            {submittedCount} submitted
          </p>
        )}


        {isOwner && (
          <PoolStatusControls
            poolCode={pool.join_code}
            status={pool.status}
            statusChangedAt={pool.status_changed_at ?? null}
            previousStatus={pool.previous_status ?? null}
          />
        )}
      </div>

      {/* My entry section */}
      <section className="mt-8">
        <h2 className="font-display text-xl text-text">My entry</h2>

        <div className="mt-4">
          {myEntry ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
              <div>
                <p className="text-sm font-medium text-text">{myEntry.display_name}</p>
                <p className="mt-0.5 text-xs text-text-subtle">
                  {myEntry.submitted_at
                    ? `Submitted ${new Date(myEntry.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                    : "In progress"}
                </p>
              </div>
              <div className="flex items-center gap-3">
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

        <div className="mt-4">
          {poolUnlocked ? (
            <Link
              href={`/pools/${pool.join_code}/leaderboard`}
              className="text-sm text-primary hover:text-primary-bright"
            >
              View leaderboard →
            </Link>
          ) : (
            <p className="text-sm text-text-subtle">
              Leaderboard will be available once the pool locks.
            </p>
          )}
        </div>
      </section>

      {/* Leaderboard preview */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-text">Leaderboard preview</h2>
          {topStandings.length > 0 && (
            <Link
              href={`/pools/${pool.join_code}/leaderboard`}
              className="text-sm text-text-muted hover:text-text"
            >
              View all →
            </Link>
          )}
        </div>

        {topStandings.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">
            The leaderboard will appear here once the tournament starts.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface divide-y divide-border">
            {topStandings.map((row) => {
              const entry = row.entries as unknown as { display_name: string } | null;
              const isFirst = row.rank === 1;
              return (
                <div key={row.entry_id} className="flex items-center gap-4 px-4 py-2.5">
                  <span
                    className={
                      "w-6 flex-shrink-0 text-right font-mono text-sm tabular-nums " +
                      (isFirst ? "text-accent" : "text-text-muted")
                    }
                  >
                    {row.rank}
                  </span>
                  <span className="flex-1 text-sm text-text">
                    {entry?.display_name ?? "—"}
                  </span>
                  <span className="font-mono text-sm tabular-nums text-text-muted">
                    {row.points} pts
                  </span>
                </div>
              );
            })}
          </div>
        )}
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
