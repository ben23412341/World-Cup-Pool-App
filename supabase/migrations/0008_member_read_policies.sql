-- Pool members can read all entries in their pool (leaderboard names, standings).
-- is_pool_member() uses SECURITY DEFINER so no RLS recursion risk.
create policy "entries_pool_member_read" on entries
  for select using (is_pool_member(pool_id));

-- Pool members can read other members' bonus answers (leaderboard bonus section).
create policy "entry_bonus_answers_pool_member_read" on entry_bonus_answers
  for select using (
    exists (
      select 1 from entries e
      where e.id = entry_id
        and is_pool_member(e.pool_id)
    )
  );
