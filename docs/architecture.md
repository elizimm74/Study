# Crawler: production architecture

This describes how Crawler runs in production, and why it's built this way.

## 1. The problem this solves

A test takes **1–3 minutes**. It drives a real browser (Playwright) and makes
several AI calls. Serverless hosts like Vercel are great for web pages, but they
can't do this work:

- requests time out after about a minute
- Playwright's browser doesn't fit in a serverless function
- memory and disk are wiped between requests, so in-progress tests and
  screenshots would vanish

So Crawler is split into **two programs that share one database**.

```
            ┌──────────────────────────── Vercel ────────────────────────────┐
 Browser ──▶│  WEB (Next.js)                                                  │
            │  pages · sign-in · thin API: validate → enqueue → read status   │
            └───────────────┬───────────────────────────────▲─────────────────┘
                            │ RPC start_analyze/start_test  │ SELECT (RLS: own rows)
                            ▼                               │
            ┌──────────────────────── Supabase ─────────────┴─────────────────┐
            │  Auth · Postgres (crawls, tests, jobs, profiles) · Storage      │
            └───────────────▲───────────────────────────────┬─────────────────┘
                            │ claim_job() · update rows      │ upload screenshots
            ┌───────────────┴──── Railway / Fly / Render ───▼─────────────────┐
            │  WORKER (Node, long-running, Docker)  × N copies                 │
            │  crawler (Playwright) · explorer · personas (Haiku) · report     │
            │  (Sonnet) · reputation search                                    │
            └──────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼  Anthropic API
```

**Why a job queue in Postgres (and not Redis, SQS...)?** One less service to
pay for and operate. Postgres's `FOR UPDATE SKIP LOCKED` lets many workers each
grab a different job safely. That's plenty for thousands of tests a day. If we
ever outgrow it, only `claim_job` and the worker loop change.

## 2. How a test flows

1. **Analyze:** the browser sends `POST /api/crawls { url }`.
   - The web app calls the database function `start_analyze()`. It checks you're
     signed in and under the rate limit, creates a `crawls` row (status `queued`)
     plus a `jobs` row, and returns the crawl id.
   - A worker claims the job, crawls the site, uploads screenshots to Storage,
     asks Haiku to understand the site, then saves the result and marks it `done`.
   - The browser checks `GET /api/crawls/:id` every ~1.5 seconds until it's done.
