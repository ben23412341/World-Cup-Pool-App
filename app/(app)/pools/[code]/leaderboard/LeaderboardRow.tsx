import Link from "next/link";

export type LeaderboardRowData = {
  entryId: string;
  displayName: string;
  isMe: boolean;
  points: number;
  rank: number | null;
  tiebreakerGoals: number | null;
  tiebreakerMinute: number | null;
};

type Props = LeaderboardRowData & {
  poolCode: string;
  isTied: boolean;
  actualTotalGoals: number | null;
  actualFinalMinute: number | null;
};

export function LeaderboardRow({
  entryId,
  displayName,
  isMe,
  points,
  rank,
  poolCode,
  isTied,
  tiebreakerGoals,
  tiebreakerMinute,
  actualTotalGoals,
  actualFinalMinute,
}: Props) {
  const isFirst = rank === 1;
  const showTiebreakers = isTied && (tiebreakerGoals !== null || tiebreakerMinute !== null);
  const hasActuals = actualTotalGoals !== null || actualFinalMinute !== null;

  const rowInner = (
    <div
      className={
        "relative flex items-center gap-4 overflow-hidden rounded-lg border px-4 py-3 transition-colors " +
        (isFirst
          ? "border-accent/30 bg-accent/5 hover:bg-surface-elevated"
          : "border-border bg-surface hover:bg-surface-elevated")
      }
    >
      {isMe && (
        <div className="absolute bottom-0 left-0 top-0 w-0.5 bg-primary" />
      )}

      {/* Rank */}
      <div
        className={
          "w-8 flex-shrink-0 font-mono text-sm tabular-nums " +
          (isFirst ? "text-accent" : "text-text-muted")
        }
      >
        {isFirst ? (
          <span className="flex items-center gap-1">
            <TrophyIcon />
            {rank}
          </span>
        ) : (
          rank ?? "—"
        )}
      </div>

      {/* Name + optional tiebreaker line */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-text">{displayName}</span>
          {isMe && (
            <span className="flex-shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">
              YOU
            </span>
          )}
        </div>

        {showTiebreakers && (
          <p className="text-xs text-text-subtle">
            {hasActuals ? (
              <>
                {tiebreakerGoals !== null && (
                  <span>
                    Goals: {tiebreakerGoals}
                    {actualTotalGoals !== null && ` (actual: ${actualTotalGoals})`}
                  </span>
                )}
                {tiebreakerGoals !== null && tiebreakerMinute !== null && " • "}
                {tiebreakerMinute !== null && (
                  <span>
                    First goal: {tiebreakerMinute}′
                    {actualFinalMinute !== null && ` (actual: ${actualFinalMinute}′)`}
                  </span>
                )}
              </>
            ) : (
              <>
                {tiebreakerGoals !== null && `Goals guess: ${tiebreakerGoals}`}
                {tiebreakerGoals !== null && tiebreakerMinute !== null && " • "}
                {tiebreakerMinute !== null && `First goal guess: ${tiebreakerMinute}′`}
              </>
            )}
          </p>
        )}
      </div>

      {/* Points */}
      <div
        className={
          "w-12 flex-shrink-0 text-right font-mono text-sm tabular-nums " +
          (isFirst ? "font-semibold text-accent" : "text-text")
        }
      >
        {points}
      </div>
    </div>
  );

  return (
    <Link href={`/pools/${poolCode}/entries/${entryId}`} className="block cursor-pointer">
      {rowInner}
    </Link>
  );
}

function TrophyIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94C8.02 14.21 9.87 15.7 12 16v2H9v2h6v-2h-3v-2c2.13-.3 3.98-1.79 4.61-3.06C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
    </svg>
  );
}
