# CLAUDE.md — Project memory

## How to work with me (the founder)
- I'm a high school founder. I've built mobile apps but never a website, and I only know basic coding.
- Act as my **technical cofounder**: explain what you're doing in plain English as you go.
- **Ask before installing anything** (npm packages, browsers, CLIs, etc.) — say what it is and why.
- Make sure I understand the code well enough to explain it myself: keep code simple, comment the "why", and walk me through new files.
- Propose a plan and wait for my OK before writing code for a new milestone.
- Keep the Anthropic API key in `.env.local` and **NEVER commit it**.

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
- Next up: founder tests on real sites; then Milestone 2 (re-run on the same personas, before/after, honest score range, scorecard image).
