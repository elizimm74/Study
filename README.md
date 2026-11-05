# Crawler

Test your landing page on simulated AI customers before you launch.
Paste a URL → pick an audience → 100 personas review your landing page, pricing and signup → get a report with ranked fixes.

## Run it on your computer

You need **Node.js 20+** (download from nodejs.org) and **git**.

```bash
git clone https://github.com/elizimm74/Study.git
cd Study
npm install
npx playwright install chromium   # one-time: downloads the invisible browser (~150 MB)
```

Create a file called `.env.local` in the project folder. Copy everything from `.env.example`, then fill in your Anthropic key and **your email** in `ADMIN_EMAILS`, so you never hit the free-test limit while testing.

`.env.local` is listed in `.gitignore`, so it is never uploaded to GitHub.

Without the two `NEXT_PUBLIC_SUPABASE_...` lines, accounts are switched off and the app works without sign-in.

Start the site:

```bash
npm run dev
```

Open http://localhost:3000 for the landing page. **Start free** creates an account, then the testing tool is at http://localhost:3000/app. To test without a real product, use one of the fake demo sites:
- `http://localhost:3000/demo/index.html`: a meal-planning app with normal links
- `http://localhost:3000/demo/tricky.html`: a cookie banner, a "Plans" button, and a waitlist pop-up
- `http://localhost:3000/demo/loginwall.html`: "Get started" leads to a log-in page first
- `http://localhost:3000/demo/app.html`: a fake app for **Try the product**. Task: "Search for a birthday template and open it". It also has traps: a Buy button, an outside link, and an email box.
- `http://localhost:3000/demo/app-login.html`: test-account mode. Email `tester@example.com`, password `S3cret-Pass!` (fake, for testing only)

## Accounts (Supabase)

- **Sign up / sign in:** email + password, or "Continue with Google". The pages are `/signup` and `/signin`.
- **My tests:** `/tests` lists every test you've run. Tests are saved in the Supabase project **"crawler"** (table `tests`).
- **Privacy:** Row Level Security in the database means each person can only see their own tests.
- **Free plan:** 1 test per account (`FREE_TESTS_PER_ACCOUNT`). Emails in `ADMIN_EMAILS` have no limit.
- **Email confirmation:** new accounts get a "confirm your email" link. Supabase's built-in email sender only allows a few emails per hour. For quick testing, you can turn off **Confirm email** in Supabase: Authentication → Sign In / Providers → Email.
- **Google sign-in** needs a one-time setup: create an OAuth client in Google Cloud Console, then paste its ID and secret into Supabase under Authentication → Sign In / Providers → Google. Until then, the button shows a friendly "not set up yet" message.

## Accuracy benches

```bash
npm run bench
```

This runs the crawler and the explorer on practice sites in `public/demo/sites/`, where the right answers are known, and prints a score. Each site copies a real-world trap:
- single-page apps
- pricing that's only in the footer
- no pricing link at all
- buttons inside web components
- bot-check pages
- a misleading "Pricing" blog link
- slow-loading content
- hover menus
- canvas editors, pop-ups, and safety traps

Without an API key it tests the backup logic and all the safety rules. With your key in `.env.local`, it also tests the AI choosing what to click. **Run it after every crawler change.** If the score drops, the change broke something.

## Real-site accuracy check

```bash
npm run realcheck
```

This crawls 22 popular real websites (Notion, Canva, Figma, Duolingo...) and prints a **measured accuracy %** for finding a verified pricing page and signup page. It needs the open internet, so run it on your own computer. Personas don't run, so it costs almost nothing. The details are saved to `data/realcheck-<date>.json`. Send that file to Claude to fix the failures.

## Try the product (Milestone 3)
Tick **"Have an AI explorer actually use the product"** on the home page. The explorer:
- clicks around like a first-time user, and you can watch it live
- runs on Haiku, and hands off to Sonnet only when it gets stuck. That costs about 2-5¢.
- **never** clicks buy/pay/delete/send, never types card numbers, stays on the product's site, and stops at captchas
- in test-account mode, types the password itself, so the AI only ever sees `{{PASSWORD}}`. The account is never saved.

The **cost of each run** is printed in the terminal where `npm run dev` is running.

## How the code is organized

| File | What it does |
|---|---|
| `src/app/page.tsx` | Home page: URL box, captured pages, audience picker |
| `src/app/run/[id]/page.tsx` | Progress bar, then the report |
| `src/components/AudiencePicker.tsx` | The audience form + presets |
| `src/components/ProfileEditor.tsx` | "What we understood" card the founder can edit |
| `src/components/Report.tsx` | Score, fixes, copy, funnel, objections, heatmap, quotes |
| `src/app/api/*` | Server endpoints the pages call |
| `src/lib/crawl.ts` | Step 1: invisible browser closes cookie pop-ups, scrolls, lets Haiku pick what to click, then clicks through landing → pricing → signup/waitlist (links, buttons or pop-ups) |
| `src/lib/suggest.ts` | One Haiku call: product profile + suggested audience |
| `src/lib/personas.ts` | Step 2: generate varied personas in code (free) |
| `src/app/page.tsx` | Landing page (hero, how it works, example, pricing, FAQ) |
| `src/app/app/page.tsx` | The testing tool (was the home page) |
| `src/app/signin`, `signup`, `auth/*`, `tests` | Sign in / sign up, email and Google return path, sign out, My tests |
| `src/middleware.ts` | Keeps people signed in, and sends signed-out visitors to /signin |
| `src/lib/supabase/*` | Connections to Supabase (browser, server, as-a-user) + settings |
| `src/lib/db.ts` | Saves each test to the user's account |
| `src/lib/pageHelpers.ts` | Helpers injected into every page so we can see inside web components |
| `scripts/*-bench.cjs` | Accuracy benches (`npm run bench`) |
| `src/lib/explore.ts` | Milestone 3: the explorer agent that actually uses the product, plus all its safety rules |
| `src/lib/reputation.ts` | Optional: searches the web for real reviews (Sonnet + web search, then Haiku tidies the result) |
| `src/components/ExplorePanel.tsx` | "Try the product" settings card |
| `src/components/JourneyView.tsx` | Live view and report timeline of what the explorer did |
| `src/lib/behavior.ts` | Research rules (teens, budgets, signups) + simulated visit: device, where they came from, patience. Sources: `docs/persona-research.md` |
| `src/lib/evaluate.ts` | Steps 3-4: personas review the site, 25 per Haiku call |
| `src/lib/aggregate.ts` | Step 5: counts, segments, funnel, objections (free) |
| `src/lib/report.ts` | Step 6: Sonnet writes fixes + new copy from the summary only |
| `src/lib/pipeline.ts` | Runs steps 2-6 in order and tracks progress |
| `src/lib/cost.ts` | Turns token usage into dollars and prints it |

Crawls, runs and screenshots are saved as files in `data/` (not uploaded to GitHub).
