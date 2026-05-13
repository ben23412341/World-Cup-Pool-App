-- Allow any authenticated user to look up a pool by its join_code.
-- The join flow needs this before the requesting user is a pool member,
-- so a security-definer function is used to bypass the member-only RLS policy.
create or replace function get_pool_by_join_code(p_code text)
returns table (
  id        uuid,
  name      text,
  description text,
  join_code char(6),
  status    text,
  owner_id  uuid
)
language sql security definer stable as $$
  select id, name, description, join_code, status, owner_id
  from pools
  where upper(join_code) = upper(p_code)
    and auth.uid() is not null;
$$;
