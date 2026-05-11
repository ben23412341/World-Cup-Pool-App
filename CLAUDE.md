# World Cup Pool — Project Context

## What this app is

A web app for running a World Cup 2026 prediction pool with a small group (initially the owner's soccer team, ~15 people). Pool participants select a team of at least 7 World Cup nations within a 30 "Pesodollar" budget, answer tiebreaker and bonus questions, and earn points as their teams win, draw, or lose on penalties in the knockout stage. The entry with the most points wins.

This is a **private MVP for one pool**. Multi-tenant SaaS (paid pool creation, Stripe, multiple organizers) is deliberately out of scope for v1 and will come later. Build for the friends-and-family case first.

## Stack

- **Framework**: Next.js 15, App Router, TypeScript strict mode
- **Styling**: Tailwind CSS v4 (CSS variables via `@theme`)
- **Database + Auth**: Supabase (Postgres + Supabase Auth, email magic links)
- **Supabase client**: `@supabase/ssr` (not the old `auth-helpers` packages)
- **Sports data**: TBD — API-Football via RapidAPI is the leading candidate. Stub manually until Phase 2.
- **Email**: Resend (transactional, later phase)
- **Hosting**: Vercel
- **Package manager**: npm

## Design system

Dark mode only for v1.

**Colors** (defined as Tailwind theme tokens in `app/globals.css`):
- `bg` `#202225` — page background, warm dark grey
- `surface` `#2A2D31` — cards, panels
- `surface-elevated` `#35383E` — hover states, dropdowns
- `border` `#3F424A`
- `primary` `#1F8A4C` — malachite, main brand color, buttons, links, active states
- `primary-bright` `#2BA85E` — hover state for primary
- `accent` `#D4AF37` — trophy gold, used sparingly for #1 rank, winners, special states
- `text` `#F5F2EC` — warm chalk, body text
- `text-muted` `#A8A9AD` — secondary text
- `text-subtle` `#6B6D72` — hints, captions
- `win` `#1F8A4C`, `draw` `#D4AF37`, `loss` `#C44545`

**Typography**:
- Body: Inter (next/font/google)
- Display headings: Fraunces (next/font/google)
- Numbers in leaderboards/standings: use `font-variant-numeric: tabular-nums`

**Gold rules**: Reserve `accent` for #1 rank highlights, winner announcements, the bonus pool prize. Never for primary buttons. If gold appears more than twice on a screen, reconsider.

## Domain rules (the pool itself)

**Budget**: 30 Pesodollars. Minimum 7 teams. Teams have costs from 1 to 7 Pesodollars, defined in a seed file (see `lib/teams-seed.ts` once it exists). Note: there are known duplicates in the source data (Ecuador appears at both 4 and 5 Pesodollars; Ghana at both 3 and 4) — pick one tier per team when seeding.

**Scoring**:
- Win: 3 points
- Draw: 1 point
- Losing on penalties in the knockout stage: 1 point
- A win after extra time (before penalties) is still a win = 3 points
- Penalty-shootout-decided knockout matches are NOT "draws" — the winner gets 3, the loser gets 1

**Tiebreakers** (in order):
1. Closest guess (either direction) to total goals scored in all 104 tournament games. Goals scored during penalty shootouts to decide a winner DO NOT count.
2. Closest guess (either direction) to the minute of the first goal in the Final.

**Bonus pool** (separate optional prize): 11 questions, most correct wins. Tied bonus winners broken by closest answer to question 11 (goals scored on USA throughout tournament).

## Data model

See `supabase/migrations/` for source of truth. High-level:

- `users` — Supabase Auth
- `pools` — one per organizer, has a 6-char join code, status (`draft`/`open`/`locked`/`completed`), `locks_at` timestamp
- `pool_settings` — bonus questions config, custom tiebreaker text
- `teams` — master team list with cost, group, flag URL
- `pool_teams` — joins pools to teams, allows per-pool cost overrides (future)
- `entries` — a participant's submission, has `paid` bool, tiebreaker answers
- `entry_teams` — joins entries to selected teams
- `entry_bonus_answers` — one row per bonus question per entry
- `matches` — tournament fixtures and results, with `went_to_penalties` and `penalty_winner_team_id`
- `match_events` — red cards, goals (for bonus question resolution)
- `standings_cache` — recomputed after each match, indexed on `pool_id`

## Architecture conventions

- **Server Components by default.** Add `'use client'` only when the file needs `useState`, event handlers, or browser APIs.
- **Data fetching**: directly in Server Components using a server-side Supabase client. No API routes for reads unless there's a reason.
- **Mutations**: Server Actions for form submissions. API routes only for webhooks (Stripe later, sports API ingestion).
- **Validation**: Zod schemas in `lib/schemas/`. Same schema runs client-side and server-side. Never trust the client.
- **Supabase RLS**: every table has Row Level Security enabled. A user can only read/write their own entries; pool owners can read all entries in their pools; the leaderboard is publicly readable for members of the pool.
- **Atomic writes**: submitting an entry (insert entry + insert entry_teams + insert bonus_answers) must be wrapped in a Supabase RPC function for atomicity. Don't do three sequential inserts from the client.
- **Standings recomputation**: a single function `recompute_pool_standings(pool_id uuid)` that the sports-data ingestion job calls after each match.

## File structure

```
app/
  (marketing)/
    page.tsx              # landing
    rules/page.tsx
    scoring/page.tsx
  (auth)/
    login/page.tsx
    signup/page.tsx
  (app)/
    layout.tsx            # protected, requires session
    my-entries/page.tsx
    pools/
      create/page.tsx
      [code]/
        page.tsx          # pool dashboard (organizer view)
        join/page.tsx     # join flow
        entries/
          new/page.tsx    # 3-step entry creation
          [id]/page.tsx   # entry detail
          [id]/edit/page.tsx
        leaderboard/page.tsx
        matches/page.tsx
        settings/page.tsx # organizer only
components/
  ui/                     # base primitives (Button, Input, Card)
  pool/                   # TeamSelector, BudgetMeter, TiebreakerInputs, BonusQuestions
  display/                # EntryCard, MatchCard, StandingsTable, TeamBadge
  layout/                 # Nav, Footer, PoolHeader
lib/
  supabase/
    server.ts             # server-side client
    client.ts             # browser client
    middleware.ts
  schemas/                # Zod schemas
  scoring/                # pure functions, unit-testable
  teams-seed.ts
supabase/
  migrations/
```

## Conventions

- All forms use Server Actions, progressive enhancement where possible
- All form validation: Zod schema → server action → return `{ error }` or `redirect()`
- Loading states: use Suspense boundaries with skeleton components, not spinner overlays
- Error boundaries: every route segment has `error.tsx`
- Never compute scores in the browser. The leaderboard reads `standings_cache`; the cache is written server-side.
- All money/budget math is integer Pesodollars. No floats anywhere.
- Dates: store UTC timestamps, render in the user's local timezone with `toLocaleString()`. The tournament happens across multiple timezones — be careful with "match day."

## What to push back on

- Adding payments, Stripe, or multi-pool support before the core scoring engine is proven correct on one pool
- Computing standings on read instead of from a cache
- Skipping RLS because "it's just my friends" — add it now, it's cheap
- Adding light mode before v1 ships
- Building a custom design system before shipping any pages — use Tailwind utilities directly until a pattern repeats 3+ times, then extract a component

## Open decisions (revisit before each is needed)

- Which sports data API exactly (API-Football vs alternatives) — defer until Phase 2
- Whether one user can have multiple entries in one pool — assume NO for v1, can be relaxed later
- Whether to allow late joiners after group stage starts — assume NO, hard lock at first kickoff
