-- 0004: "Ask about this test": a small chat under every report.
-- Each test gets 2 FREE questions (admins: unlimited). The limit is checked
-- HERE in the database, so the browser can't skip it.
--
-- Write paths (users can't insert rows directly):
--   ask_test()      saves the user's question (checks owner, length, limit)
--   answer_test()   saves the AI's answer (only right after an unanswered question)
--   retract_test()  removes the question if the AI call failed (so it doesn't count)

create table public.test_messages (
  id bigint generated always as identity primary key,
  test_id text not null references public.tests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 4000),
  needs_rerun boolean not null default false, -- the AI thinks a fact was wrong: offer a fresh test
  cost_usd numeric,
  created_at timestamptz not null default now()
);
create index test_messages_test_idx on public.test_messages (test_id, id);

alter table public.test_messages enable row level security;
create policy "Users can read their own messages" on public.test_messages
  for select to authenticated using ((select auth.uid()) = user_id);
-- No insert / update / delete policies: only the functions below write.

-- How many free questions each test gets.
create function public.free_test_messages() returns integer
language sql immutable set search_path = '' as $$ select 2 $$;

-- Saves a question. Returns how many free questions are left (null = unlimited).
create function public.ask_test(p_test_id text, p_content text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_admin boolean;
  v_used integer;
  v_last text;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  if p_content is null or char_length(btrim(p_content)) < 1 or char_length(p_content) > 600 then
    raise exception 'Please write a question between 1 and 600 characters.';
  end if;
  if not exists (select 1 from public.tests where id = p_test_id and user_id = v_user and status = 'done') then
    raise exception 'That test was not found, or it is not finished yet.';
  end if;

  -- One question at a time: wait for the answer to the last one.
  select role into v_last from public.test_messages
   where test_id = p_test_id and user_id = v_user order by id desc limit 1;
  if v_last = 'user' then raise exception 'Please wait for the answer to your last question.'; end if;

  select coalesce(is_admin, false) into v_admin from public.profiles where id = v_user;
  select count(*) into v_used from public.test_messages
   where test_id = p_test_id and user_id = v_user and role = 'user';
  if not coalesce(v_admin, false) and v_used >= public.free_test_messages() then
    raise exception 'CHAT_LIMIT';
  end if;

  insert into public.test_messages (test_id, user_id, role, content)
  values (p_test_id, v_user, 'user', btrim(p_content));
  return case when coalesce(v_admin, false) then null else public.free_test_messages() - v_used - 1 end;
end $$;

-- Saves the answer to the question that was just asked.
create function public.answer_test(p_test_id text, p_content text, p_needs_rerun boolean, p_cost numeric)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_last text;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  select role into v_last from public.test_messages
   where test_id = p_test_id and user_id = v_user order by id desc limit 1;
  if v_last is distinct from 'user' then raise exception 'There is no question waiting for an answer.'; end if;
  insert into public.test_messages (test_id, user_id, role, content, needs_rerun, cost_usd)
  values (p_test_id, v_user, 'assistant', left(p_content, 4000), coalesce(p_needs_rerun, false), p_cost);
end $$;

-- If answering failed on our side, take the question back: it doesn't use up a free one.
create function public.retract_test(p_test_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_id bigint;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  select id into v_id from public.test_messages
   where test_id = p_test_id and user_id = v_user order by id desc limit 1;
  if v_id is not null and (select role from public.test_messages where id = v_id) = 'user' then
    delete from public.test_messages where id = v_id;
  end if;
end $$;

revoke all on function public.free_test_messages() from public, anon;
revoke all on function public.ask_test(text, text) from public, anon;
revoke all on function public.answer_test(text, text, boolean, numeric) from public, anon;
revoke all on function public.retract_test(text) from public, anon;
grant execute on function public.free_test_messages() to authenticated;
grant execute on function public.ask_test(text, text) to authenticated;
grant execute on function public.answer_test(text, text, boolean, numeric) to authenticated;
grant execute on function public.retract_test(text) to authenticated;
