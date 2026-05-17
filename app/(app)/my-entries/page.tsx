import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "My entries — World Cup Pool" };

const POOL_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  open: "Open",
  locked: "Locked",
  completed: "Completed",
};

export default async function MyEntriesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: entriesData } = await supabase
    .from("entries")
    .select("id, display_name, submitted_at, pools(name, join_code, status)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const entries = entriesData ?? [];

  return (
    <div>
      <h1 className="font-display text-3xl text-text">My entries</h1>

      {entries.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No pools yet"
            description="Join an existing pool with a code, or create your own."
            actions={[
              { label: "Join a pool", href: "/join", variant: "primary" },
              { label: "Create a pool", href: "/pools/create", variant: "ghost" },
            ]}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {entries.map((entry) => {
            const pool = entry.pools as unknown as {
              name: string;
              join_code: string;
              status: string;
            } | null;
            if (!pool) return null;

            const isSubmitted = !!entry.submitted_at;
            const href = isSubmitted
              ? `/pools/${pool.join_code}`
              : `/pools/${pool.join_code}/entries/new`;

            const submittedDate = entry.submitted_at
              ? new Date(entry.submitted_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : null;

            return (
              <Link
                key={entry.id}
                href={href}
                className="block rounded-lg border border-border bg-surface px-5 py-4 transition-colors hover:bg-surface-elevated"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-text">{pool.name}</p>
                    <p className="mt-0.5 text-sm text-text-muted">
                      {entry.display_name}
                      {submittedDate && ` · Submitted ${submittedDate}`}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className="text-xs text-text-subtle">
                      {POOL_STATUS_LABEL[pool.status] ?? pool.status}
                    </span>
                    <span
                      className={
                        "rounded-full px-2.5 py-0.5 text-xs font-medium " +
                        (isSubmitted
                          ? "bg-primary/15 text-primary"
                          : "bg-surface-elevated text-text-muted")
                      }
                    >
                      {isSubmitted ? "Submitted" : "In progress"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
