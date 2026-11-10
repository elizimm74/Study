# Putting Crawler online (launch checklist)

Crawler is two programs that share one database (Supabase):

| Part | What it does | Where it runs |
|------|--------------|---------------|
| **Web** (Next.js) | pages, sign-in, the API, the "Ask about this test" chat | Vercel |
| **Worker** (`src/worker`) | opens sites in a real browser, runs the AI customers | Fly.io / Railway / Render (a container) |

The database, logins and screenshot storage are already live on Supabase (project `crawler`).

## 1. Web on Vercel (about 10 minutes)
1. vercel.com → **Add New → Project** → import the GitHub repo `elizimm74/Study`.
2. Framework: Next.js (auto-detected). Leave the build settings alone.
3. **Environment variables** (Settings → Environment Variables). Use the names in `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public)
   - `NEXT_PUBLIC_SITE_URL` = your real address, e.g. `https://crawler.app`
   - `ANTHROPIC_API_KEY` (the chat needs it) and `CREDENTIALS_KEY` (same value as the worker)
   - **Never** add `SUPABASE_SECRET_KEY` here. It is for the worker only.
4. Deploy. Then **Settings → Domains** to add your own domain.
5. Supabase dashboard → **Authentication → URL Configuration**: set *Site URL* to your address and add `https://YOUR-ADDRESS/auth/callback` to *Redirect URLs* (Google and Apple sign-in need it).
6. Apple/Google sign-in: add the same address to the provider's allowed redirect list.

## 2. Worker on Fly.io (about 15 minutes)
1. Install the Fly CLI and run `fly auth login`.
2. In the project folder: `fly launch --no-deploy --copy-config` (uses `fly.toml` and `Dockerfile.worker`).
3. Set the secrets (they are encrypted on Fly, never in git):
   ```
   fly secrets set SUPABASE_SECRET_KEY=... ANTHROPIC_API_KEY=... CREDENTIALS_KEY=... \
     NEXT_PUBLIC_SUPABASE_URL=https://txoimqedwfsuxoqiguop.supabase.co \
     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   ```
4. `fly deploy`. Watch it with `fly logs`. You should see `worker started`.
5. More customers waiting in the queue? `fly scale count 2` adds a second worker. The queue gives each worker different jobs, no code change.

## 3. Before sharing the link
- [ ] Run one website test and one app test on the live site.
- [ ] Open a shared scorecard link in a private window (it should load without signing in).
- [ ] Supabase → Authentication → turn on **Leaked password protection**.
- [ ] Revoke the old Apple key `GQQQ8DZAFN` and make a new one (it was pasted in chat once).
- [ ] Set a spending limit in the Anthropic console so a bug can't run up a bill.
- [ ] `/api/health` should return `{"ok":true}` (point an uptime monitor at it).

## Scaling notes (when it gets busy)
- **Cost per test** is about 3 cents (website) and roughly 10–15 cents (app, 300 customers), measured in the bill logs (`logRunCost`). Packs sell at $3.80 / $2.45 per test.
- **Queue**: one worker handles `WORKER_CONCURRENCY` jobs at once. Each browser job uses ~0.5–1 GB RAM, so add workers (not concurrency) first.
- **Fairness**: a user can have at most 4 unfinished jobs (database rule), so one person can't flood the queue.
- **Anthropic limits**: requests per minute rise with how much you spend. If you see 429 errors in worker logs, lower `WORKER_CONCURRENCY` or ask Anthropic for a higher tier.
- **Storage**: screenshots live in the private `screenshots` bucket. The free Supabase plan has 1 GB; upgrade the plan (or delete old crawls) when it fills.
- **Payments**: when Stripe is connected, the webhook calls `grant_tests(user, n)` (service key only) to add tests. The database already supports it.
