"use client";

import { useState } from "react";
import type { PoolTeam } from "@/app/(app)/pools/[code]/entries/new/page";

export function TeamPickerStep({ teams }: { teams: PoolTeam[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const tiers = Array.from(new Set(teams.map((t) => t.cost))).sort(
    (a, b) => b - a
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-8">
      {tiers.map((cost) => (
        <div key={cost}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-subtle">
            {cost} Pesodollar{cost !== 1 ? "s" : ""}
          </h3>
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
      ))}
    </div>
  );
}
