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

Open http://localhost:3000. To test without a real product, use
`http://localhost:3000/demo/index.html` (a fake meal-planning app).

The **cost of each run** is printed in the terminal where `npm run dev` is running.

## How the code is organized

| File | What it does |
|---|---|
| `src/app/page.tsx` | Home page: URL box, captured pages, audience picker |
| `src/app/run/[id]/page.tsx` | Progress bar, then the report |
| `src/components/AudiencePicker.tsx` | The audience form + presets |
| `src/components/Report.tsx` | Score, fixes, copy, funnel, objections, heatmap, quotes |
| `src/app/api/*` | Server endpoints the pages call |
| `src/lib/crawl.ts` | Step 1: invisible browser visits landing → pricing → signup |
| `src/lib/suggest.ts` | Auto-suggest the audience (1 Haiku call) |
| `src/lib/personas.ts` | Step 2: generate varied personas in code (free) |
| `src/lib/evaluate.ts` | Steps 3-4: personas review the site, 25 per Haiku call |
| `src/lib/aggregate.ts` | Step 5: counts, segments, funnel, objections (free) |
| `src/lib/report.ts` | Step 6: Sonnet writes fixes + new copy from the summary only |
| `src/lib/pipeline.ts` | Runs steps 2-6 in order and tracks progress |
| `src/lib/cost.ts` | Turns token usage into dollars and prints it |

Crawls, runs and screenshots are saved as files in `data/` (not uploaded to GitHub).
