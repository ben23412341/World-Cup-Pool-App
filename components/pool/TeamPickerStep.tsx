"use client";

import { useState, useEffect, useRef } from "react";
import type { PoolTeam } from "@/app/(app)/pools/[code]/entries/new/page";

const BUDGET = 30;
const MIN_TEAMS = 7;

type Draft = {
  selectedTeamIds: string[];
  tiebreakerGoals: number | "";
  tiebreakerMinute: number | "";
};

type InitialValues = {
  selectedTeamIds: string[];
  tiebreakerGoals: number | "";
  tiebreakerMinute: number | "";
};

export function TeamPickerStep({
  teams,
  poolCode,
  storageKey: storageKeyProp,
  initialValues,
}: {
  teams: PoolTeam[];
  poolCode: string;
  storageKey?: string;
  initialValues?: InitialValues;
}) {
  const storageKey = storageKeyProp ?? `entry-draft-${poolCode}`;
  // Capture on first render only — used as fallback when sessionStorage is empty
  const initialValuesRef = useRef(initialValues);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tiebreakerGoals, setTiebreakerGoals] = useState<number | "">("");
  const [tiebreakerMinute, setTiebreakerMinute] = useState<number | "">("");
  const [hydrated, setHydrated] = useState(false);

  // Load from sessionStorage on mount; fall back to initialValues when empty
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const draft = JSON.parse(raw) as Draft;
        if (Array.isArray(draft.selectedTeamIds)) {
          setSelected(new Set(draft.selectedTeamIds));
        }
        if (typeof draft.tiebreakerGoals === "number" || draft.tiebreakerGoals === "") {
          setTiebreakerGoals(draft.tiebreakerGoals);
        }
        if (typeof draft.tiebreakerMinute === "number" || draft.tiebreakerMinute === "") {
          setTiebreakerMinute(draft.tiebreakerMinute);
        }
      } else if (initialValuesRef.current) {
        const iv = initialValuesRef.current;
        setSelected(new Set(iv.selectedTeamIds));
        setTiebreakerGoals(iv.tiebreakerGoals);
        setTiebreakerMinute(iv.tiebreakerMinute);
      }
    } catch {
      if (initialValuesRef.current) {
        const iv = initialValuesRef.current;
        setSelected(new Set(iv.selectedTeamIds));
        setTiebreakerGoals(iv.tiebreakerGoals);
        setTiebreakerMinute(iv.tiebreakerMinute);
      }
    }
    setHydrated(true);
  }, [storageKey]);

  // Save to sessionStorage whenever state changes (after initial hydration)
  useEffect(() => {
    if (!hydrated) return;
    const draft: Draft = {
      selectedTeamIds: Array.from(selected),
      tiebreakerGoals,
      tiebreakerMinute,
    };
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      // ignore quota errors
    }
  }, [selected, tiebreakerGoals, tiebreakerMinute, hydrated, storageKey]);

  const tiers = Array.from(new Set(teams.map((t) => t.cost))).sort(
    (a, b) => b - a
  );

  const totalCost = teams
    .filter((t) => selected.has(t.id))
    .reduce((sum, t) => sum + t.cost, 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const barPct = Math.min((totalCost / BUDGET) * 100, 100);
  const costColor =
    totalCost > BUDGET
      ? "text-loss"
      : totalCost === BUDGET
      ? "text-accent"
      : "text-primary";
  const barColor =
    totalCost > BUDGET
      ? "bg-loss"
      : totalCost === BUDGET
      ? "bg-accent"
      : "bg-primary";

  const isValid =
    selected.size >= MIN_TEAMS &&
    totalCost <= BUDGET &&
    tiebreakerGoals !== "" &&
    tiebreakerMinute !== "";

  function handleContinue() {
    if (!isValid) return;
    window.location.search = "?step=3";
  }

  const validationMsg =
    selected.size < MIN_TEAMS ? (
      <span className="text-text-muted">Pick at least 7 teams</span>
    ) : totalCost > BUDGET ? (
      <span className="text-loss">
        Over budget by {totalCost - BUDGET} Pesodollar
        {totalCost - BUDGET !== 1 ? "s" : ""}
      </span>
    ) : tiebreakerGoals === "" || tiebreakerMinute === "" ? (
      <span className="text-text-muted">Both tiebreakers required</span>
    ) : (
      <span className="text-win">Ready to continue</span>
    );

  return (
    <div className="space-y-8">
      {tiers.map((cost) => {
        const tierSelectedCount = teams.filter(
          (t) => t.cost === cost && selected.has(t.id)
        ).length;
        return (
          <div key={cost}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
                {cost} Pesodollar{cost !== 1 ? "s" : ""}
              </h3>
              {tierSelectedCount > 0 && (
                <span className="text-xs text-text-muted">
                  {tierSelectedCount} selected
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {teams
                .filter((t) => t.cost === cost)
                .map((team) => {
                  const isSelected = selected.has(team.id);
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => toggle(team.id)}
                      className={
                        "relative rounded-lg p-4 text-left transition-colors " +
                        (isSelected
                          ? "bg-primary/10 ring-2 ring-primary"
                          : "bg-surface ring-1 ring-border hover:bg-surface-elevated")
                      }
                    >
                      <span className="absolute right-2 top-2 rounded bg-accent/10 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-accent">
                        {cost}
                      </span>
                      <p className="pr-7 text-sm font-medium leading-snug text-text">
                        {team.name}
                      </p>
                      <p className="mt-1 font-mono text-xs text-text-muted">
                        {team.code}
                      </p>
                    </button>
                  );
                })}
            </div>
          </div>
        );
      })}

      {/* Tiebreaker inputs */}
      <div className="space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-text">
            How many total goals will be scored in all 104 games of the World
            Cup?
          </label>
          <p className="mb-2 text-xs text-text-subtle">
            Penalty shootout goals don&apos;t count
          </p>
          <input
            type="number"
            step="1"
            min="0"
            max="500"
            value={tiebreakerGoals}
            onChange={(e) =>
              setTiebreakerGoals(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary sm:w-40"
            placeholder="e.g. 147"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-text">
            During which minute of the Final will the first goal be scored?
          </label>
          <p className="mb-2 text-xs text-text-subtle">
            1 to 120, or 0 if no goal in regulation or extra time
          </p>
          <input
            type="number"
            step="1"
            min="0"
            max="120"
            value={tiebreakerMinute}
            onChange={(e) =>
              setTiebreakerMinute(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary sm:w-40"
            placeholder="e.g. 67"
          />
        </div>
      </div>

      {/* Sticky summary bar */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <p className="text-sm tabular-nums">
              <span className={`text-lg font-bold ${costColor}`}>
                {totalCost}
              </span>
              <span className="text-text-muted"> / 30 Pesodollars</span>
            </p>
            <div className="mt-1.5 h-1 w-32 overflow-hidden rounded-full bg-surface-elevated">
              <div
                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                style={{ width: `${barPct}%` }}
              />
            </div>
          </div>

          <div className="flex-1 text-center text-sm font-medium">
            {validationMsg}
          </div>
        </div>
      </div>

      {/* Continue button (validated) */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!isValid}
          className={
            "rounded-md px-5 py-2 text-sm font-medium transition-colors " +
            (isValid
              ? "bg-primary text-white hover:bg-primary-bright cursor-pointer"
              : "bg-surface text-text-subtle ring-1 ring-border cursor-not-allowed")
          }
        >
          Continue
        </button>
      </div>
    </div>
  );
}