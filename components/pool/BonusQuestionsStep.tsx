"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PoolTeam, BonusQuestion } from "@/app/(app)/pools/[code]/entries/new/page";
import { submitEntry } from "@/app/(app)/pools/[code]/entries/new/actions";

type Answers = Record<number, string | number | "">;

type SubmitPayload = {
  selectedTeamIds: string[];
  tiebreakerGoals: number;
  tiebreakerMinute: number;
  bonusAnswers: { question_index: number; answer_text: string | null; answer_number: number | null }[];
};

export function BonusQuestionsStep({
  questions,
  teams,
  poolCode,
  storageKey: storageKeyProp,
  teamPickerStorageKey: teamPickerStorageKeyProp,
  initialValues,
  onSubmit: onSubmitProp,
  submitLabel = "Submit entry",
}: {
  questions: BonusQuestion[];
  teams: PoolTeam[];
  poolCode: string;
  storageKey?: string;
  teamPickerStorageKey?: string;
  initialValues?: Answers;
  onSubmit?: (payload: SubmitPayload) => Promise<{ error: string } | { success: true; entryId: string }>;
  submitLabel?: string;
}) {
  const storageKey = storageKeyProp ?? `bonus-draft-${poolCode}`;
  const teamPickerStorageKey = teamPickerStorageKeyProp ?? `entry-draft-${poolCode}`;
  const initialValuesRef = useRef(initialValues);
  const router = useRouter();

  const [answers, setAnswers] = useState<Answers>({});
  const [hydrated, setHydrated] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Answers;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          setAnswers(parsed);
        }
      } else if (initialValuesRef.current) {
        setAnswers(initialValuesRef.current);
      }
    } catch {
      if (initialValuesRef.current) {
        setAnswers(initialValuesRef.current);
      }
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(answers));
    } catch {
      // ignore quota errors
    }
  }, [answers, hydrated, storageKey]);

  function setAnswer(id: number, value: string | number | "") {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function handleSubmit() {
    startTransition(async () => {
      setSubmitError(null);

      // Read team picker draft from sessionStorage (written by TeamPickerStep)
      let selectedTeamIds: string[] = [];
      let tiebreakerGoals = 0;
      let tiebreakerMinute = 0;
      try {
        const raw = sessionStorage.getItem(teamPickerStorageKey);
        if (raw) {
          const draft = JSON.parse(raw) as {
            selectedTeamIds: string[];
            tiebreakerGoals: number;
            tiebreakerMinute: number;
          };
          selectedTeamIds = draft.selectedTeamIds ?? [];
          tiebreakerGoals = draft.tiebreakerGoals ?? 0;
          tiebreakerMinute = draft.tiebreakerMinute ?? 0;
        }
      } catch {
        // ignore
      }

      // Build typed answers — component knows each question's type
      const bonusAnswers = questions
        .filter((q) => {
          const val = answers[q.id];
          return val !== undefined && val !== "";
        })
        .map((q) => ({
          question_index: q.id,
          answer_text: q.type !== "number" ? String(answers[q.id]) : null,
          answer_number: q.type === "number" ? Number(answers[q.id]) : null,
        }));

      const payload = { selectedTeamIds, tiebreakerGoals, tiebreakerMinute, bonusAnswers };
      const result = onSubmitProp
        ? await onSubmitProp(payload)
        : await submitEntry(poolCode, payload);

      if ("error" in result) {
        setSubmitError(result.error);
        return;
      }

      // Clear both drafts before navigating
      try {
        sessionStorage.removeItem(teamPickerStorageKey);
        sessionStorage.removeItem(storageKey);
      } catch {
        // ignore
      }

      router.push(`/pools/${poolCode}/entries/${result.entryId}`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-xl text-text">Bonus side pool</h2>
        <p className="text-sm leading-relaxed text-text-muted">
          These 10 questions are an optional side pool, separate from the main
          pool. Whoever answers the most correctly wins the side pool. Ties will
          be decided by the closest answers to the two tiebreaker questions. You can
          skip this entirely and still submit your entry. Leave any or all
          questions blank if you don&apos;t want to participate.
        </p>
      </div>

      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <label
            htmlFor={`q-${q.id}`}
            className="block text-sm font-medium text-text"
          >
            {q.id}. {q.text}
          </label>

          {q.type === "team" ? (
            <select
              id={`q-${q.id}`}
              value={(answers[q.id] as string) ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary sm:w-72"
            >
              <option value="">Select a team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          ) : q.type === "number" ? (
            <input
              id={`q-${q.id}`}
              type="number"
              step="1"
              min="0"
              {...(q.id !== 9 && q.id !== 7 && { max: q.id === 10 ? "32" : "30" })}
              value={(answers[q.id] as number | "") ?? ""}
              onChange={(e) =>
                setAnswer(q.id, e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary sm:w-40"
              placeholder={q.id === 9 ? "e.g. 12" : q.id === 10 ? "0–32" : q.id === 7 ? "e.g. 15" : "0–30"}
            />
          ) : (
            <input
              id={`q-${q.id}`}
              type="text"
              value={(answers[q.id] as string) ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary sm:w-96"
              placeholder="Your answer"
            />
          )}
        </div>
      ))}

      <div className="flex items-center justify-between pt-4">
        <p className="text-xs text-text-subtle">You can edit this until the pool locks.</p>
        <div className="flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className={
            "rounded-md px-5 py-2 text-sm font-medium transition-colors " +
            (isPending
              ? "cursor-not-allowed bg-surface text-text-subtle ring-1 ring-border"
              : "cursor-pointer bg-primary text-white hover:bg-primary-bright")
          }
        >
          {isPending ? "Saving..." : submitLabel}
        </button>
        {submitError ? (
          <span className="text-xs text-loss">{submitError}</span>
        ) : (
          <span className="text-xs text-text-muted">
            Ready to submit your entry.
          </span>
        )}
        </div>
      </div>
    </div>
  );
}
