# CLAUDE.md — Project memory

## How to work with me (the founder)
- I'm a high school founder. I've built mobile apps but never a website, and I only know basic coding.
- Act as my **technical cofounder**: explain what you're doing in plain English as you go.
- **Ask before installing anything** (npm packages, browsers, CLIs, etc.) — say what it is and why.
- Make sure I understand the code well enough to explain it myself: keep code simple, comment the "why", and walk me through new files.
- Propose a plan and wait for my OK before writing code for a new milestone.
- Keep the Anthropic API key in `.env.local` and **NEVER commit it**.

## Working alongside ChatGPT (Codex)
- STATUS: the founder decided NOT to use Codex for now, so Claude builds everything (design files included), keeping the Canva-based design style. The rules below apply only once Codex is switched on.
- Claude = **product** (engine). ChatGPT/Codex = **design** (how it looks). Full rules: `docs/collaboration.md`. Codex's instructions: `AGENTS.md`.
- Claude edits only: `src/lib/**`, `src/app/api/**`, `scripts/**`, `public/demo/**`, docs. Don't restyle or rewrite ChatGPT's files (`src/components/**`, pages, `layout.tsx`, `globals.css`); put requests in `docs/requests.md`.
- `src/lib/types.ts` is the shared contract: only Claude changes it, and pull requests must say so. Check `docs/requests.md` for design's requests at the start of each session.
- Work on `claude/...` branches. Before finishing: `npx tsc --noEmit`, `npm run lint`, and `npm run bench` (the score must not drop).

=== PRODUCT BRIEF ===

### WHAT IT IS
A website that lets small founders test their product on simulated AI customers
before launch. The user pastes a URL, picks a target audience, and hundreds to
thousands of AI personas "review" the landing page, pricing and signup. Each
persona says buy / maybe / no, gives their main objection, what would change
their mind, and a one-line quote. The user gets a report with ranked fixes.

### TARGET USERS
Indie hackers and small founders launching web products (both consumer and
business products). Marketed mainly on X, so a shareable scorecard image
matters ("380 of 1,000 would buy, biggest blocker: pricing").

### AUDIENCE PICKER
- Auto-suggest: read the page and pre-fill the likely target audience; the
  user tweaks it.
- Consumer fields: age range (with optional weighting), gender split, country +
  urban/suburban/rural, occupation (categories or free text), income bracket,
  mindset (early adopter, price-sensitive, skeptical, busy, impulse buyer),
  tech comfort (low/med/high), what they use now (competitor or workaround).
- Business fields (auto-enabled when the page looks B2B): role, who decides
  (can buy themselves vs needs approval), company size, industry.
- Presets: Gen Z students, Solo SaaS founders, Busy moms, Small business owners.

### PERSONA ENGINE ("hybrid" approach, keep costs low)
1. Crawl once: a headless browser (Playwright) visits the landing page, then
   follows the flow to pricing and signup, capturing text + screenshots.
2. Generate personas IN CODE by sampling attributes from the audience settings,
   so they're realistically varied (not 1,000 copies of one stereotype).
3. Evaluate personas in batches of ~25 per AI call using Claude Haiku 5.5
   (model id: claude-haiku-5-5), returning strict JSON per persona: verdict,
   objection, what would change their mind, quote, and which funnel step
   lost them (hero / pricing / signup).
4. Prompt personas to be realistically skeptical; most real visitors don't buy.
5. Aggregate results IN CODE (counts, segment breakdowns, objection clusters).
6. Use Claude Sonnet 5.5 (model id: claude-sonnet-5-5) only for the final
   report: ranked fixes (by how many personas each would flip) and rewritten
   headline/pricing copy.
Target cost: ~$1 per 1,000-persona run. Never send all raw verdicts to Sonnet.

### THE REPORT
Headline buy score, segment heatmap (buy rate by age/income/occupation/
mindset), funnel drop-off (hero / pricing / signup), top objections grouped
with %, ranked fixes with flip counts + rewritten copy, 10 best quotes (all
browsable), before/after comparison on re-runs, shareable scorecard image.

### PLANNED PRICING (not built yet)
Free: 1 run x 100 personas. Launch Pack $49 one-time: 3 x 1,000.
Pro $79/mo: 15 x 1,000 + 2 x 10,000. Scale $249/mo: 10 x 10,000 + ad testing.
Deep run add-on: $20 per 10,000-persona run.

