import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  if (pool.owner_id !== user?.id) {
    return (
      <div className="mx-auto max-w-lg pt-16 text-center">
        <p className="text-text-muted">You don&apos;t have access to this pool.</p>
        <Link
          href="/my-entries"
          className="mt-4 inline-block text-sm text-primary hover:text-primary-bright"
        >
          Back to my entries
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-3xl text-text">{pool.name}</h1>
      <p className="mt-1 text-sm text-text-muted">Status: {pool.status}</p>

      <div className="mt-8 rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-sm text-text-muted">Share this code with participants</p>
        <p className="mt-3 font-display text-5xl tracking-[0.2em] text-primary">
          {pool.join_code}
        </p>
      </div>

      {pool.description && (
        <p className="mt-6 text-sm text-text-muted">{pool.description}</p>
      )}

      <p className="mt-10 text-center text-sm text-text-muted">
        Pool dashboard coming soon — entries will appear here as people join.
      </p>
    </div>
  );
}
