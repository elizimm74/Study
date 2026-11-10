# Crawler

Test your landing page on 100 AI customers before you launch. Paste a URL, pick an audience, and AI customers review your landing page, pricing and signup (and can even try your product). You get a score, why people left, and ranked fixes.

**How it's built:** see [`docs/architecture.md`](docs/architecture.md). In short, two programs share one Supabase database:

| Program | Does | Runs on |
|---|---|---|
| **Web** (Next.js) | pages, sign-in, quick API calls | Vercel |
| **Worker** (Node) | the slow work: crawling, the explorer, the AI | Railway / Fly.io / Render (Docker) |

## Run it on your computer

You need **Node.js 20.6+** and **git**.

```bash
git clone https://github.com/elizimm74/Study.git launch-test
```

```bash
cd launch-test
```

```bash
npm install
```

```bash
npx playwright install chromium
```

**Settings:**
1. Copy `.env.example` to a new file called `.env.local` and fill in the blanks.
2. `SUPABASE_SECRET_KEY` is in the Supabase dashboard → Project Settings → API Keys → **Secret keys**.
3. Make `CREDENTIALS_KEY` with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

**Start both programs, in two Terminal windows:**

```bash
npm run dev
```

```bash
npm run worker:dev
```

Open http://localhost:3000, click **Start free**, and create an account. The test tool is at `/app`. The worker's Terminal shows each job and what it cost.

**Make yourself an admin (no test limit):** in Supabase → SQL Editor, run:

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'YOUR@EMAIL.com');
```

### Demo sites to test with
- `http://localhost:3000/demo/index.html`: a meal-planning app with normal links
- `http://localhost:3000/demo/tricky.html`: a cookie banner, a "Plans" button, and a waitlist pop-up
- `http://localhost:3000/demo/loginwall.html`: "Get started" leads to a log-in page first
- `http://localhost:3000/demo/app.html`: a fake app for **Try the product**. Task: "Search for a birthday template and open it". It also has traps: a Buy button, an outside link, and an email box.
- `http://localhost:3000/demo/app-login.html`: test-account mode. Email `tester@example.com`, password `S3cret-Pass!` (fake, for testing only)

## Deploy (going live)

The full checklist (Vercel for the website, Fly.io for the worker, which environment variables go where, and what to check before sharing the link) is in **[`docs/deploy.md`](docs/deploy.md)**.

Short version: **Web → Vercel** (never put the Supabase secret key there). **Worker → Fly.io / Railway / Render** from `Dockerfile.worker` (`fly.toml` is included). More tests waiting? Add more copies of the worker; the queue shares the work.

## Accounts and plans

- **Sign up / sign in:** email + password, or Google (`/signup`, `/signin`). **My tests** is at `/tests`.
- **Privacy:** Row Level Security means each person can only read their own crawls, tests and screenshots. Only the worker (with the secret key) writes, so nobody can fake a score or reset their free test.
- **Plans:** `profiles.plan` (free = 1 test). The limit is checked inside the database, in a single locked step, so two clicks at once can't both get a free test. Failed tests don't use up the plan.
- **Email confirmation:** Supabase's built-in email sender only allows a few emails per hour. For testing, you can turn off **Confirm email** in Authentication → Sign In / Providers → Email.
- **Google and Apple sign-in:** the buttons are built; each provider must be switched on once (steps below).

### Switching on "Continue with Google" and "Continue with Apple"

