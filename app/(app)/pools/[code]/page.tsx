import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CopyButton } from "@/components/pool/CopyButton";

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

  const { data: pool } = await supabase
    .from("pools")
    .select("id, name, description, join_code, owner_id, status, locks_at")
    .eq("join_code", code.toUpperCase())
    .single();

  if (!pool) notFound();

  const isOwner = user?.id === pool.owner_id;
  const poolUnlocked = pool.status === "locked" || pool.status === "completed";

  // RLS: owner sees all entries; member sees only their own
  const { data: entriesData } = await supabase
    .from("entries")
    .select("id, display_name, submitted_at, user_id")
    .eq("pool_id", pool.id)
    .order("submitted_at", { ascending: true, nullsFirst: true });

  const allEntries = entriesData ?? [];
  const myEntry = allEntries.find((e) => e.user_id === user?.id) ?? null;
  const submittedCount = allEntries.filter((e) => e.submitted_at).length;

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

      {/* Join code card */}
      <div className="mt-6 rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-text-muted">Join code</p>
            <p className="mt-1 font-mono text-3xl tracking-[0.25em] text-primary">
              {pool.join_code}
            </p>
          </div>
          <CopyButton text={pool.join_code} />
        </div>

        {isOwner && (
          <p className="mt-3 border-t border-border pt-3 text-sm text-text-muted">
            {allEntries.length}{" "}
            {allEntries.length === 1 ? "entry" : "entries"} joined,{" "}
            {submittedCount} submitted
          </p>
        )}

        {!isOwner && myEntry && (
          <p className="mt-3 border-t border-border pt-3 text-sm text-text-muted">
            Your entry:{" "}
            {myEntry.submitted_at ? (
              <>
                <span className="text-primary">submitted</span>
                {" · "}
                <Link
                  href={`/pools/${pool.join_code}/entries/${myEntry.id}`}
                  className="text-primary hover:text-primary-bright"
                >
                  View
                </Link>
              </>
            ) : (
              <>
                <span className="text-text-muted">in progress</span>
                {" · "}
                <Link
                  href={`/pools/${pool.join_code}/entries/new`}
                  className="text-primary hover:text-primary-bright"
                >
                  Continue
                </Link>
              </>
            )}
          </p>
        )}

        {!isOwner && !myEntry && (
          <p className="mt-3 border-t border-border pt-3 text-sm">
            <Link
              href={`/pools/${pool.join_code}/join`}
              className="text-primary hover:text-primary-bright"
            >
              Join this pool →
            </Link>
          </p>
        )}
      </div>

      {/* Entries section */}
      <section className="mt-8">
        <h2 className="font-display text-xl text-text">Entries</h2>
        {allEntries.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">
            No entries yet. Share the join code to get started.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {allEntries.map((entry) => {
              const isSubmitted = !!entry.submitted_at;
              const canLink = isOwner || poolUnlocked;
              const dateLabel = entry.submitted_at
                ? `Submitted ${new Date(entry.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                : "Joined";

              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
                >
                  <div>
                    {canLink && isSubmitted ? (
                      <Link
                        href={`/pools/${pool.join_code}/entries/${entry.id}`}
                        className="text-sm font-medium text-text hover:text-primary"
                      >
                        {entry.display_name}
                      </Link>
                    ) : (
                      <span
                        className="text-sm font-medium text-text"
                        title={!canLink && isSubmitted ? "Visible after pool locks" : undefined}
                      >
                        {entry.display_name}
                      </span>
                    )}
                    <p className="mt-0.5 text-xs text-text-subtle">{dateLabel}</p>
                  </div>
                  <span
                    className={
                      "rounded-full px-2.5 py-0.5 text-xs font-medium " +
                      (isSubmitted
                        ? "bg-primary/15 text-primary"
                        : "bg-surface-elevated text-text-muted")
                    }
                  >
                    {isSubmitted ? "submitted" : "joined"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Leaderboard preview */}
      <section className="mt-8">
        <h2 className="font-display text-xl text-text">Leaderboard preview</h2>
        <p className="mt-4 text-sm text-text-muted">
          The leaderboard will appear here once the tournament starts.
        </p>
      </section>

      {/* Pool settings (owner only) */}
      {isOwner && (
        <div className="mt-10 border-t border-border pt-6">
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
