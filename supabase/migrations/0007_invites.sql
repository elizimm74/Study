-- 0007: invite friends to unlock the full free test.
--   Everyone gets a free STARTER test (25 simulated customers) straight away.
--   When 3 friends sign up through your invite link AND verify their email, you unlock one
--   more test and every test is the full 100 customers. (3 = referrals_needed(); change it in one place.)
--   Paid packs / admins always run the full size.
--
-- How a friend is credited: /r/<code> sets a cookie; the next time that person is signed in,
-- the middleware calls claim_referral(code). It only works for brand-new accounts (3 days),
-- never for yourself, and only once per friend.
-- Abuse note: a person could make extra accounts, so a referral only counts once the friend's
-- email is verified. Revisit if it gets abused (e.g. also require the friend to run a test).

alter table public.profiles add column referral_code text unique;
update public.profiles set referral_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 8) where referral_code is null;
alter table public.profiles alter column referral_code set not null;
alter table public.profiles alter column referral_code set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

create table public.referrals (
  referred_id uuid primary key references auth.users (id) on delete cascade,
  referrer_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (referrer_id <> referred_id)
);
create index referrals_referrer_idx on public.referrals (referrer_id);
alter table public.referrals enable row level security;
create policy "Referrers can read their own referrals" on public.referrals
  for select to authenticated using ((select auth.uid()) = referrer_id);

create function public.referrals_needed() returns integer language sql immutable set search_path = '' as $$ select 3 $$;
create function public.starter_customers() returns integer language sql immutable set search_path = '' as $$ select 25 $$;
create function public.full_customers() returns integer language sql immutable set search_path = '' as $$ select 100 $$;

-- Friends credited to this person whose email is verified.
create function public.verified_referrals(p_user uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.referrals r join auth.users u on u.id = r.referred_id
   where r.referrer_id = p_user and u.email_confirmed_at is not null
$$;

-- How many simulated customers a test gets for this person.
create function public.test_size_for(p_user uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select case when coalesce(p.is_admin, false) or p.plan <> 'free' or p.bonus_tests > 0
                or public.verified_referrals(p_user) >= public.referrals_needed()
              then public.full_customers() else public.starter_customers() end
    from public.profiles p where p.id = p_user
$$;

-- Called by the middleware when a signed-in person arrives with an invite cookie.
create function public.claim_referral(p_code text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_referrer uuid;
begin
  if v_user is null then return false; end if;
  select id into v_referrer from public.profiles where referral_code = lower(btrim(p_code));
  if v_referrer is null or v_referrer = v_user then return false; end if;
  if not exists (select 1 from public.profiles where id = v_user and created_at > now() - interval '3 days') then return false; end if;
  insert into public.referrals (referred_id, referrer_id) values (v_user, v_referrer) on conflict (referred_id) do nothing;
  return found;
end $$;

-- Everything the dashboard and the wizards need to know about this person's plan.
create function public.my_plan() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles;
  v_refs integer;
  v_used integer;
  v_limit integer;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  select * into v_profile from public.profiles where id = v_user;
  v_refs := public.verified_referrals(v_user);
  select count(*) into v_used from public.tests
   where user_id = v_user and status <> 'error'
     and (v_profile.plan in ('free', 'launch') or created_at >= date_trunc('month', now()));
  v_limit := public.plan_test_limit(v_profile.plan) + v_profile.bonus_tests
             + case when v_refs >= public.referrals_needed() then 1 else 0 end;
  return jsonb_build_object(
    'plan', v_profile.plan,
    'unlimited', coalesce(v_profile.is_admin, false),
    'customers', public.test_size_for(v_user),
    'used', v_used,
    'limit', v_limit,
    'left', greatest(0, v_limit - v_used),
    'referrals', jsonb_build_object('count', v_refs, 'needed', public.referrals_needed(), 'code', v_profile.referral_code));
end $$;

-- start_test: the full-size unlock adds one test, and the SERVER decides the size (never the browser).
create or replace function public.start_test(p_crawl_id text, p_settings jsonb, p_secret text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_crawl public.crawls;
  v_profile public.profiles;
  v_used integer;
  v_id text;
  v_count integer;
  v_allowed integer;
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
    -- (worked out on its own line: plpgsql can't read a CASE...THEN inside an IF...THEN condition)
    v_allowed := public.plan_test_limit(v_profile.plan) + v_profile.bonus_tests
                 + case when public.verified_referrals(v_user) >= public.referrals_needed() then 1 else 0 end;
    if v_used >= v_allowed then
      raise exception 'LIMIT_REACHED';
    end if;
  end if;

  v_count := public.test_size_for(v_user);
  v_id := public.short_id();
  insert into public.tests (id, user_id, crawl_id, url, goal, status, total, data)
  values (v_id, v_user, p_crawl_id, v_crawl.url, p_settings #>> '{profile,goal}', 'queued', v_count,
          jsonb_build_object('settings', p_settings || jsonb_build_object('count', v_count)));
  insert into public.jobs (kind, ref_id, user_id, secret, max_attempts) values ('run', v_id, v_user, p_secret, 2);
  return v_id;
end $$;

revoke all on function public.referrals_needed() from public, anon;
revoke all on function public.starter_customers() from public, anon;
revoke all on function public.full_customers() from public, anon;
revoke all on function public.verified_referrals(uuid) from public, anon, authenticated;
revoke all on function public.test_size_for(uuid) from public, anon, authenticated;
revoke all on function public.claim_referral(text) from public, anon;
revoke all on function public.my_plan() from public, anon;
grant execute on function public.referrals_needed() to authenticated;
grant execute on function public.starter_customers() to authenticated;
grant execute on function public.full_customers() to authenticated;
grant execute on function public.claim_referral(text) to authenticated;
grant execute on function public.my_plan() to authenticated;
