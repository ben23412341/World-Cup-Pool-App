import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RemoveEntryClient } from "./RemoveEntryClient";

export default async function RemoveEntryPage({
  params,
}: {
  params: Promise<{ code: string; id: string }>;
}) {
  const { code, id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: pool } = await supabase
    .from("pools")
    .select("id, name, join_code, owner_id")
    .eq("join_code", code.toUpperCase())
    .single();

  if (!pool) notFound();

  // Only the pool owner can access this page
  if (pool.owner_id !== user.id) notFound();

  const { data: entry } = await supabase
    .from("entries")
    .select("id, pool_id, user_id, display_name, submitted_at")
    .eq("id", id)
    .single();

  if (!entry || entry.pool_id !== pool.id) notFound();

  // Owner cannot remove their own entry this way
  if (entry.user_id === user.id) notFound();

  const { data: teamRows } = await supabase
    .from("entry_teams")
    .select("team_id")
    .eq("entry_id", id);

  const teamCount = (teamRows ?? []).length;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/pools/${pool.join_code}/entries/${entry.id}`}
          className="text-sm text-text-muted hover:text-text"
        >
          ← Back to entry
        </Link>
      </div>

      <h1 className="font-display text-2xl text-text">Remove entry from pool</h1>
      <p className="mt-1 text-sm text-text-muted">
        Removing{" "}
        <span className="font-medium text-text">
          {entry.display_name as string}
        </span>{" "}
        from{" "}
        <span className="font-medium text-text">{pool.name}</span>
      </p>

      <div className="mt-8">
        <RemoveEntryClient
          entryId={entry.id as string}
          poolCode={pool.join_code as string}
          displayName={entry.display_name as string}
          teamCount={teamCount}
          submittedAt={entry.submitted_at as string | null}
        />
      </div>
    </div>
  );
}
