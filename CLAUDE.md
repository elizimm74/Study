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
  - ONE accent: electric blue #3448f5 (was orange; switched 2026-11-06 at the founder's request), only for primary buttons (.btn-primary) and key numbers; small accent text uses --accent-ink (AA). Geist + Geist Mono, ONLY weights 400/500. Type classes .t-display/.t-h1/.t-h2/.t-h3/.t-lead/.t-label/.t-number. Spacing scale 4/8/16/24/32/48/64/96/128. Radius 8 (controls) / 12 (cards). Buttons .btn + primary/secondary/ghost/text, all >=44px. Fields .field/.field-label/.field-hint, toggles .chip[aria-pressed], verdict .pill-buy/maybe/no. Visible :focus-visible ring. No gradients/glows/glass/emoji icons.
  - Landing (`src/components/landing/*`): left-aligned hero + URL box, the interactive ProductPreview (example report for mealmate.app: 12/25 scorecard + 25 filterable persona cards), how-it-works list, X share card (scorecard not built yet: "coming soon"), pricing Free/$29/$99 (placeholders, paid = coming soon), final CTA. Swarm removed.
  - OPEN QUESTIONS for the founder: the landing says 25 customers / ~2 min (their brief) but the app runs 100 in ~1 min; "no signup to try" would need backend changes (tests are tied to accounts), so signup stays.
