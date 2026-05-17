import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const TEAMS = [
  { name: "Argentina", code: "ar" },
  { name: "Australia", code: "au" },
  { name: "Austria", code: "at" },
  { name: "Belgium", code: "be" },
  { name: "Brazil", code: "br" },
  { name: "Cameroon", code: "cm" },
  { name: "Canada", code: "ca" },
  { name: "Chile", code: "cl" },
  { name: "Colombia", code: "co" },
  { name: "Costa Rica", code: "cr" },
  { name: "Croatia", code: "hr" },
  { name: "Denmark", code: "dk" },
  { name: "Ecuador", code: "ec" },
  { name: "Egypt", code: "eg" },
  { name: "England", code: "gb-eng" },
  { name: "France", code: "fr" },
  { name: "Germany", code: "de" },
  { name: "Ghana", code: "gh" },
  { name: "Honduras", code: "hn" },
  { name: "Hungary", code: "hu" },
  { name: "Iran", code: "ir" },
  { name: "Iraq", code: "iq" },
  { name: "Ivory Coast", code: "ci" },
  { name: "Japan", code: "jp" },
  { name: "Jordan", code: "jo" },
  { name: "Mali", code: "ml" },
  { name: "Mexico", code: "mx" },
  { name: "Morocco", code: "ma" },
  { name: "Netherlands", code: "nl" },
  { name: "New Zealand", code: "nz" },
  { name: "Nigeria", code: "ng" },
  { name: "Panama", code: "pa" },
  { name: "Paraguay", code: "py" },
  { name: "Poland", code: "pl" },
  { name: "Portugal", code: "pt" },
  { name: "Saudi Arabia", code: "sa" },
  { name: "Senegal", code: "sn" },
  { name: "Serbia", code: "rs" },
  { name: "Slovakia", code: "sk" },
  { name: "South Africa", code: "za" },
  { name: "South Korea", code: "kr" },
  { name: "Spain", code: "es" },
  { name: "Switzerland", code: "ch" },
  { name: "Turkey", code: "tr" },
  { name: "Ukraine", code: "ua" },
  { name: "Uruguay", code: "uy" },
  { name: "USA", code: "us" },
  { name: "Uzbekistan", code: "uz" },
];

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
          <Link href="/" className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              className="h-6 w-6 text-accent"
            >
              <path d="M18 2H6v2H4v5c0 2.97 2.16 5.44 5 5.91V17H7v2h2v1H7v2h10v-2h-2v-1h2v-2h-2v-1.09c2.84-.47 5-2.94 5-5.91V4h-2V2zM6 9V6h2v4.9A4.01 4.01 0 0 1 6 9zm12 0c0 1.48-.81 2.77-2 3.46V6h2v3z" />
            </svg>
            <span className="font-display text-xl text-text">World Cup Pool</span>
          </Link>
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
        <section className="py-20 md:py-24">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 px-4">
            {/* Trophy */}
            <div className="flex shrink-0 items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                className="h-24 w-24 text-accent md:h-32 md:w-32"
              >
                <path d="M18 2H6v2H4v5c0 2.97 2.16 5.44 5 5.91V17H7v2h2v1H7v2h10v-2h-2v-1h2v-2h-2v-1.09c2.84-.47 5-2.94 5-5.91V4h-2V2zM6 9V6h2v4.9A4.01 4.01 0 0 1 6 9zm12 0c0 1.48-.81 2.77-2 3.46V6h2v3z" />
              </svg>
            </div>

            {/* Content */}
            <div className="flex flex-col items-center text-center">
              <h1 className="font-display text-5xl text-text md:text-6xl">
                World Cup Pool
              </h1>
              <p className="mt-3 text-xl text-text-muted">FIFA WC 2026</p>
              <div className="mt-8 flex gap-3">
                <Link
                  href={user ? "/join" : "/login"}
                  className="rounded-md bg-primary px-6 py-3 text-base font-medium text-text transition-colors hover:bg-primary-bright"
                >
                  Join a pool
                </Link>
                <Link
                  href="/my-entries"
                  className="rounded-md border border-border px-6 py-3 text-base font-medium text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
                >
                  Go to my entries
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Teams ticker */}
        <style>{`
          @keyframes ticker-scroll {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
        `}</style>
        <div className="overflow-hidden border-y border-border py-3">
          <div
            style={{
              whiteSpace: "nowrap",
              animation: "ticker-scroll 50s linear infinite",
              willChange: "transform",
            }}
          >
            {[...TEAMS, ...TEAMS].map((team, i) => (
              <span
                key={i}
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "0 20px", fontSize: "14px", color: "var(--color-text-muted)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://flagcdn.com/w20/${team.code}.png`}
                  width={20}
                  height={14}
                  alt={team.name}
                  style={{ borderRadius: "2px", display: "block" }}
                />
                {team.name}
                <span style={{ marginLeft: "8px", color: "var(--color-border)" }}>·</span>
              </span>
            ))}
          </div>
        </div>

        {/* Rules section */}
        <section className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="mb-10 text-center font-display text-3xl text-text">
            How it works
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Card 1 — Build your squad */}
            <div className="rounded-xl border border-border bg-surface p-8">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
                </svg>
              </div>
              <h3 className="mb-3 text-lg font-medium text-text">Build your squad</h3>
              <p className="text-sm leading-relaxed text-text-muted">
                You get <strong className="text-text">30 Pesodollars</strong> to pick at least 7 World Cup nations. Teams cost 1–7 Pesodollars based on their prospects — favourites cost more, underdogs come cheap. Stack up on a powerhouse or spread across a diverse squad.
              </p>
            </div>

            {/* Card 2 — Earning points */}
            <div className="rounded-xl border border-border bg-surface p-8">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3 className="mb-3 text-lg font-medium text-text">Earning points</h3>
              <ul className="space-y-2 text-sm text-text-muted">
                <li className="flex items-baseline gap-3">
                  <span className="w-4 shrink-0 font-semibold text-win">W</span>
                  <span><strong className="text-text">Win</strong> (incl. after extra time) — 3 pts</span>
                </li>
                <li className="flex items-baseline gap-3">
                  <span className="w-4 shrink-0 font-semibold text-draw">D</span>
                  <span><strong className="text-text">Draw</strong> — 1 pt</span>
                </li>
                <li className="flex items-baseline gap-3">
                  <span className="w-4 shrink-0 font-semibold text-loss">L</span>
                  <span><strong className="text-text">Lost on penalties</strong> in knockout stage — 1 pt</span>
                </li>
                <li className="flex items-baseline gap-3">
                  <span className="w-4 shrink-0 font-semibold text-text-subtle">L</span>
                  <span><strong className="text-text">Loss</strong> — 0 pts</span>
                </li>
              </ul>
              <p className="mt-3 text-xs text-text-subtle">Penalty shootouts are not draws — winner gets 3, loser gets 1.</p>
            </div>

            {/* Card 3 — Tiebreakers */}
            <div className="rounded-xl border border-border bg-surface p-8">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>
                </svg>
              </div>
              <h3 className="mb-3 text-lg font-medium text-text">Tiebreakers</h3>
              <p className="mb-3 text-sm text-text-muted">If two entries finish level on points:</p>
              <ol className="space-y-2 text-sm text-text-muted">
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-xs font-medium text-text">1</span>
                  <span>Closest guess to <strong className="text-text">total goals in all 104 matches</strong> (no shootout goals)</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-xs font-medium text-text">2</span>
                  <span>Closest guess to <strong className="text-text">minute of the first goal in the Final</strong></span>
                </li>
              </ol>
            </div>

            {/* Card 4 — Bonus pool */}
            <div className="rounded-xl border border-border bg-surface p-8">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M20 6h-2.18c.07-.44.18-.86.18-1.3C18 2.12 15.88 0 13.3 0c-1.3 0-2.4.5-3.2 1.6L12 4 13.9 1.6C14.42 1.04 15.12.8 15.8.8c1.77 0 2.6 1.3 2.6 3.1 0 .4-.1.8-.18 1.1H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 14H4v-6h16v6zm0-10H4V8h16v2z"/>
                </svg>
              </div>
              <h3 className="mb-3 text-lg font-medium text-text">Bonus pool <span className="text-sm font-normal text-text-subtle">(optional)</span></h3>
              <p className="text-sm leading-relaxed text-text-muted">
                Answer <strong className="text-text">11 bonus questions</strong> for a separate side pot. Most correct answers wins — tied by closest answer to question 11. Completely independent from the main leaderboard.
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
