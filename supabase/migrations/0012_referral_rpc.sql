-- Returns the referral name stored in auth user metadata for a given entry.
-- SECURITY DEFINER so it can read auth.users; checks pool membership before returning.
create or replace function get_entry_referral(p_entry_id uuid)
returns jsonb
language plpgsql security definer stable as $$
declare
  v_pool_id   uuid;
  v_user_id   uuid;
  v_meta      jsonb;
begin
  select pool_id, user_id
    into v_pool_id, v_user_id
    from entries
   where id = p_entry_id;

  if not found then return null; end if;

  -- Visible to: the entry owner, pool owner, or any pool member
  if auth.uid() != v_user_id
     and not is_pool_owner(v_pool_id)
     and not is_pool_member(v_pool_id)
  then
    return null;
  end if;

  select raw_user_meta_data
    into v_meta
    from auth.users
   where id = v_user_id;

  return v_meta;
end;
$$;
