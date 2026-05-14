import { Fragment } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TeamPickerStep } from "@/components/pool/TeamPickerStep";

export type PoolTeam = {
  id: string;
  name: string;
  code: string;
  cost: number;
};

type Step = 1 | 2 | 3;
const STEPS: { number: Step; label: string }[] = [
  { number: 1, label: "Rules" },
  { number: 2, label: "Team" },
  { number: 3, label: "Bonus" },
];

export default async function NewEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { code } = await params;
  const { step: stepParam } = await searchParams;
  const raw = parseInt(stepParam ?? "1", 10);
  const step: Step = raw === 2 || raw === 3 ? raw : 1;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pool } = await supabase
    .from("pools")
    .select("id, name, join_code, status")
    .eq("join_code", code.toUpperCase())
    .maybeSingle();

  if (!pool) redirect("/my-entries");
  if (pool.status === "locked" || pool.status === "completed")
    redirect(`/pools/${pool.join_code}`);

  const { data: entry } = await supabase
    .from("entries")
    .select("id, submitted_at")
    .eq("pool_id", pool.id)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!entry) redirect(`/pools/${pool.join_code}/join`);
  if (entry.submitted_at)
    redirect(`/pools/${pool.join_code}/entries/${entry.id}`);

  const { data: rawTeams } = await supabase
    .from("pool_teams")
    .select("cost_override, teams!inner(id, name, code, cost)")
    .eq("pool_id", pool.id);

  const poolTeams: PoolTeam[] = (rawTeams ?? [])
    .map((row) => {
      const t = row.teams as { id: string; name: string; code: string; cost: number };
      return { id: t.id, name: t.name, code: t.code, cost: row.cost_override ?? t.cost };
    })
    .sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name));

  const base = `/pools/${pool.join_code}/entries/new`;

  return (
    <div className="mx-auto max-w-4xl">
      <ProgressBar currentStep={step} />

      <div className="mt-8">
        {step === 1 && <StepRules />}
        {step === 2 && <TeamPickerStep teams={poolTeams} poolCode={pool.join_code} />}
        {step === 3 && <StepBonusPlaceholder />}
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
        ) : step === 3 ? (
          <div className="flex flex-col items-end gap-1">
            <button
              disabled
              className="cursor-not-allowed rounded-md bg-surface px-5 py-2 text-sm font-medium text-text-subtle ring-1 ring-border"
            >
              Submit entry
            </button>
            <span className="text-xs text-text-subtle">Coming soon</span>
          </div>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

function ProgressBar({ currentStep }: { currentStep: Step }) {
  return (
    <nav aria-label="Entry steps">
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
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
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

function StepRules() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-xl text-text">Rules</h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-text-muted">
          <p>
            You have a budget of{" "}
            <strong className="text-text">30 Pesodollars</strong> to assemble a
            squad of World Cup nations. Each team costs between 1 and 7
            Pesodollars — stronger contenders cost more. You must pick{" "}
            <strong className="text-text">at least 7 teams</strong>, and your
            total spend cannot exceed 30 Pesodollars.
          </p>
          <p>
            One entry per person per pool. Entries lock when the tournament
            kicks off — no changes are allowed after that point.
          </p>
          <p>
            To settle ties, you&apos;ll also guess the total number of goals
            scored across all 104 tournament matches (penalty shootout goals
            don&apos;t count), and the minute of the first goal in the Final.
          </p>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl text-text">Scoring</h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-text-muted">
          <p>
            Your squad earns points for every match your selected nations play,
            from the group stage through to the Final.
          </p>
          <p>
            A <strong className="text-text">win earns 3 points</strong>. A{" "}
            <strong className="text-text">draw earns 1 point</strong>. A loss
            earns nothing. A win that comes in extra time, before a penalty
            shootout, still counts as a win — 3 points.
          </p>
          <p>
            Knockout matches decided by a penalty shootout are not draws. The
            winning team earns 3 points; the team knocked out on penalties earns{" "}
            <strong className="text-text">1 point</strong> for pushing it to
            penalties.
          </p>
          <p>
            The entry with the most total points at the end of the tournament
            wins. Tied entries are separated by the tiebreaker guesses above,
            in order.
          </p>
        </div>
      </section>

      <p className="text-sm text-text-muted">
        When you continue, you&apos;ll pick your team.
      </p>
    </div>
  );
}

function StepBonusPlaceholder() {
  return (
    <div className="rounded-lg border border-border bg-surface p-10 text-center text-sm text-text-subtle">
      Coming next
    </div>
  );
}