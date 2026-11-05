-- Production architecture: profiles, crawls, a job queue, safe database
-- functions, and private screenshot storage. See docs/architecture.md.
--
-- Rule of thumb: users can only READ their own rows. Every WRITE goes through
-- a checked database function (start_analyze / start_test) or the worker.

-- ---------- profiles: plan + admin flag, one row per user ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'launch', 'pro', 'scale')),
  is_admin boolean not null default false, -- admins have no test limit (the founder)
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Users can see their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

-- Every new account gets a profile automatically.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
insert into public.profiles (id) select id from auth.users on conflict do nothing; -- existing users

-- How many tests each plan includes (free/launch: in total; pro/scale: per month).
create function public.plan_test_limit(p_plan text) returns integer
language sql immutable set search_path = '' as $$
  select case p_plan when 'free' then 1 when 'launch' then 3 when 'pro' then 17 when 'scale' then 10 else 0 end
$$;

-- Short random ids like "a1b2c3d4e5".
create function public.short_id() returns text
language sql volatile set search_path = '' as $$
  select substr(md5(random()::text || clock_timestamp()::text), 1, 10)
$$;

-- ---------- crawls: "analyze" results ----------
create table public.crawls (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  url text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'error')),
  error text,
  data jsonb, -- { crawl (pages), profile, audience }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index crawls_user_created_idx on public.crawls (user_id, created_at desc);
alter table public.crawls enable row level security;
create policy "Users can see their own crawls" on public.crawls
  for select to authenticated using ((select auth.uid()) = user_id);

-- ---------- tests: now written only by start_test() and the worker ----------
drop policy "Users can create their own tests" on public.tests;
drop policy "Users can update their own tests" on public.tests;
alter table public.tests alter column user_id drop default;
alter table public.tests alter column status set default 'queued';
update public.tests set status = 'error' where status not in ('queued', 'running', 'done', 'error');
alter table public.tests add constraint tests_status_check check (status in ('queued', 'running', 'done', 'error'));
alter table public.tests
  add column crawl_id text references public.crawls (id) on delete set null,
  add column stage text,      -- e.g. "Personas are reviewing your site"
  add column progress jsonb,  -- { done, total, journey } for the live view
  add column error text;

-- ---------- jobs: the work queue (only the worker can see it) ----------
create table public.jobs (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('analyze', 'run')),
  ref_id text not null, -- the crawls.id or tests.id this job is for
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'error')),
  attempts integer not null default 0,
  max_attempts integer not null default 2,
  locked_by text,
  locked_at timestamptz,
  heartbeat_at timestamptz,
  secret text, -- ENCRYPTED test-account login (if any); erased once the worker reads it
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_queue_idx on public.jobs (status, id) where status in ('queued', 'running');
alter table public.jobs enable row level security; -- no policies: users can't see or touch jobs

-- ---------- start_analyze(url): signed-in users ----------
create function public.start_analyze(p_url text) returns text
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
  -- A light guard against abuse: 30 analyses per hour.
  select count(*) into v_recent from public.crawls
   where user_id = v_user and created_at > now() - interval '1 hour';
  if v_recent >= 30 and not coalesce((select is_admin from public.profiles where id = v_user), false) then
    raise exception 'Too many analyses in the last hour. Please wait a bit.';
  end if;
  v_id := public.short_id();
  insert into public.crawls (id, user_id, url) values (v_id, v_user, p_url);
  insert into public.jobs (kind, ref_id, user_id, max_attempts) values ('analyze', v_id, v_user, 2);
  return v_id;
end $$;

-- ---------- start_test(crawl, settings, secret): checks the plan limit atomically ----------
create function public.start_test(p_crawl_id text, p_settings jsonb, p_secret text default null) returns text
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

  -- Lock this user's profile row, so two clicks at the same moment can't both
  -- pass the limit check (the second one waits, then sees the first test).
  select * into v_profile from public.profiles where id = v_user for update;
  if not found then
    insert into public.profiles (id) values (v_user) returning * into v_profile;
  end if;
  if not v_profile.is_admin then
    select count(*) into v_used from public.tests
     where user_id = v_user and status <> 'error' -- failed tests don't use up your plan
       and (v_profile.plan in ('free', 'launch') or created_at >= date_trunc('month', now()));
    if v_used >= public.plan_test_limit(v_profile.plan) then
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

-- ---------- claim_job(worker): worker only ----------
-- Hands one waiting job to a worker. FOR UPDATE SKIP LOCKED lets many
-- workers ask at once, and each one gets a different job.
-- Jobs whose worker vanished (no heartbeat for 5 minutes) are retried, or
-- marked failed once they're out of attempts.
create function public.claim_job(p_worker text) returns setof public.jobs
language plpgsql security definer set search_path = '' as $$
declare
  r record;
begin
  for r in
    update public.jobs set status = 'error', last_error = 'worker stopped responding', updated_at = now()
     where status = 'running' and heartbeat_at < now() - interval '5 minutes' and attempts >= max_attempts
    returning kind, ref_id
  loop
    if r.kind = 'run' then
      update public.tests set status = 'error', error = 'The test stopped unexpectedly. Please try again.', updated_at = now() where id = r.ref_id;
    else
      update public.crawls set status = 'error', error = 'The analysis stopped unexpectedly. Please try again.', updated_at = now() where id = r.ref_id;
    end if;
  end loop;

  return query
  update public.jobs j
     set status = 'running', attempts = j.attempts + 1, locked_by = p_worker,
         locked_at = now(), heartbeat_at = now(), updated_at = now()
   where j.id = (
     select id from public.jobs
      where status = 'queued'
         or (status = 'running' and heartbeat_at < now() - interval '5 minutes' and attempts < max_attempts)
      order by id
      for update skip locked
      limit 1)
  returning j.*;
end $$;

-- "I'm still working on it" (sent every 30 seconds during a job).
create function public.heartbeat_job(p_id bigint) returns void
language sql security definer set search_path = '' as $$
  update public.jobs set heartbeat_at = now() where id = p_id and status = 'running'
$$;

-- Who may call which function.
revoke all on function public.start_analyze(text) from public, anon;
revoke all on function public.start_test(text, jsonb, text) from public, anon;
grant execute on function public.start_analyze(text) to authenticated;
grant execute on function public.start_test(text, jsonb, text) to authenticated;
revoke all on function public.claim_job(text) from public, anon, authenticated;
revoke all on function public.heartbeat_job(bigint) from public, anon, authenticated;
grant execute on function public.claim_job(text) to service_role;
grant execute on function public.heartbeat_job(bigint) to service_role;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.short_id() from public, anon, authenticated;

-- ---------- Storage: private screenshots, readable only by their owner ----------
-- Paths look like {user_id}/{crawls|tests}/{id}/{file}.jpg
insert into storage.buckets (id, name, public) values ('screenshots', 'screenshots', false)
on conflict (id) do nothing;
create policy "Users can read their own screenshots" on storage.objects
  for select to authenticated
  using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = (select auth.uid())::text);
