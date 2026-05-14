import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import JoinPoolForm from "./JoinPoolForm";

export default async function JoinPoolPage({
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
    .select("id, name, description, join_code, status, owner_id")
    .eq("join_code", code.toUpperCase())
    .maybeSingle();

  if (!pool) notFound();

  if (user?.id === pool.owner_id) {
    redirect(`/pools/${pool.join_code}`);
  }

  const { data: existingEntry } = await supabase
    .from("entries")
    .select("id, submitted_at")
    .eq("pool_id", pool.id)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (existingEntry) {
    if (existingEntry.submitted_at) {
      redirect(`/pools/${pool.join_code}/entries/${existingEntry.id}`);
    } else {
      redirect(`/pools/${pool.join_code}/entries/new`);
    }
  }

  if (existingEntry) {
    redirect(`/pools/${pool.join_code}/entries/${existingEntry.id}`);
  }

  if (pool.status === "locked" || pool.status === "completed") {
    return (
      <div className="mx-auto max-w-lg pt-16 text-center">
        <p className="font-display text-xl text-text">{pool.name}</p>
        <p className="mt-4 text-sm text-text-muted">
          This pool is no longer accepting entries.
        </p>
      </div>
    );
  }

  const defaultDisplayName = user!.email?.split("@")[0] ?? "";

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-3xl text-text">Join {pool.name}</h1>
      {pool.description && (
        <p className="mt-2 text-sm text-text-muted">{pool.description}</p>
      )}
      <JoinPoolForm
        poolId={pool.id}
        poolCode={pool.join_code}
        defaultDisplayName={defaultDisplayName}
      />
    </div>
  );
}