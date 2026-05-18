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
    .select("id, display_name, submitted_at, user_id")
    .eq("pool_id", pool.id)
    .order("submitted_at", { ascending: true, nullsFirst: true });

  const allEntries = entriesData ?? [];
  const myEntry = allEntries.find((e) => e.user_id === user?.id) ?? null;
  const submittedCount = allEntries.filter((e) => e.submitted_at).length;

  const [{ data: standingsPreviewData }, { data: myStandingData }] = await Promise.all([
    supabase
      .from("standings_cache")
      .select("entry_id, points, rank, entries(display_name)")
      .eq("pool_id", pool.id)
      .order("rank", { ascending: true })
      .limit(5),
    myEntry
      ? supabase
          .from("standings_cache")
          .select("entry_id, points, rank")
          .eq("pool_id", pool.id)
          .eq("entry_id", myEntry.id as string)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const topStandings = standingsPreviewData ?? [];
  const myStanding = myStandingData ?? null;

  // Build a reliable entry-id → isMe lookup from allEntries (same source the leaderboard uses)
  const myEntryId = myEntry ? String(myEntry.id) : null;

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
          const submittedEntries = allEntries
            .filter((e) => e.submitted_at)
            .sort((a, b) => (a.display_name as string).localeCompare(b.display_name as string))
            .slice(0, 5);

          // Shared row renderer used in both standings and pre-standings list
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

          if (topStandings.length > 0) {
            const myInTop5 = myEntryId !== null && topStandings.some(
              (r) => String(r.entry_id) === myEntryId
            );
            const showMyRow = !myInTop5 && myStanding !== null && myEntry !== null;

            return (
              <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface divide-y divide-border">
                {topStandings.map((row) => {
                  const entry = row.entries as unknown as { display_name: string } | null;
                  const isMe = myEntryId !== null && String(row.entry_id) === myEntryId;
                  return (
                    <PreviewRow
                      key={row.entry_id as string}
                      entryId={row.entry_id as string}
                      displayName={entry?.display_name ?? "—"}
                      rank={row.rank as number}
                      points={row.points as number}
                      isMe={isMe}
                    />
                  );
                })}

                {showMyRow && (
                  <>
                    <div className="flex items-center gap-4 px-4 py-1">
                      <span className="w-6 text-center text-xs text-text-subtle">·</span>
                      <span className="text-xs text-text-subtle">···</span>
                    </div>
                    <PreviewRow
                      entryId={String(myEntry!.id)}
                      displayName={String(myEntry!.display_name)}
                      rank={myStanding!.rank as number}
                      points={myStanding!.points as number}
                      isMe={true}
                    />
                  </>
                )}
              </div>
            );
          }

          if (submittedEntries.length > 0) {
            return (
              <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface divide-y divide-border">
                {submittedEntries.map((e) => (
                  <PreviewRow
                    key={e.id as string}
                    entryId={String(e.id)}
                    displayName={String(e.display_name)}
                    rank={null}
                    points={null}
                    isMe={myEntryId !== null && String(e.id) === myEntryId}
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