Both send people to Google/Apple and back to Supabase at this address (you'll paste it in a few places):
`https://txoimqedwfsuxoqiguop.supabase.co/auth/v1/callback`

**First, in Supabase** → Authentication → URL Configuration: add `http://localhost:3000/auth/callback` to **Redirect URLs** (and later `https://YOUR-DOMAIN/auth/callback`).

**Google** (free):
1. Google Cloud Console → create a project → APIs & Services → **OAuth consent screen**: External, app name "crawler", your email.
2. Credentials → **Create credentials → OAuth client ID** → type **Web application**.
3. Authorized redirect URI: the Supabase address above.
4. Copy the **Client ID** and **Client secret** into Supabase → Authentication → Sign In / Providers → **Google** → enable → Save. Paste them only there, never in chat or in the code.

**Apple** (needs a paid Apple Developer account, $99/year):
1. developer.apple.com → Certificates, IDs & Profiles → **Identifiers**: create an **App ID** with "Sign in with Apple" ticked.
2. Identifiers → create a **Services ID** (e.g. `app.crawler.web`), tick "Sign in with Apple" → Configure: domain `txoimqedwfsuxoqiguop.supabase.co`, return URL = the Supabase address above.
3. **Keys** → create a key with "Sign in with Apple" → download the `.p8` file (you can only download it once; keep it safe, never commit it).
4. Supabase → Sign In / Providers → **Apple** → enable. Client IDs = your Services ID. Secret key: use the generator on Supabase's "Sign in with Apple" docs page with your Team ID, Key ID, Services ID and the `.p8` file → paste the result → Save.
5. ⚠️ Apple's secret **expires every 6 months**. Set a calendar reminder to make a new one with the same `.p8` file, or Apple sign-in will stop working.


## Quality checks

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm run bench
```

GitHub runs all of these automatically on every push (`.github/workflows/ci.yml`).

- **`npm run bench`** scores the crawler on 16 practice sites with known answers, and the explorer's actions and safety rules on 4 scripted tests, plus 27 checks on app testing (store rules, answer cleanup, counting, the A/B test). **If the score drops, the change broke something.**
- **`npm run realcheck`** (on your computer) crawls 22 real websites and prints a measured accuracy %.

## How the code is organized

| Path | What it does |
|---|---|
| `src/app/page.tsx` | Landing page (the white sheet slides over the blue screen) |
| `src/app/example/page.tsx`, `src/lib/example.ts` | Example reports (made-up data, run through the real counting code) |
| `src/app/s/[token]`, `src/app/api/og/[token]`, `src/lib/scorecard.tsx` | Public share cards: scorecard page + the 1200x630 image |
| `src/app/accuracy/page.tsx`, `src/components/ActualBox.tsx` | Public "predicted vs real" track record |
| `src/app/tools/paywall-checker` | Free no-sign-up store-rule checker (runs in the browser) |
| `src/lib/app/*`, `src/components/app/*` | App tests: onboarding + paywall screenshots |
| `src/lib/chat.ts`, `src/components/AskBox.tsx` | "Ask about this test" (2 free questions) |
| `src/app/app/page.tsx` | The test tool: URL → analysis → audience → start |
| `src/app/run/[id]/page.tsx` | Live progress, explorer view, then the report |
| `src/app/tests/page.tsx` | My tests |
| `src/app/signin`, `signup`, `auth/*` | Accounts |
| `src/app/api/crawls`, `api/tests`, `api/files` | The thin web API (see `docs/architecture.md`) |
| `src/middleware.ts` | Keeps people signed in; protects private pages and APIs |
| `src/components/*` | UI pieces (Report, AudiencePicker, ExplorePanel, JourneyView…) |
| `src/worker/main.ts` | The worker loop: claim → run → save, with heartbeats |
| `src/worker/jobs.ts` | The "analyze" and "run" jobs |
| `src/lib/crawl.ts` | Visits landing → pricing → signup like a real person |
| `src/lib/explore.ts` | The explorer that actually uses the product (with safety rules) |
| `src/lib/personas.ts`, `behavior.ts` | Varied, research-backed customers (`docs/persona-research.md`) |
| `src/lib/evaluate.ts` | Customers review the site, 25 per Haiku call |
| `src/lib/aggregate.ts` | The numbers, counted by code |
| `src/lib/report.ts` | Sonnet writes the fixes, from the summary only |
| `src/lib/pipeline.ts` | Runs one whole test, reporting progress as it goes |
| `src/lib/blobs.ts` | Where screenshots live (local folder or Supabase Storage) |
| `src/lib/crypto.ts` | Encrypts test-account logins while they wait in the queue |
| `src/lib/supabase/*` | Supabase connections (browser, server, worker-only admin) |
| `supabase/migrations/*` | The database schema |
