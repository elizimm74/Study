-- 0005: launch features.
--  1. SHARING: a founder can make one test's scorecard public (headline numbers
--     only, behind a random link) and switch it off again.
--  2. ACCURACY: founders can enter their REAL conversion rate next to Crawler's
--     prediction; the public /accuracy page shows the anonymous comparison.
--  3. ABUSE LIMIT: at most 4 unfinished jobs per user at a time (fair queue).
--  4. CREDITS: profiles.bonus_tests + grant_tests() so a purchase can add tests
--     (Stripe's webhook will call grant_tests with the service key; users can't).

-- ---------- 1. sharing ----------
alter table public.tests add column share_token text unique;

create function public.share_test(p_test_id text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_token text;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  select share_token into v_token from public.tests where id = p_test_id and user_id = v_user and status = 'done';
  if not found then raise exception 'That test was not found, or it is not finished yet.'; end if;
  if v_token is null then
    v_token := substr(replace(gen_random_uuid()::text, '-', ''), 1, 20);
    update public.tests set share_token = v_token where id = p_test_id and user_id = v_user;
  end if;
  return v_token;
end $$;

create function public.unshare_test(p_test_id text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  update public.tests set share_token = null where id = p_test_id and user_id = auth.uid();
end $$;

-- What anyone with the link may see: headline numbers only (no quotes, no page
-- text, no screenshots, no account details).
create function public.get_shared_test(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'kind', case when t.data ->> 'kind' = 'app' then 'app' else 'website' end,
    'host', case when t.url like 'app://%' then null
                 else split_part(regexp_replace(t.url, '^https?://(www\.)?', ''), '/', 1) end,
    'goal', t.goal,
    'score', t.score,
    'total', t.total,
    'blocker', t.data -> 'stats' -> 'objections' -> 0 ->> 'category',
    'low', (t.data -> 'stats' -> 'convert' ->> 'low')::numeric,
    'high', (t.data -> 'stats' -> 'convert' ->> 'high')::numeric,
    'created_at', t.created_at
  )
  from public.tests t
  where t.share_token = p_token and t.status = 'done' and length(p_token) >= 16
$$;

-- ---------- 2. accuracy ----------
create table public.test_actuals (
  test_id text primary key references public.tests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  real_pct numeric not null check (real_pct >= 0 and real_pct <= 100),
  created_at timestamptz not null default now()
);
alter table public.test_actuals enable row level security;
create policy "Users can read their own results" on public.test_actuals
  for select to authenticated using ((select auth.uid()) = user_id);

create function public.submit_actual(p_test_id text, p_real_pct numeric) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  if p_real_pct is null or p_real_pct < 0 or p_real_pct > 100 then raise exception 'Please enter a percentage from 0 to 100.'; end if;
  if not exists (select 1 from public.tests where id = p_test_id and user_id = v_user and status = 'done') then
    raise exception 'That test was not found, or it is not finished yet.';
  end if;
  insert into public.test_actuals (test_id, user_id, real_pct) values (p_test_id, v_user, p_real_pct)
  on conflict (test_id) do update set real_pct = excluded.real_pct, created_at = now();
end $$;

-- Anonymous list for the public accuracy page: prediction vs real, nothing else.
create function public.public_accuracy() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'kind', case when t.data ->> 'kind' = 'app' then 'app' else 'website' end,
           'predicted', round(t.score::numeric / t.total * 100, 1),
           'real', a.real_pct) order by a.created_at desc), '[]'::jsonb)
  from public.test_actuals a join public.tests t on t.id = a.test_id
  where t.total > 0 and t.score is not null
$$;

-- ---------- 3 + 4. fair queue and credits ----------
alter table public.profiles add column bonus_tests integer not null default 0;

create function public.grant_tests(p_user uuid, p_n integer) returns void
language sql security definer set search_path = '' as $$
  update public.profiles set bonus_tests = bonus_tests + greatest(p_n, 0) where id = p_user
$$;