2. **Run:** the browser sends `POST /api/tests { crawlId, audience, profile, explore, credentials? }`.
   - The web app validates the input and **encrypts** any test-account password
     (AES-256-GCM).
   - It calls `start_test()`, which, inside a single database transaction:
     checks the crawl is yours, **locks your profile row and checks your plan's
     limit** (so two clicks at once can't both use the free test), then inserts
     the `tests` row and its job.
   - A worker claims it and runs the explorer + reputation search (in parallel),
     then the personas, the math and the report. It saves progress to
     `tests.progress` as it goes, so the live view works. The encrypted password
     is erased from the job as soon as the worker has read it.
   - The browser checks `GET /api/tests/:id`, and shows the live explorer, then
     the report.

## 3. Database (Supabase Postgres)

| Table | What's in it | Who can read / write |
|---|---|---|
| `profiles` | one row per user: `plan` (free…), `is_admin` | user reads own; only the database / worker writes |
| `crawls` | analyze results: url, status, crawl pages, profile, suggested audience | user reads own; created via `start_analyze()`; worker updates |
| `tests` | test runs: status, stage, live progress, score, cost, full report | user reads own; created via `start_test()`; worker updates |
| `jobs` | the work queue: kind (`analyze`/`run`), status, attempts, lock, encrypted secret | **nobody but the worker** (RLS on, no policies) |

**Storage:** a private `screenshots` bucket, with paths like
`{user_id}/{crawls|tests}/{id}/{file}.jpg`. A user can read only the folder named
with their own id. The worker uploads them.

**Database functions (RPC):**
- `start_analyze(url)`: signed-in users; at most 30 per hour.
- `start_test(crawl_id, settings, secret)`: signed-in users. Checks the plan
  limit atomically.
- `claim_job(worker)`: worker only. It reclaims jobs whose worker died (no
  heartbeat for 5 minutes) up to `max_attempts`.
- `heartbeat_job(id)`: worker only, sent every 30 seconds during a job.

**Why are writes done by functions and the worker, not by users directly?** A
user's browser could otherwise mark their own test "failed" to get the free test
back, or fake a score. Users can only *read*. Every write goes through checked
code.

## 4. API endpoints (web)

| Method | Path | Does |
|---|---|---|
| `POST` | `/api/crawls` | start analyzing a URL → `{ crawlId }` |
| `GET` | `/api/crawls/:id` | status, plus the captured pages, profile and audience when done |
| `POST` | `/api/tests` | start a test (quota-checked) → `{ testId }` |
| `GET` | `/api/tests/:id` | live status, stage and explorer journey; the full report when done |
| `GET` | `/api/files/:userId/:kind/:id/:file` | a screenshot (only your own; redirects to a short-lived signed URL) |
| `GET` | `/auth/callback` | finish email or Google sign-in |
| `POST` | `/auth/signout` | sign out |

The web app never runs Playwright or calls the AI. Its API routes are fast and
cheap, and they scale automatically on Vercel.

## 5. UI architecture

| Route | Type | Purpose |
|---|---|---|
| `/` | server page | landing page |
| `/signin`, `/signup` | client form | Supabase Auth (email + Google) |
| `/app` | client page | URL → (poll crawl) → captured pages, profile, audience, explorer settings → start test |
| `/run/:id` | client page | polls the test: live explorer view → progress → report |
| `/tests` | server page | My tests (read straight from Postgres with RLS) |

- Components live in `src/components`. The design system is in `globals.css`:
  cream / ink / cobalt / sky colors, Archivo + Inter fonts, and the `.display`,
  `.meta` and `.sky` styles.
- `src/middleware.ts` refreshes the session and keeps signed-out visitors out of
  private pages and APIs.

## 6. File structure

```
src/
  app/                    WEB: pages + API routes (Next.js App Router)
    api/crawls/…          start / read analyses
    api/tests/…           start / read tests
    api/files/[...path]   screenshots (signed URL redirect)
    auth/…                sign-in callback, sign out
    app/  run/[id]/  tests/  signin/  signup/  page.tsx (landing)
  components/             UI pieces (Report, AudiencePicker, JourneyView…)
  lib/                    SHARED engine code (used by the worker, and by the web for types)
    crawl.ts explore.ts evaluate.ts aggregate.ts report.ts suggest.ts
    reputation.ts behavior.ts personas.ts pipeline.ts cost.ts ai.ts
    blobs.ts              where screenshots live (local folder or Supabase Storage)
    crypto.ts             encrypt / decrypt test-account passwords
    env.ts                checks the required settings at startup
    supabase/             browser / server / admin (worker-only) clients
  worker/                 WORKER: the long-running job runner
    main.ts               loop: claim → run → save; N jobs at once; clean shutdown
    jobs.ts               the "analyze" and "run" job handlers
  middleware.ts
supabase/migrations/      the database schema, as SQL files (source of truth)
scripts/                  benches + real-site check
Dockerfile.worker         worker image (Playwright's official base image)
.github/workflows/ci.yml  type check + lint + benches on every push
```

## 7. Scaling plan

| Load | What to do |
|---|---|
| ~100 tests/day | 1 worker, `WORKER_CONCURRENCY=2` |
| ~1,000/day | 2–3 workers (just start more copies; the queue shares the work) |
| ~10,000/day | 5–10 workers. Add a `priority` column for paid plans. Use the Anthropic Batch API for 1,000+ persona runs (50% cheaper) |
| beyond | move the queue to a dedicated system; shard workers by job kind |

The main cost is the AI. Each test records `cost_usd`, so cost per plan is
always visible.

## 8. Settings (environment variables)

| Name | Web | Worker | Secret? |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | ✅ | no (public by design) |
| `SUPABASE_SECRET_KEY` | ❌ never | ✅ | **yes** |
| `ANTHROPIC_API_KEY` | ❌ | ✅ | **yes** |
| `CREDENTIALS_KEY` (32 random bytes, base64) | ✅ | ✅ | **yes** |
| `WORKER_CONCURRENCY` | | ✅ | no |

## 9. What's deliberately NOT here yet
- Stripe payments (the `plan` column is ready for them)
- email notifications when a test finishes
- error tracking (e.g. Sentry)
- the 1,000+ persona tiers

Each one plugs into this design without changing it.
