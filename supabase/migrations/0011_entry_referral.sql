alter table entries
  add column if not exists referred_by_first_name text,
  add column if not exists referred_by_last_name  text;
