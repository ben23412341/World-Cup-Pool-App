import { Fragment } from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TeamPickerStep } from "@/components/pool/TeamPickerStep";
import { BonusQuestionsStep } from "@/components/pool/BonusQuestionsStep";
import { updateEntry } from "./actions";
import type { PoolTeam, BonusQuestion } from "@/app/(app)/pools/[code]/entries/new/page";

type Step = 1 | 2 | 3;
const STEPS: { number: Step; label: string }[] = [
  { number: 1, label: "Rules" },
  { number: 2, label: "Teams" },
  { number: 3, label: "Bonus" },
];

export default async function EditEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string; id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { code, id } = await params;
  const { step: stepParam } = await searchParams;
  const raw = parseInt(stepParam ?? "1", 10);
  const step: Step = raw === 2 || raw === 3 ? raw : 1;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: pool } = await supabase
    .from("pools")
    .select("id, name, join_code, status, locks_at")
    .eq("join_code", code.toUpperCase())
    .maybeSingle();

  if (!pool) notFound();

  // Lock check — enforced here (page load) and again in updateEntry (action)
  const isLocked =
    pool.status === "locked" ||
    pool.status === "completed" ||
    (pool.locks_at != null && new Date(pool.locks_at) <= new Date());

  const { data: entry } = await supabase
    .from("entries")
    .select(
      "id, pool_id, user_id, tiebreaker_total_goals, tiebreaker_final_minute"
    )
    .eq("id", id)
    .eq("pool_id", pool.id)
    .maybeSingle();

  if (!entry) notFound();

  // Only the entry owner may edit — pool owner cannot edit other people's entries
  if (entry.user_id !== user.id) notFound();

  if (isLocked) {
    redirect(`/pools/${pool.join_code}/entries/${entry.id}?locked=1`);
  }

  // Load pool teams
  const { data: rawTeams } = await supabase
    .from("pool_teams")
    .select("cost_override, teams!inner(id, name, code, cost)")
    .eq("pool_id", pool.id);

  const poolTeams: PoolTeam[] = (rawTeams ?? [])
    .map((row) => {
      const t = row.teams as unknown as { id: string; name: string; code: string; cost: number };
      return { id: t.id, name: t.name, code: t.code, cost: row.cost_override ?? t.cost };
    })
    .sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name));

  // Load current team selection
  const { data: entryTeamRows } = await supabase
    .from("entry_teams")
    .select("team_id")
    .eq("entry_id", entry.id);

  const selectedTeamIds = (entryTeamRows ?? []).map((r) => r.team_id as string);

  // Load bonus questions config and existing answers
  const { data: settingsRow } = await supabase
    .from("pool_settings")
    .select("bonus_questions")
    .eq("pool_id", pool.id)
    .maybeSingle();

  const bonusQuestions: BonusQuestion[] = Array.isArray(settingsRow?.bonus_questions)
    ? (settingsRow.bonus_questions as BonusQuestion[])
    : [];

  const { data: bonusAnswerRows } = await supabase
    .from("entry_bonus_answers")
    .select("question_index, answer_text, answer_number")
    .eq("entry_id", entry.id);

  const initialBonusAnswers: Record<number, string | number | ""> = {};
  for (const row of bonusAnswerRows ?? []) {
    const q = bonusQuestions.find((q) => q.id === row.question_index);
    if (!q) continue;
    if (q.type === "number") {
      initialBonusAnswers[row.question_index] = row.answer_number ?? "";
    } else {
      initialBonusAnswers[row.question_index] = row.answer_text ?? "";
    }
  }

  const teamPickerStorageKey = `edit-${entry.id}-draft-${pool.join_code}`;
  const bonusStorageKey = `edit-${entry.id}-bonus-${pool.join_code}`;
  const base = `/pools/${pool.join_code}/entries/${entry.id}/edit`;

  // Bind pool code and entry ID into the server action so BonusQuestionsStep
  // receives a single-argument callable matching its onSubmit prop type
  const boundUpdate = updateEntry.bind(null, pool.join_code, entry.id);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
          Editing entry
        </p>
        <h1 className="font-display text-2xl text-text">{pool.name}</h1>
      </div>

      <ProgressBar currentStep={step} />

      <div className="mt-8">
        {step === 1 && <StepRules base={base} />}
        {step === 2 && (
          <TeamPickerStep
            teams={poolTeams}
            poolCode={pool.join_code}
            storageKey={teamPickerStorageKey}
            initialValues={{
              selectedTeamIds,
              tiebreakerGoals: entry.tiebreaker_total_goals ?? "",
              tiebreakerMinute: entry.tiebreaker_final_minute ?? "",
            }}
          />
        )}
        {step === 3 && (
          <BonusQuestionsStep
            questions={bonusQuestions}
            teams={poolTeams}
            poolCode={pool.join_code}
            storageKey={bonusStorageKey}
            teamPickerStorageKey={teamPickerStorageKey}
            initialValues={initialBonusAnswers}
            onSubmit={boundUpdate}
            submitLabel="Save changes"
          />
        )}
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
        {step > 1 ? (
          <Link
            href={`${base}?step=${step - 1}`}
            className="rounded-md border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
          >
            Back
          </Link>
        ) : (
          <div />
        )}

        {step === 1 ? (
          <Link
            href={`${base}?step=2`}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-bright"
          >
            Continue
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

function ProgressBar({ currentStep }: { currentStep: Step }) {
  return (
    <nav aria-label="Edit entry steps">
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const completed = s.number < currentStep;
          const current = s.number === currentStep;
          return (
            <Fragment key={s.number}>
              <div className="flex items-center gap-2.5">
                <div
                  className={
                    "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold " +
                    (current
                      ? "bg-primary text-white"
                      : completed
                      ? "bg-primary/20 text-primary"
                      : "border border-border text-text-subtle")
                  }
                >
                  {completed ? <CheckIcon /> : s.number}
                </div>
                <span
                  className={
                    "text-sm font-medium " +
                    (current
                      ? "text-text"
                      : completed
                      ? "text-primary"
                      : "text-text-subtle")
                  }
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="mx-4 h-px flex-1 bg-border" />
              )}
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2 6l3 3 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StepRules({ base }: { base: string }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface px-5 py-4 text-sm leading-relaxed text-text-muted">
        <p>
          You can update your team picks, tiebreaker guesses, and bonus answers
          at any time before the pool locks. Changes take effect immediately on
          save.
        </p>
        <p className="mt-3">
          Budget is still{" "}
          <strong className="text-text">30 Pesodollars</strong>, minimum{" "}
          <strong className="text-text">7 teams</strong>. The pool will lock at a set time, no edits after that point.
        </p>
      </div>

    </div>
  );
}
