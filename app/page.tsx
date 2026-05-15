import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="font-display text-xl text-text">World Cup Pool</span>
          {user ? (
            <Link
              href="/my-entries"
              className="text-sm text-text-muted transition-colors hover:text-text"
            >
              My entries
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm text-text-muted transition-colors hover:text-text"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="font-display text-5xl leading-tight tracking-tight text-text sm:text-6xl lg:text-7xl">
            Pick your teams.
            <br />
            Back them all summer.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-text-muted">
            A World Cup 2026 prediction pool where you draft a squad of nations
            within a budget, then cheer them on from the group stage through the
            Final.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3">
            <Link
              href="/signup"
              className="w-full max-w-xs rounded-md bg-primary px-6 py-3 text-center text-base font-medium text-text transition-colors hover:bg-primary-bright"
            >
              Join a pool
            </Link>
            <Link
              href="/my-entries"
              className="w-full max-w-xs rounded-md border border-border px-6 py-3 text-center text-base font-medium text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
            >
              Go to my entries
            </Link>
          </div>
        </section>

        <div className="border-t border-border" />

        {/* Rules section */}
        <section className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="mb-10 font-display text-3xl text-text">
            How it works
          </h2>

          <div className="space-y-12 leading-relaxed text-text-muted">
            <div>
              <h3 className="mb-3 text-lg font-medium text-text">
                Build your squad
              </h3>
              <p>
                Each player gets a budget of{" "}
                <strong className="text-text">30 Pesodollars</strong> to pick at
                least 7 World Cup nations. Teams are priced from 1 to 7
                Pesodollars based on their tournament prospects — favourites cost
                more, underdogs come cheap. You can stack up on a single
                powerhouse or spread your budget across a diverse squad.
                Strategy is yours.
              </p>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-medium text-text">
                Earning points
              </h3>
              <p>
                You score points every time any of your selected nations plays a
                match:
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex gap-3">
                  <span className="w-5 font-medium text-win">W</span>
                  <span>
                    <strong className="text-text">Win</strong> — including wins
                    after extra time — 3 points
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="w-5 font-medium text-draw">D</span>
                  <span>
                    <strong className="text-text">Draw</strong> — 1 point
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="w-5 font-medium text-loss">L</span>
                  <span>
                    <strong className="text-text">Lost on penalties</strong> in
                    the knockout stage — 1 point (a valiant exit still counts)
                  </span>
                </li>
              </ul>
              <p className="mt-4">
                Penalty shootouts are not draws. The winner takes 3 points, the
                loser takes 1.
              </p>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-medium text-text">
                Tiebreakers
              </h3>
              <p>
                If two entries finish level on points, these decide the winner in
                order:
              </p>
              <ol className="mt-4 list-decimal space-y-2 pl-5">
                <li>
                  Closest guess (either direction) to the{" "}
                  <strong className="text-text">
                    total goals scored across all 104 tournament matches
                  </strong>
                  . Penalty shootout goals don&apos;t count.
                </li>
                <li>
                  Closest guess to the{" "}
                  <strong className="text-text">
                    minute of the first goal in the Final
                  </strong>
                  .
                </li>
              </ol>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-medium text-text">
                Bonus pool (optional side game)
              </h3>
              <p>
                Alongside your main entry, you can answer{" "}
                <strong className="text-text">
                  11 optional bonus questions
                </strong>{" "}
                for a separate side pot. Most correct answers wins. If it&apos;s
                still tied, the closest answer to question 11 is the tiebreaker.
                The bonus pool is independent from the main leaderboard — a
                separate prize for the trivia-minded.
              </p>
            </div>
          </div>
        </section>

        <div className="border-t border-border" />

        {/* Create a pool section */}
        <section className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="mb-4 font-display text-3xl text-text">
            Run your own pool
          </h2>
          <p className="mb-8 max-w-prose leading-relaxed text-text-muted">
            Organising for your own group? Create a pool, set a lock date, share
            a join code, and track everyone&apos;s picks on a live leaderboard
            as the tournament unfolds. Takes about two minutes to get started.
          </p>
          <Link
            href="/signup"
            className="inline-block rounded-md bg-primary px-6 py-3 text-base font-medium text-text transition-colors hover:bg-primary-bright"
          >
            Create your own pool
          </Link>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-6 text-center text-sm text-text-subtle">
          Built for the 2026 World Cup
        </div>
      </footer>
    </div>
  );
}