- LOGO + BRAND (2026-11-07): the founder designed the logo with me: a solid blue hand-drawn asterisk with a white border (see `src/components/Mark.tsx`, drawn in code with a wobble filter; `src/app/icon.svg` is the tab icon, old favicon.ico removed). The ONE accent is now the logo blue #1a2aa6 (lighter #4d60f5 in dark mode so it reads). Orange is gone for good (founder: "definitely not orange"). Look = minimal: cool-gray page, white cards, near-black text, blue only for primary buttons, key numbers and the mark. The founder wants the preview run IN the session (report_preview_port 3000) rather than updating their Mac terminal each time.
- DESIGN v6 "blue + ripped paper" (2026-11-07, founder: "no modes, full blue background, white rips, sick animations of bots going into a website with a check"). REPLACES the light/dark system: ThemeToggle deleted, one look only. The PAGE is the logo blue #1a2aa6 with white text; `.card`/`.card-raised`/`.paper` re-set the color variables inside themselves (white, dark text, blue accent), so components need no changes. On blue the primary button is white with blue text. `.field` inputs are always white (`.field-prefix` for the grey "https://"). `.paper.bleed` = full-width white strip with torn edges (SVG mask), used for "How it works". Hero animation `src/components/landing/BotRush.tsx`: 12 bots fly along glowing trails into a website (SVG <animateMotion>/<animate>, no library), progress fills, a check pops, loops every 6s; reduced-motion = paused frame. GOTCHA: <animate> keyTimes must end at 1 or the browser silently ignores it. AnalysisFlow (static avatar diagram) removed.
- v6 applied to the other pages (2026-11-07): BotRush has a LIVE mode (`<BotRush live={{ progress, label }} />`: real progress bar, check only at 100%) used on the wizard's "Reading your site" (estimate from the timer) and the run page's progress screen (real done/total). The report's score section is a full-width `.paper.bleed` strip; sign in / sign up / My tests sit on `.paper` sheets. Torn-edge SVG must end at the same height it starts (120, 9) or seams appear.
- POLISH (2026-11-07, founder: "animated white claws because Crawler, opening animations, premium buttons"): `src/components/Claws.tsx` = 3 tilted white claw scratches that draw in (SVG mask + CSS `claw-draw`) when they scroll into view; used faint behind the hero headline and bright by the final CTA. Opening animations: `.rise` + `.d1-.d5` stagger on the hero, `.page-enter` on <main> for every page. Buttons: soft shadow, 1px lift on hover, a shine sweep (`--sheen`), press-in on click, `.btn-arrow` nudges right (`Arrow` exported from UrlForm.tsx). All respect reduced motion.
- SIGN-IN (2026-11-07): AuthForm has "Continue with Apple" (black button, Apple's rule) + "Continue with Google" (official 4-color G), both via `signInWithOAuth` → /auth/callback (which now shows the provider's error, e.g. cancelled). Providers must be enabled by the FOUNDER in the Supabase dashboard (the MCP can't change auth settings; secrets never go in chat). Steps are in README. Apple needs a paid developer account and its web secret expires every 6 months.
- LOGO v2 (2026-11-08, founder: "switch the logo to the main scratches"): the logo is now THREE CLAW SCRATCHES (chunky tilted crescents) in `src/components/Mark.tsx` (`LOGO_SCRATCHES`, currentColor; white in the header). Tab icon `src/app/icon.svg` = white scratches on a rounded blue (#1a2aa6) square so it shows on any browser. The old asterisk logo is retired.
- APPLE SIGN-IN WORKS (2026-11-08). `scripts/apple-secret.cjs` makes the Apple secret JWT locally from the .p8 (built-in crypto). The founder pasted a secret in chat and sent the .p8 via iMessage: advised to revoke key GQQQ8DZAFN and make a new one before real users. Secret expires ~2027-05.
- INTRO (2026-11-08, founder: "when the website opens, a white page with blue claws scratching it open"): `src/components/landing/Intro.tsx`, rendered in layout.tsx OUTSIDE <main> (main's page-enter transform would trap position:fixed), home page only (usePathname). A before-paint script in layout sets html data-intro="play"|"skip" (once per tab via sessionStorage; skip for reduced motion). White overlay → blue Claws draw → two clip-path halves with a jagged tear fly apart. `--intro-delay` holds the hero `.rise` until it opens.
- LANDING REBUILT AROUND ONE PROMISE (2026-11-08, founder): "See what stops customers from buying—before you launch." Honest framing everywhere: SIMULATED customers, BUYING INTENT, not real purchases. Sections: hero (promise + URL box + "simulated customers · buying intent, not real purchases") → example report → "How a test works" (paper strip) → "What you get back" (intent score, what stopped them, where they dropped off, ranked fixes) → "Honest by design" is/isn't card → pricing → "Find your blockers before launch day." The X share-card section was removed (feature not built). Page title/description updated in layout.tsx. Still open: landing says 25 customers, the app runs 100.
- MINIMAL LANDING + ONBOARDING + PRICING (2026-11-08):
  - Landing = ONE screen: Hero (promise, URL box, "simulated customers · buying intent, not real purchases", BotRush) + one small example result card. Everything else removed (ProductPreview + example.ts deleted). Header: Pricing (→ /pricing), Sign in, Start free.
  - Tests use 100 simulated customers (founder decision; matches the app). Copy updated.
  - PRICING = one-time PACKS, no subscriptions (founder: people don't launch often, subscriptions would churn). `src/lib/plans.ts` is the single source of truth: Free (1 test), Launch Pack $19 (5 tests), Studio Pack $49 (20 tests), never expire. `/pricing` page reads it. Paid = "Coming soon" until Stripe. DB limits (profiles.plan / plan_test_limit) NOT yet switched to packs: do that with Stripe (a purchase adds tests).
  - ONBOARDING: `/onboarding` (private) = 3 questions (URL, what + when, who it's for) on a paper sheet → saves to Supabase user_metadata (onboarded: true) → /app?url=…&for=… (the wizard uses `for` as whoItsFor). Sign-up (password, email confirm, Google/Apple from the signup page) goes through it first; already-onboarded users skip it. Sign-ins from /signin with a brand-new Google account skip onboarding (known gap).
- HOME v2 (2026-11-08, founder: "just say crawler and one other thing, bolded, big, Gen Z font"): `/` = ONLY a huge lowercase "crawler" wordmark (`.t-wordmark`: Archivo 900, -0.065em) over faint Claws + ONE button "Test my site" → /onboarding. Hero.tsx deleted (BotRush/UrlForm still used elsewhere). The intro still plays first.
- ONBOARDING IS NOW THE INITIAL FLOW: /onboarding is PUBLIC (removed from middleware PRIVATE_PAGES). Signed-out visitors answer the 3 questions → /app?url=…&for=… → middleware sends them to sign up (next keeps the URL) → AuthForm skips onboarding when `next` already has ?url → the test starts. Answers wait in sessionStorage ("crawler-onboarding") and the /app page saves them to user_metadata after sign-up.
- HOME SCROLL FEATURES (2026-11-08, founder: "slow scrolling to see all features, white background, blue scratches, blue font"): under the blue "crawler" screen (with a "see everything it does" hint → #features, smooth scroll), `src/components/landing/Features.tsx` = full-width torn `.paper` section with `.features` (re-sets text vars to blues; cards inside too) and 6 features (paste one link, 100 customers, explorer, what stopped them, ranked fixes, reviews online) + "Simulated customers. Real reasons." + Test my site. Headings `.t-chunk` (Archivo 900). Each block slowly rises in via `src/components/Reveal.tsx` (IntersectionObserver + .reveal/.is-in, shown instantly for reduced motion / no JS). Blue Claws decorate. Section has overflow-x-clip (tilted claws poked out on phones).
- WORKER GOTCHA (2026-11-08): "analyses not going through" = the worker wasn't running on the founder's Mac (jobs sat queued, 0 attempts). Two terminals are needed: `npm run dev` + `npm run worker:dev`. In development the wizard now says so after 30s instead of spinning.
- Payments: founder is 15. Stripe/Whop payouts need an adult (18+) account owner, so a parent/guardian must open the account. Stripe plan (Supabase Edge Functions for checkout + webhook, purchases table, tests_bought) is proposed and waiting on that.
- NEXT: Stripe (one-time Checkout for the packs + webhook that adds tests to the account).
- Next up: founder tests on real sites; then Milestone 2 (re-run on the same personas, before/after, honest score range, scorecard image).
- APP TESTING PHASE 1 BUILT (2026-11-09, founder: "as accurate as possible"). Plan + file map: `docs/app-testing-plan.md`.
  - Flow: /app ALWAYS starts with the questions (founder: "questions first, then analyze"): Q1 = website or app (+ URL), Q2 what/when, Q3 who. Website -> /app?url= (analysis starts); App -> /app?kind=app -> upload screenshots (shrunk in the browser to 1568px JPEG, uploaded to screenshots/{uid}/uploads/{batch}/1.jpg, b1.jpg for version B) -> review screen labels + paywall facts (live store-rule checks) -> audience + iPhone % + where they found it -> launch.
  - Engine: Haiku labels screens + profile + audience; Sonnet reads paywall facts; 3 samples x 100 customers walk the flow (Haiku, cached images); contradictions fixed in code (normalize.ts); counted in code (range, drop-off per screen, paired A/B sign test: clear win / slight edge / too close to call); benchmark FLAG vs RevenueCat 2025 (median 6.2%, top 10% 20.3% download->trial); Sonnet fixes + paywall copy, win-back counts in code. Store rules say "may be flagged", never "will be rejected".
  - Migration 0003 applied (upload policy + start_app_analyze). Tests list shows "App onboarding + paywall".
  - "Reading" screen redesigned: `src/components/Working.tsx` (compact 2 columns, checklist + progress + BotRush) for both website and app. Shared wizard pieces in `src/components/wizard.tsx`.
  - The founder's account (elizimm44@gmail.com) is now is_admin = unlimited tests.
  - NOT tested with real AI yet. Next: founder runs an app test on their Mac.
- HOME SCROLL v2 (2026-11-09, founder: "the white moves up when you scroll, more blue"): the blue "crawler" screen is `sticky` and `src/components/landing/ScrollLift.tsx` pushes it up, shrinks, blurs and fades it as you scroll (ease-in, rAF, off for reduced motion); the white `.paper.sheet` (z-10, shadow on its torn edge) slides OVER it. More blue: big blue 01–07 numbers, every other picture is a `.card-blue` (solid logo blue, white text), a torn `.blue-band` stats strip (100 / 3 / 0) across the middle, new feature 07 "Apps too." Hero copy: "Simulated customers test your website or app before launch day." + "Test my product".
- ASK ABOUT THIS TEST (2026-11-09, founder: "after the report you can prompt for free a prompt or 2, e.g. if something is wrong like on rork"). Standing order from the founder: "never ask me the go ahead, just do and complete".
  - Migration 0004 applied: `test_messages` (RLS select own) + `ask_test` / `answer_test` / `retract_test` (security definer; the 2-free-questions limit `free_test_messages()` is enforced IN THE DATABASE; admins unlimited; one question at a time; a failed AI call retracts the question so it isn't charged). Tested live with a temp user (rolled back): limit, double-ask, forged answer, unfinished test, too long, other user, admin.
  - `src/lib/chat.ts` (Haiku answers ONLY from the saved test: profile, counted stats, fixes, page text, confirmed app facts; sets `needsRerun` when the founder says a fact was wrong), route `src/app/api/tests/[id]/messages`, UI `src/components/AskBox.tsx` at the bottom of Report + AppReport. Needs ANTHROPIC_API_KEY on the web server too (not only the worker) once on Vercel.
  - A correction = "Fix it and run a new test" button -> /app?url=... (or ?kind=app), uses one test from the pack (founder's choice: full new test, not a recount). After the free questions: "More questions come with packs (coming soon)".
- LAUNCH BUILD (2026-11-10, founder: "build everything complete, final product"). All verified: typecheck, lint, bench 16/16 + 4/4 + 27/27, `next build`, screenshots at 1440/390 with no horizontal overflow.
  - Migration 0005 applied + tested live (temp users, rolled back): `tests.share_token`, `share_test/unshare_test/get_shared_test` (public = headline numbers only), `test_actuals` + `submit_actual` + `public_accuracy`, `check_job_cap` (max 4 unfinished jobs per user, in start_analyze/start_app_analyze/start_test), `profiles.bonus_tests` + `grant_tests` (service role only: Stripe's webhook will call it) and start_test counts bonus tests. Advisor: only the 2 intentionally public functions are new warnings.
  - SHARING: `src/lib/scorecard.tsx` (next/og 1200x630 image, Archivo 900 fetched from Google Fonts with fallback), `/api/og/[token]` (+ "home" brand card), `/s/[token]` public page (noindex), `ShareBox` (copy / Post on X / save image / stop sharing) in both reports.
  - TRUST: `/accuracy` public predicted-vs-real table + rank correlation (shown only at 5+ results), `ActualBox` under each report.
  - CONVERSION: `/example` (website + app example reports; data made up, but generated through the REAL aggregate code, `src/lib/example.ts`; `demo` prop hides the boxes), `/tools/paywall-checker` (free, no sign-up, runs in the browser), honest FAQ on the home page, nav "Example", footer links, "See an example report" button, onboarding accepts `?kind=app`.
  - POLISH/OPS: SEO (metadataBase from NEXT_PUBLIC_SITE_URL, OG/Twitter cards, sitemap.ts, robots.ts), not-found + error pages, `/api/health`, `fly.toml`, `docs/deploy.md` (Vercel + Fly checklist), README + `.env.example` updated.
  - NOT done (needs the founder/an adult): deploying (Vercel + Fly accounts), Stripe (parent must open the account; plumbing is ready), real-AI test of app tests/chat on the founder's Mac, enabling leaked-password protection, revoking Apple key GQQQ8DZAFN.
- LAUNCH VIDEO (2026-11-10, founder sent a reference launch video and asked for one "super similar"): `video/crawler-launch.mp4` (38.5s, 1920x1080, 60fps, sound). Same pacing/moves as the reference (typed hook + counter, search bar, "zero answers" cascade, "what if", logo reveal, zoomed product cards with cursor + callout pills, hub, tagline, button click) in Crawler's own look and words; no art or music reused. Source: `video/launch.html` (pure function of time, `window.seek(t)`), `video/render.cjs` (Playwright frames -> ffmpeg; `--preview` for stills), `video/soundtrack.py` (original music + effects from numpy). How to edit: `video/README.md`. GOTCHA: never put a `//` comment inside the one-line template code in launch.html (it swallows the rest of the line). The sound was checked by loudness only, not by ear.
- VIDEO SOUND (2026-11-10): three versions in `video/`: `crawler-launch-hype.mp4` (founder asked for "super hype upbeat high bass": `soundtrack_hype.py`, original 140 bpm 808 track, drop at the logo 13.9s, sidechain ducking, balanced so mids/highs survive phone speakers), `crawler-launch.mp4` (calm), `crawler-launch-for-trending-sound.mp4` (effects only). The founder asked for a Travis Scott song: declined (copyrighted; add trending sounds inside TikTok/Instagram instead). Audio is verified by loudness/frequency measurements only, never by ear.
- HYPE EDIT (2026-11-10): the founder asked to brand a Limitless / War Dogs clip, then sent a TikTok edit of The Social Network (another creator's watermark) to add the Crawler logo + a blue business card. DECLINED both (studio's footage, the creator's edit, actors appearing to endorse the product). Built the original equivalent instead: `video/crawler-edit.mp4` (15s, vertical 1080x1920, 30fps) from `video/edit.html`: "Launching blind isn't brave. It's a guess." -> drop -> 100 customers / 38 would buy / 34% price hidden / fix it +11 -> a Crawler-blue business card flips in ("the only card you need") -> logo + "Test yours free" + the honesty line. `render.cjs` now takes PAGE / W / H / FPS / AUDIO / OUT; `soundtrack_hype.py` takes SFX=0 for music only. RULE: no copyrighted film/music or real people's likeness in Crawler promos; offer an original in the same style.
