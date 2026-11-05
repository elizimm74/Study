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

Create a file called `.env.local` in the project folder containing your key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

`.env.local` is listed in `.gitignore`, so it is never uploaded to GitHub.

Start the site:

```bash
npm run dev
```

Open http://localhost:3000. To test without a real product, use one of the fake demo sites:
- `http://localhost:3000/demo/index.html`: a meal-planning app with normal links
- `http://localhost:3000/demo/tricky.html`: a cookie banner, a "Plans" button, and a waitlist pop-up
- `http://localhost:3000/demo/loginwall.html`: "Get started" leads to a log-in page first
- `http://localhost:3000/demo/app.html`: a fake app for **Try the product**. Task: "Search for a birthday template and open it". It also has traps: a Buy button, an outside link, and an email box.
- `http://localhost:3000/demo/app-login.html`: test-account mode. Email `tester@example.com`, password `S3cret-Pass!` (fake, for testing only)

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
