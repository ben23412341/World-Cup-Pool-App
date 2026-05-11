-- =============================================================================
-- 0001_initial_schema.sql
-- World Cup Pool — initial schema
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helper: generate a random 6-character uppercase join code
-- ---------------------------------------------------------------------------
create or replace function generate_join_code()
returns text
language sql
as $$
  select upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 6));
$$;

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------
create table teams (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  code          char(3) not null unique,          -- e.g. 'ARG', 'BRA'
  group_name    char(1),                          -- 'A'–'L' during group stage
  cost          integer not null check (cost between 1 and 7),
  flag_url      text,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- pools
-- ---------------------------------------------------------------------------
create table pools (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete restrict,
  name          text not null,
  description   text,
  join_code     char(6) not null unique default generate_join_code(),
  status        text not null default 'draft'
                  check (status in ('draft', 'open', 'locked', 'completed')),
  locks_at      timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index pools_owner_id_idx on pools(owner_id);
create index pools_join_code_idx on pools(join_code);

-- ---------------------------------------------------------------------------
-- pool_settings
-- ---------------------------------------------------------------------------
create table pool_settings (
  pool_id                 uuid primary key references pools(id) on delete cascade,
  -- tiebreaker question text overrides (optional)
  tiebreaker_1_label      text,
  tiebreaker_2_label      text,
  -- bonus questions stored as a JSONB array of {id, text, type}
  -- type: 'text' | 'number' | 'team' | 'yn'
  bonus_questions         jsonb not null default '[]',
  updated_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- pool_teams (per-pool team roster + optional cost override)
-- ---------------------------------------------------------------------------
create table pool_teams (
  pool_id       uuid not null references pools(id) on delete cascade,
  team_id       uuid not null references teams(id) on delete restrict,
  cost_override integer check (cost_override between 1 and 7),
  primary key (pool_id, team_id)
);

-- ---------------------------------------------------------------------------
-- entries
-- ---------------------------------------------------------------------------
create table entries (
  id                      uuid primary key default gen_random_uuid(),
  pool_id                 uuid not null references pools(id) on delete cascade,
  user_id                 uuid not null references auth.users(id) on delete restrict,
  display_name            text not null,
  paid                    boolean not null default false,
  -- tiebreaker answers (integers; null until submitted)
  tiebreaker_total_goals  integer,
  tiebreaker_final_minute integer,
  submitted_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  -- one entry per user per pool for v1
  unique (pool_id, user_id)
);

create index entries_pool_id_idx on entries(pool_id);
create index entries_user_id_idx on entries(user_id);

-- ---------------------------------------------------------------------------
-- entry_teams
-- ---------------------------------------------------------------------------
create table entry_teams (
  entry_id      uuid not null references entries(id) on delete cascade,
  team_id       uuid not null references teams(id) on delete restrict,
  primary key (entry_id, team_id)
);

-- ---------------------------------------------------------------------------
-- entry_bonus_answers
-- ---------------------------------------------------------------------------
create table entry_bonus_answers (
  id              uuid primary key default gen_random_uuid(),
  entry_id        uuid not null references entries(id) on delete cascade,
  question_index  integer not null check (question_index between 1 and 11),
  answer_text     text,
  answer_number   integer,
  unique (entry_id, question_index)
);

create index entry_bonus_answers_entry_id_idx on entry_bonus_answers(entry_id);

-- ---------------------------------------------------------------------------
-- matches
-- ---------------------------------------------------------------------------
create table matches (
  id                      uuid primary key default gen_random_uuid(),
  pool_id                 uuid not null references pools(id) on delete cascade,
  home_team_id            uuid references teams(id),
  away_team_id            uuid references teams(id),
  stage                   text not null
                            check (stage in (
                              'group', 'round_of_32', 'round_of_16',
                              'quarter_final', 'semi_final', 'third_place', 'final'
                            )),
  match_number            integer,
  kickoff_at              timestamptz,
  -- result (null until played)
  home_score              integer,
  away_score              integer,
  went_to_extra_time      boolean not null default false,
  went_to_penalties       boolean not null default false,
  -- null unless went_to_penalties = true
  penalty_winner_team_id  uuid references teams(id),
  status                  text not null default 'scheduled'
                            check (status in ('scheduled', 'live', 'finished', 'cancelled')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index matches_pool_id_idx on matches(pool_id);
create index matches_kickoff_at_idx on matches(kickoff_at);

-- ---------------------------------------------------------------------------
-- match_events  (goals, red cards — used for bonus question resolution)
-- ---------------------------------------------------------------------------
create table match_events (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid not null references matches(id) on delete cascade,
  team_id       uuid references teams(id),
  event_type    text not null check (event_type in ('goal', 'red_card', 'yellow_red_card')),
  -- minute as recorded; null for events with unknown time
  minute        integer,
  -- true for goals scored during the penalty shootout (excluded from tiebreaker count)
  is_penalty_shootout boolean not null default false,
  created_at    timestamptz not null default now()
);

create index match_events_match_id_idx on match_events(match_id);

-- ---------------------------------------------------------------------------
-- standings_cache
-- ---------------------------------------------------------------------------
create table standings_cache (
  id            uuid primary key default gen_random_uuid(),
  pool_id       uuid not null references pools(id) on delete cascade,
  entry_id      uuid not null references entries(id) on delete cascade,
  points        integer not null default 0,
  rank          integer,
  computed_at   timestamptz not null default now(),
  unique (pool_id, entry_id)
);

create index standings_cache_pool_id_rank_idx on standings_cache(pool_id, rank);

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pools_updated_at
  before update on pools
  for each row execute function set_updated_at();

create trigger entries_updated_at
  before update on entries
  for each row execute function set_updated_at();

create trigger matches_updated_at
  before update on matches
  for each row execute function set_updated_at();

create trigger pool_settings_updated_at
  before update on pool_settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Atomic entry submission RPC
-- Inserts entry + entry_teams + bonus_answers in one transaction.
-- p_teams:         [{team_id}]
-- p_bonus_answers: [{question_index, answer_text, answer_number}]
-- ---------------------------------------------------------------------------
create or replace function submit_entry(
  p_pool_id               uuid,
  p_display_name          text,
  p_tiebreaker_goals      integer,
  p_tiebreaker_minute     integer,
  p_teams                 jsonb,  -- [{team_id: uuid}]
  p_bonus_answers         jsonb   -- [{question_index: int, answer_text: text, answer_number: int}]
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_entry_id  uuid;
  v_team      jsonb;
  v_answer    jsonb;
  v_team_count integer;
  v_total_cost integer;
begin
  -- validate team count
  v_team_count := jsonb_array_length(p_teams);
  if v_team_count < 7 then
    raise exception 'minimum 7 teams required, got %', v_team_count;
  end if;

  -- validate budget (use pool_teams cost_override when present, else teams.cost)
  select coalesce(sum(coalesce(pt.cost_override, t.cost)), 0)
  into v_total_cost
  from jsonb_array_elements(p_teams) as el,
       lateral (select (el->>'team_id')::uuid as tid) as x
  join teams t on t.id = x.tid
  left join pool_teams pt on pt.pool_id = p_pool_id and pt.team_id = x.tid;

  if v_total_cost > 30 then
    raise exception 'budget exceeded: % Pesodollars (max 30)', v_total_cost;
  end if;

  -- insert entry
  insert into entries (
    pool_id, user_id, display_name,
    tiebreaker_total_goals, tiebreaker_final_minute,
    submitted_at
  )
  values (
    p_pool_id, auth.uid(), p_display_name,
    p_tiebreaker_goals, p_tiebreaker_minute,
    now()
  )
  returning id into v_entry_id;

  -- insert entry_teams
  for v_team in select * from jsonb_array_elements(p_teams)
  loop
    insert into entry_teams (entry_id, team_id)
    values (v_entry_id, (v_team->>'team_id')::uuid);
  end loop;

  -- insert bonus answers
  for v_answer in select * from jsonb_array_elements(p_bonus_answers)
  loop
    insert into entry_bonus_answers (entry_id, question_index, answer_text, answer_number)
    values (
      v_entry_id,
      (v_answer->>'question_index')::integer,
      v_answer->>'answer_text',
      (v_answer->>'answer_number')::integer
    );
  end loop;

  return v_entry_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Standings recomputation
-- Scoring: win=3, draw=1, loss=0, penalty_loss=1
-- Called by the sports-data ingestion job after each match result is saved.
-- ---------------------------------------------------------------------------
create or replace function recompute_pool_standings(p_pool_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- delete and reinsert so we can re-rank cleanly
  delete from standings_cache where pool_id = p_pool_id;

  insert into standings_cache (pool_id, entry_id, points, rank, computed_at)
  select
    p_pool_id,
    e.id as entry_id,
    coalesce(sum(
      case
        -- penalty loss in knockout stage → 1 point
        when m.went_to_penalties and m.penalty_winner_team_id != et.team_id then 1
        -- match result from the perspective of the selected team
        when m.home_team_id = et.team_id then
          case
            when m.home_score > m.away_score then 3
            when m.home_score = m.away_score then 1
            else 0
          end
        when m.away_team_id = et.team_id then
          case
            when m.away_score > m.home_score then 3
            when m.away_score = m.home_score then 1
            else 0
          end
        else 0
      end
    ), 0) as points,
    rank() over (
      order by coalesce(sum(
        case
          when m.went_to_penalties and m.penalty_winner_team_id != et.team_id then 1
          when m.home_team_id = et.team_id then
            case when m.home_score > m.away_score then 3
                 when m.home_score = m.away_score then 1 else 0 end
          when m.away_team_id = et.team_id then
            case when m.away_score > m.home_score then 3
                 when m.away_score = m.home_score then 1 else 0 end
          else 0
        end
      ), 0) desc
    ) as rank,
    now() as computed_at
  from entries e
  join entry_teams et on et.entry_id = e.id
  left join matches m on
    m.pool_id = p_pool_id
    and m.status = 'finished'
    and (m.home_team_id = et.team_id or m.away_team_id = et.team_id)
  where e.pool_id = p_pool_id
  group by e.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table teams              enable row level security;
alter table pools              enable row level security;
alter table pool_settings      enable row level security;
alter table pool_teams         enable row level security;
alter table entries            enable row level security;
alter table entry_teams        enable row level security;
alter table entry_bonus_answers enable row level security;
alter table matches            enable row level security;
alter table match_events       enable row level security;
alter table standings_cache    enable row level security;

-- teams: readable by everyone (no auth required — public reference data)
create policy "teams_read_all" on teams for select using (true);

-- pools: owner can do anything; members can read their own pool
create policy "pools_owner_all" on pools
  for all using (owner_id = auth.uid());

create policy "pools_member_read" on pools
  for select using (
    exists (
      select 1 from entries e
      where e.pool_id = id and e.user_id = auth.uid()
    )
  );

-- pool_settings: same as pools
create policy "pool_settings_owner_all" on pool_settings
  for all using (
    exists (select 1 from pools p where p.id = pool_id and p.owner_id = auth.uid())
  );

create policy "pool_settings_member_read" on pool_settings
  for select using (
    exists (
      select 1 from entries e where e.pool_id = pool_id and e.user_id = auth.uid()
    )
  );

-- pool_teams: owner can manage; pool members can read
create policy "pool_teams_owner_all" on pool_teams
  for all using (
    exists (select 1 from pools p where p.id = pool_id and p.owner_id = auth.uid())
  );

create policy "pool_teams_member_read" on pool_teams
  for select using (
    exists (
      select 1 from entries e where e.pool_id = pool_id and e.user_id = auth.uid()
    )
  );

-- entries: owner of the pool can read all; user can read/write their own
create policy "entries_own" on entries
  for all using (user_id = auth.uid());

create policy "entries_pool_owner_read" on entries
  for select using (
    exists (select 1 from pools p where p.id = pool_id and p.owner_id = auth.uid())
  );

-- entry_teams: same rules derived via entry
create policy "entry_teams_own" on entry_teams
  for all using (
    exists (select 1 from entries e where e.id = entry_id and e.user_id = auth.uid())
  );

create policy "entry_teams_pool_owner_read" on entry_teams
  for select using (
    exists (
      select 1 from entries e
      join pools p on p.id = e.pool_id
      where e.id = entry_id and p.owner_id = auth.uid()
    )
  );

-- entry_bonus_answers: same
create policy "entry_bonus_answers_own" on entry_bonus_answers
  for all using (
    exists (select 1 from entries e where e.id = entry_id and e.user_id = auth.uid())
  );

create policy "entry_bonus_answers_pool_owner_read" on entry_bonus_answers
  for select using (
    exists (
      select 1 from entries e
      join pools p on p.id = e.pool_id
      where e.id = entry_id and p.owner_id = auth.uid()
    )
  );

-- matches: pool members can read; owner can write
create policy "matches_member_read" on matches
  for select using (
    exists (
      select 1 from entries e where e.pool_id = pool_id and e.user_id = auth.uid()
    )
    or exists (select 1 from pools p where p.id = pool_id and p.owner_id = auth.uid())
  );

create policy "matches_owner_write" on matches
  for all using (
    exists (select 1 from pools p where p.id = pool_id and p.owner_id = auth.uid())
  );

-- match_events: readable by pool members/owner
create policy "match_events_member_read" on match_events
  for select using (
    exists (
      select 1 from matches m
      join entries e on e.pool_id = m.pool_id
      where m.id = match_id and e.user_id = auth.uid()
    )
    or exists (
      select 1 from matches m
      join pools p on p.id = m.pool_id
      where m.id = match_id and p.owner_id = auth.uid()
    )
  );

create policy "match_events_owner_write" on match_events
  for all using (
    exists (
      select 1 from matches m
      join pools p on p.id = m.pool_id
      where m.id = match_id and p.owner_id = auth.uid()
    )
  );

-- standings_cache: readable by pool members and owner
create policy "standings_cache_member_read" on standings_cache
  for select using (
    exists (
      select 1 from entries e where e.pool_id = pool_id and e.user_id = auth.uid()
    )
    or exists (select 1 from pools p where p.id = pool_id and p.owner_id = auth.uid())
  );
insert into teams (name, code, cost) values
  ('France', 'FRA', 7),
  ('Spain', 'ESP', 7),
  ('Brazil', 'BRA', 7),
  ('England', 'ENG', 7),
  ('Argentina', 'ARG', 7),
  ('Portugal', 'POR', 7),
  ('Netherlands', 'NED', 6),
  ('Germany', 'GER', 6),
  ('Belgium', 'BEL', 6),
  ('Colombia', 'COL', 6),
  ('Norway', 'NOR', 6),
  ('Morocco', 'MAR', 6),
  ('Japan', 'JPN', 5),
  ('Uruguay', 'URU', 5),
  ('Mexico', 'MEX', 5),
  ('Croatia', 'CRO', 5),
  ('Ecuador', 'ECU', 5),
  ('USA', 'USA', 5),
  ('Switzerland', 'SUI', 4),
  ('Turkey', 'TUR', 4),
  ('Sweden', 'SWE', 4),
  ('Senegal', 'SEN', 4),
  ('Czech Republic', 'CZE', 4),
  ('Ghana', 'GHA', 4),
  ('Paraguay', 'PAR', 4),
  ('Austria', 'AUT', 4),
  ('Canada', 'CAN', 3),
  ('DR Congo', 'COD', 3),
  ('Iran', 'IRN', 3),
  ('Australia', 'AUS', 3),
  ('Scotland', 'SCO', 3),
  ('Tunisia', 'TUN', 3),
  ('South Korea', 'KOR', 3),
  ('Algeria', 'ALG', 3),
  ('Egypt', 'EGY', 3),
  ('Ivory Coast', 'CIV', 3),
  ('Bosnia', 'BIH', 3),
  ('Panama', 'PAN', 2),
  ('New Zealand', 'NZL', 2),
  ('Qatar', 'QAT', 2),
  ('Saudi Arabia', 'KSA', 2),
  ('South Africa', 'RSA', 2),
  ('Haiti', 'HAI', 1),
  ('Jordan', 'JOR', 1),
  ('Iraq', 'IRQ', 1),
  ('Curacao', 'CUW', 1),
  ('Cape Verde', 'CPV', 1),
  ('Uzbekistan', 'UZB', 1)
on conflict (name) do nothing;
