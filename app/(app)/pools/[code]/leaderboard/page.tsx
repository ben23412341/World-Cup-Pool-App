import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    .select("id, name, join_code, owner_id, status")
    .eq("join_code", code.toUpperCase())
    .single();

  if (!pool) notFound();

  const poolUnlocked = pool.status === "locked" || pool.status === "completed";

  const { data: standingsRows } = await supabase
    .from("standings_cache")
    .select("entry_id, points, rank, entries(display_name, user_id)")
    .eq("pool_id", pool.id)
    .order("rank", { ascending: true });

  const standings = standingsRows ?? [];

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
        {standings.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface px-6 py-12 text-center">
            <p className="text-text-muted">
              The leaderboard will appear here once the tournament starts.
            </p>
            <p className="mt-3 text-sm text-text-subtle">
              Until then, you can review entries on the{" "}
              <Link
                href={`/pools/${pool.join_code}`}
                className="text-primary hover:text-primary-bright"
              >
                dashboard
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {standings.map((row) => {
              const entry = row.entries as unknown as {
                display_name: string;
                user_id: string;
              } | null;
              const isMe = user?.id === entry?.user_id;
              const isFirst = row.rank === 1;

              return (
                <div
                  key={row.entry_id}
                  className={
                    "relative flex items-center gap-4 overflow-hidden rounded-lg border px-4 py-3 " +
                    (isFirst ? "border-accent/30 bg-accent/5" : "border-border bg-surface")
                  }
                >
                  {isMe && (
                    <div className="absolute bottom-0 left-0 top-0 w-0.5 bg-primary" />
                  )}

                  {/* Rank */}
                  <div
                    className={
                      "w-8 flex-shrink-0 font-mono text-sm tabular-nums " +
                      (isFirst ? "text-accent" : "text-text-muted")
                    }
                  >
                    {isFirst ? (
                      <span className="flex items-center gap-1">
                        <TrophyIcon />
                        {row.rank}
                      </span>
                    ) : (
                      row.rank
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex flex-1 items-center gap-2">
                    {poolUnlocked ? (
                      <Link
                        href={`/pools/${pool.join_code}/entries/${row.entry_id}`}
                        className="text-sm font-medium text-text hover:text-primary"
                      >
                        {entry?.display_name ?? "—"}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-text">
                        {entry?.display_name ?? "—"}
                      </span>
                    )}
                    {isMe && (
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">
                        YOU
                      </span>
                    )}
                  </div>

                  {/* Points */}
                  <div
                    className={
                      "w-12 flex-shrink-0 text-right font-mono text-sm tabular-nums " +
                      (isFirst ? "text-accent font-semibold" : "text-text")
                    }
                  >
                    {row.points}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TrophyIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94C8.02 14.21 9.87 15.7 12 16v2H9v2h6v-2h-3v-2c2.13-.3 3.98-1.79 4.61-3.06C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
    </svg>
  );
}
