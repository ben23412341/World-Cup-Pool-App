import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type BonusQuestion = {
  id: number;
  text: string;
  type: "team" | "text" | "number";
};

export default async function EntryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string; id: string }>;
  searchParams: Promise<{ locked?: string }>;
}) {
  const { code, id } = await params;
  const { locked } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pool } = await supabase
    .from("pools")
    .select("id, name, join_code, owner_id, status, locks_at")
    .eq("join_code", code.toUpperCase())
    .single();

  if (!pool) notFound();

  const { data: entry } = await supabase
    .from("entries")
    .select(
      "id, pool_id, user_id, display_name, submitted_at, tiebreaker_total_goals, tiebreaker_final_minute"
    )
    .eq("id", id)
    .single();

  if (!entry) notFound();
  if (entry.pool_id !== pool.id) notFound();

  const isEntryOwner = user?.id === entry.user_id;
  const isPoolOwner = user?.id === pool.owner_id;
  // Visibility unlocks when the pool status is locked/completed, not merely when
  // locks_at has passed — auto-lock will have updated the status by render time.
  const poolLocked = pool.status === "locked" || pool.status === "completed";
  const canView = isEntryOwner || isPoolOwner || poolLocked;

  if (!canView) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mt-16 rounded-lg border border-border bg-surface px-6 py-12 text-center">
          <p className="text-text-muted">Entry hidden until pool locks.</p>
          <Link
            href={`/pools/${pool.join_code}`}
            className="mt-4 inline-block text-sm text-primary hover:text-primary-bright"
          >
            ← Back to {pool.name}
          </Link>
        </div>
      </div>
    );
  }

  // Separate query so a missing column (pre-migration) doesn't 404 the page.
  const { data: referralRow } = await supabase
    .from("entries")
    .select("referred_by_first_name, referred_by_last_name")
    .eq("id", id)
    .maybeSingle();

  let referredBy: string | null = null;
  if (referralRow?.referred_by_first_name) {
    referredBy = `${referralRow.referred_by_first_name} ${referralRow.referred_by_last_name ?? ""}`.trim();
  } else if (isEntryOwner) {
    // Fallback: read from auth metadata if DB columns not yet populated.
    const meta = user?.user_metadata as Record<string, string> | undefined;
    if (meta?.referred_by_first_name) {
      referredBy = `${meta.referred_by_first_name} ${meta.referred_by_last_name ?? ""}`.trim();
    }
  }

  const { data: standingsRow } = await supabase
    .from("standings_cache")
    .select("rank, points")
    .eq("pool_id", pool.id)
    .eq("entry_id", id)
    .maybeSingle();

  const { data: entryTeamRows } = await supabase
    .from("entry_teams")
    .select("teams!inner(id, name, code, cost)")
    .eq("entry_id", id);

  const entryTeams = (entryTeamRows ?? [])
    .map((row) => row.teams as unknown as { id: string; name: string; code: string; cost: number })
    .sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name));

  const totalCost = entryTeams.reduce((sum, t) => sum + t.cost, 0);

  const { data: bonusAnswers } = await supabase
    .from("entry_bonus_answers")
    .select("question_index, answer_text, answer_number")
    .eq("entry_id", id)
    .order("question_index");

  const hasBonus = (bonusAnswers ?? []).length > 0;

  const { data: settings } = await supabase
    .from("pool_settings")
    .select("bonus_questions, tiebreaker_1_label, tiebreaker_2_label")
    .eq("pool_id", pool.id)
    .maybeSingle();

  const bonusQuestions: BonusQuestion[] = Array.isArray(settings?.bonus_questions)
    ? (settings.bonus_questions as BonusQuestion[])
    : [];

  // Resolve team IDs referenced by team-type bonus answers
  const teamAnswerIds = (bonusAnswers ?? [])
    .filter((a) => {
      const q = bonusQuestions.find((q) => q.id === a.question_index);
      return q?.type === "team" && a.answer_text;
    })
    .map((a) => a.answer_text as string);

  let teamNameMap: Record<string, string> = {};
  if (teamAnswerIds.length > 0) {
    const { data: teamRows } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", teamAnswerIds);
    teamNameMap = Object.fromEntries((teamRows ?? []).map((t) => [t.id, t.name]));
  }

  const submittedLabel = entry.submitted_at
    ? `Submitted ${new Date(entry.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : "In progress";

  const tb1Label =
    settings?.tiebreaker_1_label ??
    "Total goals scored in all 104 tournament games (excluding penalty shootout goals)";
  const tb2Label =
    settings?.tiebreaker_2_label ?? "Minute of the first goal in the Final";

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="font-display text-3xl text-text">{entry.display_name}</h1>
        {standingsRow && (
          <p className="mt-0.5 text-sm text-text-muted">
            Rank #{standingsRow.rank} · {standingsRow.points} points
          </p>
        )}
        <p className="mt-1 text-sm text-text-muted">
          {submittedLabel}
          {" · "}
          <Link
            href={`/pools/${pool.join_code}`}
            className="text-primary hover:text-primary-bright"
          >
            {pool.name}
          </Link>
        </p>
        {referredBy && (
          <p className="mt-0.5 text-sm text-text-muted">
            Referred by {referredBy}
          </p>
        )}
      </div>

      {locked === "1" && (
        <div className="mt-6 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-muted">
          Editing is closed — this pool is locked.
        </div>
      )}

      <section className="mt-10">
        <h2 className="font-display text-xl text-text">Team picks</h2>
        {entryTeams.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">No teams selected.</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {entryTeams.map((team) => (
                <div
                  key={team.id}
                  className="rounded-lg border border-border bg-surface px-3 py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-muted">{team.code}</span>
                    <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-text-muted">
                      {team.cost}¢
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-text">{team.name}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-text-muted">
              Total:{" "}
              <span className="font-medium text-text">{totalCost} / 30 Pesodollars</span>
            </p>
          </>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl text-text">Tiebreakers</h2>
        <div className="mt-4 space-y-5">
          <div>
            <p className="text-xs text-text-subtle">{tb1Label}</p>
            <p className="mt-1 text-sm text-text">
              {entry.tiebreaker_total_goals != null ? (
                entry.tiebreaker_total_goals
              ) : (
                <span className="text-text-subtle">—</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-subtle">{tb2Label}</p>
            <p className="mt-1 text-sm text-text">
              {entry.tiebreaker_final_minute != null ? (
                `Minute ${entry.tiebreaker_final_minute}`
              ) : (
                <span className="text-text-subtle">—</span>
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl text-text">Bonus side pool</h2>
        {!hasBonus ? (
          <p className="mt-4 text-sm text-text-muted">
            Did not participate in the bonus side pool.
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            {(bonusAnswers ?? []).map((answer) => {
              const question = bonusQuestions.find((q) => q.id === answer.question_index);
              const label = question?.text ?? `Question ${answer.question_index}`;

              let displayValue: string;
              if (question?.type === "team" && answer.answer_text) {
                displayValue = teamNameMap[answer.answer_text] ?? answer.answer_text;
              } else if (question?.type === "number") {
                displayValue =
                  answer.answer_number != null ? String(answer.answer_number) : "—";
              } else {
                displayValue = answer.answer_text ?? "—";
              }

              return (
                <div key={answer.question_index}>
                  <p className="text-xs text-text-subtle">{label}</p>
                  <p className="mt-1 text-sm text-text">{displayValue}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
        <Link
          href={`/pools/${pool.join_code}`}
          className="text-sm text-primary hover:text-primary-bright"
        >
          ← Back to {pool.name}
        </Link>
        <div className="flex items-center gap-3">
          {isEntryOwner && !poolLocked && (
            <Link
              href={`/pools/${pool.join_code}/entries/${entry.id}/edit`}
              className="rounded-md border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
            >
              Edit entry
            </Link>
          )}
          {isPoolOwner && !isEntryOwner && (
            <Link
              href={`/pools/${pool.join_code}/entries/${entry.id}/remove`}
              className="rounded-md border border-red-800/60 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-900/20 hover:text-red-300"
            >
              Remove entry
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
