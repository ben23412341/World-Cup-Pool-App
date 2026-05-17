-- Pool owner can remove (delete) any entry in their pool.
-- Cascades automatically clear entry_teams, entry_bonus_answers, standings_cache.
create policy "entries_pool_owner_delete" on entries
  for delete using (is_pool_owner(pool_id));