### STACK
Next.js (TypeScript) + Tailwind, hosted on Vercel, code on GitHub.
Supabase later for database + logins, Stripe later for payments.
Anthropic SDK for AI calls. Keep the API key in .env.local and NEVER commit it.

### OUT OF SCOPE FOR NOW
Payments, logins, 10k runs, ad/creative testing, mobile app testing, team
accounts, analytics integrations.

=== MILESTONE 1 ===
A site running on my computer where I can: paste a URL, use the audience
picker (manual fields + auto-suggest), run 100 personas through the hybrid
engine, and see the report page (score, segments, funnel drop-off, objections,
ranked fixes, quotes). Show me the actual cost of each run in the console.

## Progress log
- Milestone 1: plan (10 steps) approved by founder, including installing next/react/tailwind/typescript, @anthropic-ai/sdk, playwright, zod.
- Founder has no GitHub account or Anthropic API key yet (signing up). Code is only in the temporary cloud container until it's pushed to GitHub.
- Repo: github.com/elizimm74/Study (public). Product name: **Crawler** (set in `src/lib/config.ts`).
- Milestone 1 prototype BUILT (all 10 steps). See README.md for the file map and how to run.
  - Tested in the cloud: crawler (on /demo/ fake site), persona generator, aggregation, report UI. Pages type-check and lint clean.
  - NOT yet tested: the real AI calls (Haiku evaluate, Sonnet report, auto-suggest) — needs founder's API key. First real run = the next step.
  - Cloud sandbox blocks most outside websites, so real-site crawling must be tested on the founder's computer.
  - Design choices: flip counts computed in code from objection categories (not AI guesses); prompt caching on page content; Sonnet uses server-side fallback ("default"); runs saved as JSON in data/ (gitignored).