create function public.check_job_cap(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce((select is_admin from public.profiles where id = p_user), false) then return; end if;
  if (select count(*) from public.jobs where user_id = p_user and status in ('queued', 'running')) >= 4 then
    raise exception 'You already have several tests running. Please wait for one to finish.';
  end if;
end $$;

create or replace function public.start_analyze(p_url text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_id text;
  v_recent integer;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  if p_url is null or length(p_url) > 2000 or p_url !~* '^https?://' then
    raise exception 'Please enter a valid website address.';
  end if;
  select count(*) into v_recent from public.crawls
   where user_id = v_user and created_at > now() - interval '1 hour';
  if v_recent >= 30 and not coalesce((select is_admin from public.profiles where id = v_user), false) then
    raise exception 'Too many analyses in the last hour. Please wait a bit.';
  end if;
  perform public.check_job_cap(v_user);
  v_id := public.short_id();
  insert into public.crawls (id, user_id, url) values (v_id, v_user, p_url);
  insert into public.jobs (kind, ref_id, user_id, max_attempts) values ('analyze', v_id, v_user, 2);
  return v_id;
end $$;

create or replace function public.start_app_analyze(p_batch text, p_screens jsonb, p_screens_b jsonb default '[]'::jsonb)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_id text;
  v_recent integer;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  if p_batch is null or p_batch !~ '^[a-z0-9]{8,40}$' then raise exception 'Bad upload id.'; end if;
  if jsonb_typeof(p_screens) <> 'array' or jsonb_array_length(p_screens) < 1 or jsonb_array_length(p_screens) > 15 then
    raise exception 'Please upload between 1 and 15 screens.';
  end if;
  if jsonb_typeof(p_screens_b) <> 'array' or jsonb_array_length(p_screens_b) > 5 then
    raise exception 'Version B can have up to 5 screens.';
  end if;
  if exists (
    select 1 from jsonb_array_elements_text(p_screens || p_screens_b) f where f !~ '^b?[0-9]{1,2}\.jpg$'
  ) then
    raise exception 'Bad screen file name.';
  end if;
  select count(*) into v_recent from public.crawls
   where user_id = v_user and created_at > now() - interval '1 hour';
  if v_recent >= 30 and not coalesce((select is_admin from public.profiles where id = v_user), false) then
    raise exception 'Too many analyses in the last hour. Please wait a bit.';
  end if;
  perform public.check_job_cap(v_user);
  v_id := public.short_id();
  insert into public.crawls (id, user_id, url, data)
  values (v_id, v_user, 'app://' || p_batch,
          jsonb_build_object('kind', 'app', 'input', jsonb_build_object('batch', p_batch, 'screens', p_screens, 'screensB', p_screens_b)));
  insert into public.jobs (kind, ref_id, user_id, max_attempts) values ('analyze', v_id, v_user, 2);
  return v_id;
end $$;

create or replace function public.start_test(p_crawl_id text, p_settings jsonb, p_secret text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_crawl public.crawls;
  v_profile public.profiles;
  v_used integer;
  v_id text;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  select * into v_crawl from public.crawls where id = p_crawl_id and user_id = v_user;
  if not found then raise exception 'That analysis was not found. Analyze the URL again.'; end if;
  if v_crawl.status <> 'done' then raise exception 'The analysis is not finished yet.'; end if;

  select * into v_profile from public.profiles where id = v_user for update;
  if not found then
    insert into public.profiles (id) values (v_user) returning * into v_profile;
  end if;
  if not v_profile.is_admin then
    perform public.check_job_cap(v_user);
    select count(*) into v_used from public.tests
     where user_id = v_user and status <> 'error'
       and (v_profile.plan in ('free', 'launch') or created_at >= date_trunc('month', now()));
    if v_used >= public.plan_test_limit(v_profile.plan) + v_profile.bonus_tests then
      raise exception 'LIMIT_REACHED';
    end if;
  end if;

  v_id := public.short_id();
  insert into public.tests (id, user_id, crawl_id, url, goal, status, total, data)
  values (v_id, v_user, p_crawl_id, v_crawl.url, p_settings #>> '{profile,goal}', 'queued',
          coalesce((p_settings ->> 'count')::integer, 100), jsonb_build_object('settings', p_settings));
  insert into public.jobs (kind, ref_id, user_id, secret, max_attempts) values ('run', v_id, v_user, p_secret, 2);
  return v_id;
end $$;

-- ---------- who may call what ----------
revoke all on function public.share_test(text) from public, anon;
revoke all on function public.unshare_test(text) from public, anon;
revoke all on function public.submit_actual(text, numeric) from public, anon;
revoke all on function public.get_shared_test(text) from public;
revoke all on function public.public_accuracy() from public;
revoke all on function public.grant_tests(uuid, integer) from public, anon, authenticated;
revoke all on function public.check_job_cap(uuid) from public, anon, authenticated;
grant execute on function public.share_test(text) to authenticated;
grant execute on function public.unshare_test(text) to authenticated;
grant execute on function public.submit_actual(text, numeric) to authenticated;
grant execute on function public.get_shared_test(text) to anon, authenticated; -- the public scorecard page
grant execute on function public.public_accuracy() to anon, authenticated;     -- the public accuracy page
grant execute on function public.grant_tests(uuid, integer) to service_role;
