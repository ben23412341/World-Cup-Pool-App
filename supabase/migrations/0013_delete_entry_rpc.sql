-- RPC to delete an entry as the pool owner.
-- Runs as security definer so it bypasses RLS and works regardless of whether
-- the entries_pool_owner_delete policy has been applied.
create or replace function delete_entry_as_owner(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pool_id uuid;
  v_owner_id uuid;
begin
  -- Fetch entry's pool
  select pool_id into v_pool_id
  from entries
  where id = p_entry_id;

  if v_pool_id is null then
    raise exception 'Entry not found';
  end if;

  -- Verify caller is pool owner
  select owner_id into v_owner_id
  from pools
  where id = v_pool_id;

  if v_owner_id is distinct from auth.uid() then
    raise exception 'Only the pool owner can delete entries';
  end if;

  -- Delete — cascades to entry_teams, entry_bonus_answers, standings_cache
  delete from entries where id = p_entry_id;
end;
$$;
