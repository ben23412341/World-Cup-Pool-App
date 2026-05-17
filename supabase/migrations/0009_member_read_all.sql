-- Members can read other members' team picks (entry detail pages).
-- Completes the set started in 0008, which covered entries + entry_bonus_answers.
create policy "entry_teams_pool_member_read" on entry_teams
  for select using (
    exists (
      select 1 from entries e
      where e.id = entry_id and is_pool_member(e.pool_id)
    )
  );
