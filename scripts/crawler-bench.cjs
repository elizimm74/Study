// Crawler accuracy bench: runs the crawler on practice sites where we KNOW the
// right answers, and prints a score. Run it with:  npm run bench
//
// Each practice site copies a real-world trap (single-page apps, footer-only
// pricing, buttons in web components, bot-check pages, misleading links...).
// Without an API key it tests the backup (no-AI) logic; with a key in
// .env.local it also tests the AI choosing what to click.
const path = require("path");
const { serve } = require("./bench-server.cjs");
const { crawlSite } = require(path.join(__dirname, "..", ".bench-build", "lib", "crawl.js"));

// site folder (served as the website's root) + start page + correct answers
const CASES = [
  { name: "basic links", dir: ".", start: "/index.html", pricing: "/pricing.html", signup: "/signup.html" },
  { name: "cookie banner + button + pop-up", dir: ".", start: "/tricky.html", pricing: "/tricky-pricing.html", signup: "popup" },
  { name: "log-in page first", dir: "sites/loginwall", start: "/", pricing: null, signup: "/create-account.html" },
  { name: "single-page app (#routes)", dir: "sites/spa", start: "/", pricing: "#/plans", signup: "#/start" },
  { name: "pricing only in footer", dir: "sites/footer", start: "/", pricing: "/billing.html", signup: "/access.html" },
  { name: "no pricing link (guess /pricing)", dir: "sites/guess", start: "/", pricing: "/pricing", signup: "/signup" },
  { name: "buttons inside web components", dir: "sites/shadow", start: "/", pricing: "/pricing.html", signup: "/signup.html" },
  { name: "misleading 'Pricing' blog link", dir: "sites/wrongfirst", start: "/", pricing: "/plans.html", signup: "/join.html" },
  { name: "content appears after 2.5s", dir: "sites/slow", start: "/", pricing: "/pricing.html", signup: "/signup.html", heroHas: "Grow tomatoes" },
  { name: "pricing in hover menu", dir: "sites/hovermenu", start: "/", pricing: "/pricing.html", signup: "/signup.html" },
  { name: "bot-check page", dir: "sites/blocked", start: "/", blocked: true },
  { name: "page doesn't exist (404)", dir: "sites/blocked", start: "/no-such-page.html", missing: true },
];

function where(url) {
  const u = new URL(url);
  return u.pathname + u.hash;
}

function check(c, crawl) {
  const problems = [];
  const page = (step) => crawl.pages.find((p) => p.step === step);
  for (const step of ["pricing", "signup"]) {
    const want = c[step];
    const got = page(step);
    if (want === null) {
      if (got) problems.push(`${step}: expected none, got ${where(got.url)}`);
    } else if (want === "popup") {
      if (!got || !/pop-up/i.test(got.note || "")) problems.push(`${step}: expected a pop-up, got ${got ? where(got.url) : "nothing"}`);
    } else if (!got) {
      problems.push(`${step}: expected ${want}, got nothing`);
    } else if (!where(got.url).endsWith(want)) {
      problems.push(`${step}: expected ${want}, got ${where(got.url)}`);
    } else if (step === "pricing" && !/[$€£]\s?\d/.test(got.text)) {
      problems.push(`pricing: right page, but no prices in the captured text`);
    }
  }
  if (c.heroHas && !page("hero")?.text.includes(c.heroHas)) problems.push(`hero: text "${c.heroHas}" not captured`);
  return problems;
}

(async () => {
  const mode = process.env.ANTHROPIC_API_KEY ? "AI click choice ON" : "no API key: testing the backup logic";
  console.log(`\nCrawler accuracy bench (${mode})\n`);
  let passed = 0;
  for (const c of CASES) {
    const server = await serve(c.dir);
    const url = `http://localhost:${server.address().port}${c.start}`;
    const t0 = Date.now();
    let problems;
    try {
      const crawl = await crawlSite(url);
      problems = c.blocked || c.missing ? [`expected the crawler to stop with an error, but it crawled the page`] : check(c, crawl);
    } catch (err) {
      const msg = String(err && err.message);
      const expected = (c.blocked && /block|bot|checking your browser/i.test(msg)) || (c.missing && /not found|no page/i.test(msg));
      problems = expected ? [] : [`crashed: ${msg.split("\n")[0]}`];
    }
    server.close();
    const ok = problems.length === 0;
    if (ok) passed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.name.padEnd(36)} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    for (const p of problems) console.log(`        - ${p}`);
  }
  console.log(`\nScore: ${passed}/${CASES.length} (${Math.round((passed / CASES.length) * 100)}%)\n`);
  process.exit(passed === CASES.length ? 0 : 1);
})();
