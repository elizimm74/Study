-- Milestone 4 (already applied): one row per test, readable only by its owner.
create table public.tests (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  url text not null,
  goal text,
  status text not null default 'running',
  score integer,
  total integer,
  cost_usd numeric(10, 4),
  data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tests_user_created_idx on public.tests (user_id, created_at desc);
alter table public.tests enable row level security;
create policy "Users can see their own tests" on public.tests for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own tests" on public.tests for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own tests" on public.tests for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
