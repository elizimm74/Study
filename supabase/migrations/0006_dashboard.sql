-- 0006: the dashboard.
--  1. saved_audiences: "customer minds" a user builds and keeps (name + the audience settings).
--     Plain row-level security (each person only sees and changes their own); at most 20 each.
--  2. crawler_trends(): anonymous "what blocks people most across Crawler tests". It returns
--     NOTHING until there are at least 30 finished tests, and only categories with 5+ tests,
--     so a single person's test can never be picked out. Counts only: no urls, no text.

create table public.saved_audiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  audience jsonb not null check (jsonb_typeof(audience) = 'object' and pg_column_size(audience) < 6000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index saved_audiences_name_idx on public.saved_audiences (user_id, lower(btrim(name)));

alter table public.saved_audiences enable row level security;
create policy "Users can read their own minds" on public.saved_audiences
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can add their own minds" on public.saved_audiences
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can change their own minds" on public.saved_audiences
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own minds" on public.saved_audiences
  for delete to authenticated using ((select auth.uid()) = user_id);

-- At most 20 saved minds per person (a runaway script can't fill the table).
create function public.cap_saved_audiences() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.saved_audiences where user_id = new.user_id) >= 20 then
    raise exception 'You can save up to 20 customer minds. Delete one to add another.';
  end if;
  return new;
end $$;
create trigger saved_audiences_cap before insert on public.saved_audiences
  for each row execute function public.cap_saved_audiences();

create function public.touch_saved_audience() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger saved_audiences_touch before update on public.saved_audiences
  for each row execute function public.touch_saved_audience();

-- ---------- anonymous trends ----------
create function public.crawler_trends() returns jsonb
language sql stable security definer set search_path = '' as $$
  with t as (
    select t.data -> 'stats' -> 'objections' -> 0 ->> 'category' as blocker
      from public.tests t
     where t.status = 'done' and t.data -> 'stats' -> 'objections' -> 0 is not null
  ),
  n as (select count(*) as total from t),
  c as (select blocker, count(*) as cnt from t group by blocker having count(*) >= 5)
  select case
    when (select total from n) < 30
      then jsonb_build_object('enough', false, 'tests', (select total from n), 'needed', 30)
    else jsonb_build_object('enough', true, 'tests', (select total from n),
           'blockers', coalesce((select jsonb_agg(jsonb_build_object('category', blocker, 'pct', round(100.0 * cnt / (select total from n))) order by cnt desc) from c), '[]'::jsonb))
  end
$$;

revoke all on function public.cap_saved_audiences() from public, anon, authenticated;
revoke all on function public.touch_saved_audience() from public, anon, authenticated;
revoke all on function public.crawler_trends() from public, anon;
grant execute on function public.crawler_trends() to authenticated;
