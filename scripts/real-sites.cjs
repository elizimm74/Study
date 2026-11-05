// Real-site accuracy check: runs the crawler on popular real websites and
// scores how often it finds a REAL pricing page and a REAL signup page.
// Run on your own computer (this needs the open internet):
//
//   npm run realcheck
//
// No personas run, so it costs almost nothing (with an API key, Haiku picks
// what to click: a fraction of a cent per site).
//
// Scoring: the crawler only keeps a page after CHECKING it (pricing must show
// prices or plans; signup must have a form or "Continue with Google"), so
// "found" means found AND verified. Sites where pricing is optional (many
// consumer apps don't have a pricing page) only count signup.
const fs = require("fs");
const path = require("path");

// Load the API key from .env.local if it's there (so the AI choice is tested too).
const envFile = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const { crawlSite } = require(path.join(__dirname, "..", ".bench-build", "lib", "crawl.js"));

// pricing: true = it has a public pricing page; "optional" = it might not.
const SITES = [
  { url: "https://www.notion.com", pricing: true },
  { url: "https://www.canva.com", pricing: true },
  { url: "https://www.figma.com", pricing: true },
  { url: "https://slack.com", pricing: true },
  { url: "https://www.dropbox.com", pricing: true },
  { url: "https://www.grammarly.com", pricing: true },
  { url: "https://calendly.com", pricing: true },
  { url: "https://www.loom.com", pricing: true },
  { url: "https://trello.com", pricing: true },
  { url: "https://www.todoist.com", pricing: true },
  { url: "https://mailchimp.com", pricing: true },
  { url: "https://www.shopify.com", pricing: true },
  { url: "https://webflow.com", pricing: true },
  { url: "https://www.framer.com", pricing: true },
  { url: "https://www.airtable.com", pricing: true },
  { url: "https://linear.app", pricing: true },
  { url: "https://lovable.dev", pricing: true },
  { url: "https://rork.com", pricing: "optional" },
  { url: "https://www.spotify.com", pricing: "optional" },
  { url: "https://www.duolingo.com", pricing: "optional" },
  { url: "https://quizlet.com", pricing: "optional" },
  { url: "https://www.khanacademy.org", pricing: "optional" },
];

const PARALLEL = 2; // two sites at a time

async function checkSite(site) {
  const t0 = Date.now();
  const r = { url: site.url, pricing: null, signup: null, error: null, notes: [], seconds: 0 };
  try {
    const crawl = await crawlSite(site.url);
    const p = crawl.pages.find((x) => x.step === "pricing");
    const s = crawl.pages.find((x) => x.step === "signup");
    r.pricing = p ? p.url : null;
    r.signup = s ? s.url : null;
    for (const x of crawl.pages) if (x.note) r.notes.push(`${x.step}: ${x.note}`);
  } catch (err) {
    r.error = String(err && err.message).split("\n")[0];
  }
  r.seconds = Math.round((Date.now() - t0) / 1000);
  return r;
}

(async () => {
  console.log(`\nReal-site accuracy check: ${SITES.length} sites (${process.env.ANTHROPIC_API_KEY ? "AI click choice ON" : "no API key: backup logic only"})\n`);
  const results = [];
  for (let i = 0; i < SITES.length; i += PARALLEL) {
    const batch = SITES.slice(i, i + PARALLEL);
    const done = await Promise.all(batch.map(checkSite));
    for (const [j, r] of done.entries()) {
      const site = batch[j];
      results.push({ ...r, pricingExpected: site.pricing });
      const mark = (ok) => (ok ? "✓" : "✗");
      const host = new URL(r.url).hostname.replace(/^www\./, "");
      if (r.error) {
        console.log(`  ${host.padEnd(20)} ERROR  ${r.error.slice(0, 90)}`);
      } else {
        const pricingCell = site.pricing === true ? `${mark(r.pricing)} pricing` : r.pricing ? "✓ pricing" : "- pricing";
        console.log(`  ${host.padEnd(20)} ${pricingCell}   ${mark(r.signup)} signup   ${String(r.seconds).padStart(3)}s`);
      }
    }
  }

  // Score: every site counts signup; pricing counts only where it's expected.
  let checks = 0;
  let passed = 0;
  let blocked = 0;
  for (const r of results) {
    if (r.error && /bot protection/i.test(r.error)) {
      blocked++;
      continue; // bot-blocked sites are reported separately: we don't get around them on purpose
    }
    checks += 1;
    if (r.signup) passed++;
    if (r.pricingExpected === true) {
      checks += 1;
      if (r.pricing) passed++;
    }
  }
  const pct = checks ? Math.round((passed / checks) * 100) : 0;
  const avg = Math.round(results.reduce((s, r) => s + r.seconds, 0) / results.length);
  console.log(`\nAccuracy: ${passed}/${checks} checks = ${pct}%   (bot-blocked sites, not counted: ${blocked})`);
  console.log(`Average time per site: ${avg}s\n`);

  const out = path.join(__dirname, "..", "data", `realcheck-${new Date().toISOString().slice(0, 10)}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ accuracyPct: pct, passed, checks, blocked, results }, null, 2));
  console.log(`Details saved to ${path.relative(process.cwd(), out)}. Send this file to Claude to fix the failures.\n`);
})();
