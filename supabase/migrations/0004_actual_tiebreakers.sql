-- Add actual tiebreaker result columns to pools and update ranking to use them.
-- Ties on points with no actuals entered → equal rank (no creation-order tiebreaker).

alter table pools
  add column actual_total_goals             integer,
  add column actual_final_first_goal_minute integer;

create or replace function recompute_pool_standings(p_pool_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_actual_goals  integer;
  v_actual_minute integer;
begin
  select actual_total_goals, actual_final_first_goal_minute
  into v_actual_goals, v_actual_minute
  from pools
  where id = p_pool_id;

  delete from standings_cache where pool_id = p_pool_id;

  insert into standings_cache (pool_id, entry_id, points, rank, computed_at)
  with scored as (
    select
      e.id                      as entry_id,
      e.tiebreaker_total_goals,
      e.tiebreaker_final_minute,
      coalesce(sum(
        case
          when m.went_to_penalties and m.penalty_winner_team_id != et.team_id then 1
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
      ), 0) as points
    from entries e
    join entry_teams et on et.entry_id = e.id
    left join matches m on
      m.pool_id = p_pool_id
      and m.status = 'finished'
      and (m.home_team_id = et.team_id or m.away_team_id = et.team_id)
    where e.pool_id = p_pool_id
    group by e.id, e.tiebreaker_total_goals, e.tiebreaker_final_minute
  )
  select
    p_pool_id,
    entry_id,
    points,
    rank() over (
      order by
        points desc,
        case
          when v_actual_goals is not null
            then abs(coalesce(tiebreaker_total_goals, 9999) - v_actual_goals)
          else 0
        end asc,
        case
          when v_actual_minute is not null
            then abs(coalesce(tiebreaker_final_minute, 9999) - v_actual_minute)
          else 0
        end asc
    ) as rank,
    now() as computed_at
  from scored;
end;
$$;