- 2026-11-03: Founder ran the app on their Mac (folder `~/launch-test`, since `~/Study` already existed). First real 100-persona run on /demo/ WORKED, cost ~$0.03 → ~$0.30 per 1,000 (well under the $1 target).
- Founder tested rork.com (not their product, just a test site). Feedback: crawler needed to be smarter about navigating and understanding the product.
- Smarter crawler DONE: cookie pop-ups closed, scrolls to load content, 2 screenshots per page, Haiku picks which link/button to click (word matching as backup), handles buttons, new tabs, pop-ups and same-page sections. Code measures facts (form fields, card required, social login, prices). Tested on public/demo/tricky.html.
- Product profile DONE: understand-site call returns profile (what it is, who for, promise, prices, proof, friction) + audience. The founder edits it on the home page; personas and the Sonnet report read it.
- Income brackets replaced by budget: tight / okay / comfortable (founder's idea).
- IDEA for Milestone 3: "Try the product" — one AI agent actually uses the app (e.g. types a prompt into a vibe-coding tool), records screenshots, personas review the recording. Only for products the founder owns, or ones that need no login. Logins are currently out of scope per the brief.
- Research-backed personas DONE (founder asked for personas that think like a real 15-year-old): `src/lib/behavior.ts` has research rules (NN/g, Unbounce, Baymard, Pew, Piper Sandler) applied per persona, and a simulated visit (device, came from, patience). The percentages are labeled ASSUMPTIONS. Sources are in `docs/persona-research.md`. New preset "High school teens" (14-17). The crawler adds a phone screenshot.
- Sign-in fix DONE: the profile has a GOAL (sign up / join the waitlist / buy...); the headline says "X of 100 would <goal>"; personas are told that nobody sees inside an app before signing up, so they judge only the signup's friction. The crawler detects log-in pages and clicks through to create-account.
- MILESTONE 3 BUILT ("Try the product"), approved by the founder ("make it futuristic, fast, efficient"):
  - `explore.ts`: a cheap "computer use"-style agent. Each step is a fresh request with 1 screenshot + a numbered element list + a short log. Haiku drives; Sonnet takes over after 2 stuck steps. Max 18 steps / 150s. Est. 2-5¢.
  - Safety enforced IN CODE: no buy/pay/subscribe/delete/send/share/publish clicks; no typing into card fields; in public mode no personal details; stays on the site (handles .co.uk); stops at captchas; ignores instructions written on pages.
  - Access modes: public / test account (the AI sees only {{EMAIL}}/{{PASSWORD}}; code types the real values; never saved; box contents never read) / preview link. Account and preview modes require "this is my own product".
  - `reputation.ts`: optional web search (Sonnet + web_search_20260209, max 3 searches) -> Haiku tidies into JSON; source links come from the results, read by code.
  - The explorer and reputation run in parallel before the personas. Personas see up to 6 key journey screenshots + the step log; the funnel gains a "Trying the product" step.
  - UI: ExplorePanel on the home page, live JourneyView while running, Product test + "What people say online" sections in the report.
  - Tested with a scripted brain (no AI) on public/demo/app.html, app-login.html and captcha.html: all safety blocks work, login works, the password never leaks. NOT yet tested with real AI calls (no key in the cloud); the founder should test on their Mac.
  - Rule: never bypass other sites' logins/CAPTCHAs or make fake accounts.
- 2026-11-05 CRAWLER + EXPLORER UPGRADE (founder: "make the crawlers super accurate and smart", while studying):
  - Added accuracy benches: `npm run bench`. Crawler: 11 practice sites with known answers (public/demo/sites/*). Explorer: 4 scripted-brain tests of actions + safety. ALWAYS run after crawler/explorer changes.
  - Crawler bench score went 3/11 -> 11/11 (backup logic, no key). Fixes: wait until content stops changing; see inside web components (pageHelpers.ts); ranked candidates (Haiku top 3 + scored word matches) with CHECKS (pricing must show prices, signup must have a form), so a wrong page means trying the next one; single-page-app #routes get clicked; guess /pricing and /signup as a last resort (noted as friction); bot-check pages give a clear error (BlockedError); a normal desktop Chrome identity; pricing and signup searched in parallel tabs + phone shot in the background (most sites 5-13s, was 10-28s).
  - Explorer: new actions hover, select, press_key, click_xy, drag (canvas editors like Canva); typing into the focused element; clicks retry (Escape, then mouse at center); loop detection ("going in circles"); screen-position clicks check what's there before clicking (same block rules). Sees inside web components.
  - Honest limits: benches test mechanics, not AI judgment on real sites; real-site accuracy needs testing on the founder's Mac with a key.
- 2026-11-04 (founder's Mac): FIRST FULL REAL RUN with the explorer on /demo/tricky.html WORKED end-to-end. "9 of 100 would join the waitlist", explorer honestly "got stuck" (no demo behind the waitlist) in 4 steps / 14s with Sonnet stepping in, specific fixes, realistic quotes, cost $0.047 total. The AI even caught that the demo's Plans button linked to the wrong (MealMate) pricing page; fixed with demo/tricky-pricing.html.
- Also fixed: a 404 landing page now stops the crawl before any AI cost (MissingPageError), found by the founder running old code.
- Accuracy push toward 90% on REAL sites: added 4 practice sites for likely real-world gaps ("Contact sales" pricing with no prices, prices like "9,99 €", cookie walls inside frames, mega-menus that create links on hover). The crawler now handles all of them; bench is 16/16. Also fixed a bench-server bug (missing UTF-8 charset).
- `npm run realcheck`: 22 real sites, measured accuracy % (verified pricing + signup), saves data/realcheck-<date>.json. Must run on the founder's Mac (the cloud blocks outside sites). Bot-protected sites are counted separately and never bypassed. NEXT: the founder runs it and sends the JSON; fix the failures until >=90%.
- DESIGN (2026-11-05): founder rejected Canva's AI-generated options ("needs to be minimalistic Gen Z aesthetic") and chose 2 Canva templates: "White and Blue Modern Creative Brief" (huge heavy all-caps type, sky gradient with grain, 01./02. numbered lists with thin lines, tiny all-caps corner labels, (001), arrows) + "Blue Beige Minimal Business Plan" (cobalt on cream, the asterisk mark, pill tags). Built as the Crawler look: globals.css re-points Tailwind colors (slate = cream to ink, indigo = cobalt #1d47d1, sky = gradient blue), Archivo 900 for `.display` headlines, Inter for text, `.meta` labels, `.sky` grain band. Restyled: header (✱ crawler), home hero + numbered steps, report (giant score on the sky band, 01. fixes, (001) fact cards, line-style folds), progress/live screens. Keep new UI in this style.
- MILESTONE 4 BUILT (accounts + landing page), approved by the founder ("just do everything"):
  - Supabase project **"crawler"** (id `txoimqedwfsuxoqiguop`, us-east-1, free plan). Table `public.tests` (id, user_id, url, goal, status, score, total, cost_usd, data jsonb, timestamps) with RLS: select/insert/update only own rows; NO delete policy (so deleting can't reset the free test). The security advisor reports 0 issues.
  - Packages installed (approved): @supabase/supabase-js, @supabase/ssr. Keys in `.env.local` (template: `.env.example`; the URL + publishable key are public by design). No service/secret key is used anywhere.
  - `/` = new landing page; the tool moved to `/app`; `/signin`, `/signup` (email + Google), `/auth/callback`, `/auth/signout`, `/tests` (My tests). `src/middleware.ts` refreshes sessions and guards /app, /run, /tests and /api/analyze|run|screenshot.
  - Runs save to Supabase as the user (their access token + RLS) at start ("running", which counts toward the limit) and at the end (full report). `/api/run/[id]` only returns your own runs.
  - Free limit: FREE_TESTS_PER_ACCOUNT (default 1) counted from the user's rows; ADMIN_EMAILS bypass it.
  - Without the Supabase env vars, accounts are OFF and everything works like before.
  - NOT testable from the cloud (Supabase is unreachable here): live sign-up/sign-in, saving rows, Google. Tested here: the build, page routing/redirects with accounts on and off, API 401s.
  - TODO for the founder: add the env lines; Google OAuth setup (README); maybe turn off "Confirm email" for testing. Screenshots are still saved on the local disk (move to Supabase Storage before hosting on Vercel).
- MILESTONE 5: PRODUCTION ARCHITECTURE (founder: "production-ready, design the architecture first, then build it"). Full design: `docs/architecture.md`.
  - Split into WEB (Next.js on Vercel: pages, auth, a thin API) + WORKER (`src/worker/*`, a long-running Node process in Docker via `Dockerfile.worker`: crawl, explorer, AI). They share Supabase.
  - The queue is Postgres table `jobs` + `claim_job()` (FOR UPDATE SKIP LOCKED) + `heartbeat_job()`; stale jobs are retried, then failed. The worker uses SUPABASE_SECRET_KEY (worker only).
  - New migration `supabase/migrations/0002_production.sql` (applied): profiles (plan, is_admin, created by a trigger), crawls, jobs (RLS on, no policies), tests updated (stage, progress, error, crawl_id; user insert/update policies REMOVED). start_analyze (30/hour) and start_test (locks the profile row; limit by plan; failed tests don't count) are the only write paths for users. A private storage bucket `screenshots` at {uid}/{crawls|tests}/{id}/{file}, readable only by its owner.
  - Tested on the live DB with 2 temporary users (then deleted): the limit, the double-claim protection, RLS isolation, fake inserts blocked, claim_job denied to users, users can't update their test. The advisor's remaining notes are intentional.
  - API: POST/GET /api/crawls, POST/GET /api/tests, GET /api/files/[...path] (signed-URL redirect). The old /api/analyze, /api/run and /api/screenshot are removed.
  - The engine is refactored to be stateless: `runTest(input, hooks)`, crawl/explore/evaluate use a BlobStore (local or Supabase). Test-account logins are AES-256-GCM encrypted (CREDENTIALS_KEY) in the job, and the worker erases them after reading. Users get friendly errors; the technical ones go to the worker logs (JSON lines).
  - Admin = `profiles.is_admin` (ADMIN_EMAILS / FREE_TESTS env removed). CI: `.github/workflows/ci.yml`. Security headers in next.config.ts.
  - Local dev: `npm run dev` + `npm run worker:dev` (two terminals). NOT testable in the cloud: web<->Supabase live, worker<->Supabase live. Worker handlers were tested with a fake DB; benches 16/16 + 4/4.
- DESIGN v2 (2026-11-05): the founder finished the Mac test, then said the cream/sky look was "horrid, no flow". They KEPT the Archivo font and the ✱ crawler logo, and wanted an "AI startup / Gen Z / YC founder" look. Now: white page with a soft blue top glow, near-black ink, ONE electric-blue accent (indigo = #3448f5), dark `.panel` (also `.sky`) product panels with a blue glow + faint grid, `.card` (white, thin border, soft shadow), `.meta` = JetBrains Mono labels ("// how it works", "01 —"), `.glow-text` gradient word, floating pill header. The landing page has the URL box in the hero (-> /app?url=..., signed-out visitors go to /signup and keep the URL via middleware `next`), a live-run preview panel, how-it-works cards, a bento grid, pricing, FAQ. /app is now a 4-step WIZARD (site -> review -> audience preset cards + fine-tune fold -> launch summary + explorer), with a stepper and back/next, and it auto-starts from ?url=. Keep new UI in THIS style.
- DESIGN v3 "fog + glow" (2026-11-05): founder liked usefastlane.ai + their gray Canva deck ("White Blue and Grey Modern Startup Pitch Deck", Life OS). globals.css: fog-gray page (#e4e8ee) with fixed blurred blue/pink blobs (body::before), halftone blue dots fading down from the top (body::after), charcoal slate scale, Archivo 800 sentence-case `.display`, frosted-glass `.card`, charcoal dotted `.panel`, `.rule` hairline, `.btn` = the ONE glowing blue main button per screen. Landing: deck-style top line ("beta ——— made for indie hackers"), honest badge cards (no fake awards), laptop run-log + phone report mockup with glow, section headers "// label ——— (01)", faint hexagons. Keep new UI in THIS style.
- 2026-11-06: tried DESIGN v4 "midnight" (black + dark blue); the founder said it still looked terrible and asked to "turn back to white", so v4 was reverted. NOW = v3.1 "white + glow": v3 with a WHITE page, a faint blue glow at the top, solid white `.card` with a thin slate-200 border. The founder is unhappy with the overall look; NEXT design step = get 2-3 reference sites they love + what bugs them, then show 3 hero options on one page before restyling everything.
- SWARM HERO (2026-11-06, founder idea): `src/components/CrawlerSwarm.tsx` = one SVG under the hero badges: ~42 round agents (blue = yes, light blue = maybe, gray = no; positions from a fixed formula) tied by curved strings to a website sketch in the middle; blue signal dashes flow along the strings, agents bob, a scan line reads the page (CSS in globals.css, off for reduced-motion).
- DESIGN v5 "minimal" (2026-11-06, founder brief: premium startup like Linear/Vercel/Arc/Raycast, minimal Gen Z). Audit-first: screenshotted every page at 1440/390, listed 10 problems, fixed, re-verified (light + dark, no horizontal scroll). REPLACES all earlier looks:
  - globals.css = the design system: CSS variables for light + dark (dark follows the system; header toggle `ThemeToggle.tsx` saves a choice, a head script applies it before paint). Tailwind names: bg-bg/subtle/raised, text-fg/muted/faint, border-line/line-strong, bg-accent, text-accent-fg, text-accent-ink. NO slate/indigo/sky classes anymore.
  - ONE accent: hot orange #FF5A1F, only for primary buttons (.btn-primary) and key numbers; small accent text uses --accent-ink (AA). Geist + Geist Mono, ONLY weights 400/500. Type classes .t-display/.t-h1/.t-h2/.t-h3/.t-lead/.t-label/.t-number. Spacing scale 4/8/16/24/32/48/64/96/128. Radius 8 (controls) / 12 (cards). Buttons .btn + primary/secondary/ghost/text, all >=44px. Fields .field/.field-label/.field-hint, toggles .chip[aria-pressed], verdict .pill-buy/maybe/no. Visible :focus-visible ring. No gradients/glows/glass/emoji icons.
  - Landing (`src/components/landing/*`): left-aligned hero + URL box, the interactive ProductPreview (example report for mealmate.app: 12/25 scorecard + 25 filterable persona cards), how-it-works list, X share card (scorecard not built yet: "coming soon"), pricing Free/$29/$99 (placeholders, paid = coming soon), final CTA. Swarm removed.
  - OPEN QUESTIONS for the founder: the landing says 25 customers / ~2 min (their brief) but the app runs 100 in ~1 min; "no signup to try" would need backend changes (tests are tied to accounts), so signup stays.
- Next up: founder tests on real sites; then Milestone 2 (re-run on the same personas, before/after, honest score range, scorecard image).
