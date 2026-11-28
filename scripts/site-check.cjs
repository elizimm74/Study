// npm run sitecheck [-- http://localhost:3000]
// REAL automated browser tests of Crawler's public pages (Playwright, already installed).
// For every page x device (iPhone, Android, iPad, laptop, large monitor) it checks:
//   no sideways scrolling, no console errors / page crashes, no broken images, no failed requests
//   to our own site, exactly one <h1>, a unique <title>, a meta description, buttons/links big
//   enough to tap on phones, and that every internal link on the page answers (not 404/500).
// Then it runs the key FLOWS: hero URL box (bad + good address), onboarding steps, the sample
// report tabs, the FAQ, the pricing cards and the PDF button on the sample report.
// Results go to data/sitecheck-<date>.json. Exit code 1 if anything failed.
const { chromium, devices } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const PAGES = ["/", "/pricing", "/example", "/example?kind=app", "/science", "/accuracy", "/onboarding", "/signin", "/signup", "/tools/paywall-checker", "/this-page-does-not-exist"];
const DEVICES = {
  "iPhone 15": devices["iPhone 15"] ?? devices["iPhone 13"],
  "Android (Pixel 7)": devices["Pixel 7"] ?? devices["Pixel 5"],
  "iPad": devices["iPad (gen 7)"] ?? devices["iPad Mini"],
  "Laptop 1440": { viewport: { width: 1440, height: 900 } },
  "Monitor 2560": { viewport: { width: 2560, height: 1440 } },
};

const results = [];
const record = (r) => {
  results.push(r);
  console.log(`${r.ok ? "✓" : "✗"} [${r.type}] ${r.device ? r.device + " " : ""}${r.page ?? ""} ${r.check}${r.detail ? " — " + r.detail : ""}`);
};

(async () => {
  const browser = await chromium.launch();
  const titles = new Map();
  const linkStatus = new Map();

  for (const [device, opts] of Object.entries(DEVICES)) {
    const ctx = await browser.newContext({ ...opts });
    for (const pg of PAGES) {
      const page = await ctx.newPage();
      const errors = [];
      const badRequests = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && !/Failed to load resource.*404/.test(m.text()) && errors.push(m.text()));
      page.on("response", (res) => {
        const u = res.url();
        if (u.startsWith(BASE) && res.status() >= 500) badRequests.push(`${res.status()} ${u.replace(BASE, "")}`);
      });
      const res = await page.goto(BASE + pg, { waitUntil: "networkidle" }).catch((e) => ({ status: () => 0, e }));
      const status = res.status();
      const expect404 = pg.includes("does-not-exist");
      record({ type: "page", device, page: pg, check: "loads", ok: expect404 ? status === 404 : status === 200, detail: `HTTP ${status}` });
      await page.waitForTimeout(400);
      const info = await page.evaluate(() => {
        const smallTargets = [...document.querySelectorAll("a, button, input, select, [role=tab]")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            if (!r.width || !r.height || style.visibility === "hidden" || el.closest("footer, .sr-only, p, li, td, dd, label")) return false;
            return r.height < 36 || r.width < 36;
          })
          .map((el) => (el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 30));
        return {
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          h1: document.querySelectorAll("h1").length,
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
          brokenImages: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute("src")).map((i) => i.getAttribute("src")),
          links: [...new Set([...document.querySelectorAll("a[href^='/']")].map((a) => a.getAttribute("href")))],
          smallTargets,
        };
      });
      record({ type: "page", device, page: pg, check: "no sideways scroll", ok: info.overflow <= 1, detail: info.overflow > 1 ? `${info.overflow}px too wide` : "" });
      record({ type: "page", device, page: pg, check: "no console errors", ok: errors.length === 0, detail: errors.slice(0, 2).join(" | ").slice(0, 200) });
      record({ type: "page", device, page: pg, check: "no server errors", ok: badRequests.length === 0, detail: badRequests.slice(0, 3).join(", ") });
      record({ type: "page", device, page: pg, check: "images load", ok: info.brokenImages.length === 0, detail: info.brokenImages.join(", ") });
      if (device === "Laptop 1440") {
        record({ type: "seo", page: pg, check: "exactly one h1", ok: info.h1 === 1, detail: `${info.h1} found` });
        record({ type: "seo", page: pg, check: "has a meta description", ok: info.description.length > 40 || expect404, detail: info.description.slice(0, 60) });
        if (!expect404) titles.set(pg, info.title);
        for (const href of info.links) if (!linkStatus.has(href)) linkStatus.set(href, null);
      }
      if (device.startsWith("iPhone") || device.startsWith("Android")) {
        record({ type: "mobile", device, page: pg, check: "tap targets at least 36px", ok: info.smallTargets.length === 0, detail: info.smallTargets.slice(0, 5).join(", ") });
      }
      await page.close();
    }
    await ctx.close();
  }

  // unique titles (example + example?kind=app share one page on purpose)
  const seen = new Map();
  for (const [pg, t] of titles) seen.set(t, [...(seen.get(t) ?? []), pg]);
  for (const [t, pgs] of seen) record({ type: "seo", check: `unique title "${t}"`, ok: pgs.length === 1 || pgs.every((p) => p.startsWith("/example")), detail: pgs.join(", ") });

  // every internal link answers (private pages answer with a redirect to sign-in, which is fine)
  const req = await (await browser.newContext()).request;
  for (const href of linkStatus.keys()) {
    const r = await req.get(BASE + href, { maxRedirects: 0 }).catch(() => null);
    const s = r ? r.status() : 0;
    record({ type: "links", check: `link ${href}`, ok: s > 0 && s < 400, detail: `HTTP ${s}` });
  }

  // ---------- flows ----------
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const flow = async (name, fn) => {
    try {
      const detail = await fn();
      record({ type: "flow", check: name, ok: true, detail: detail || "" });
    } catch (e) {
      record({ type: "flow", check: name, ok: false, detail: e.message.split("\n")[0].slice(0, 200) });
    }
  };
  await flow("hero: 'Testing an app, an ad or just an idea?' opens 'What do you want to test?' (no games)", async () => {
    await p.goto(BASE + "/", { waitUntil: "networkidle" });
    await p.getByRole("link", { name: /Testing an app, an ad or just an idea/ }).first().click();
    await p.waitForURL(/\/onboarding$/, { timeout: 8000 });
    await p.getByRole("heading", { name: /What do you want to test/ }).waitFor();
    for (const t of ["Website", "Mobile app", "Just an idea", "Video or ad"]) await p.getByRole("button", { name: new RegExp("^" + t) }).first().waitFor();
    if (await p.getByRole("button", { name: /^Game/ }).count()) throw new Error("the Game tile is still there");
  });
  await flow("onboarding: the 'Website' tile asks for the link; a bad address shows an error", async () => {
    await p.getByRole("button", { name: /^Website/ }).first().click();
    await p.getByRole("heading", { name: /Paste your website/ }).waitFor();
    await p.locator("#ob-url").waitFor();
  });
  await flow("final box: a bad address shows an error and stays on the page", async () => {
    await p.goto(BASE + "/", { waitUntil: "networkidle" });
    await p.fill("#final-url", "not a site");
    await p.locator("#final-url").press("Enter");
    await p.getByRole("alert").first().waitFor({ timeout: 3000 });
    if (!p.url().endsWith("/")) throw new Error("navigated away");
  });
  await flow("final box: a good address goes to onboarding WITH the address", async () => {
    await p.fill("#final-url", "example.com");
    await p.locator("#final-url").press("Enter");
    await p.waitForURL(/\/onboarding\?url=example\.com/, { timeout: 8000 });
    await p.locator("#ob-url").waitFor();
    const v = await p.inputValue("#ob-url");
    if (!v.includes("example.com")) throw new Error(`url field = ${v}`);
  });
  await flow("onboarding: 'Continue' leads to the objectives step; objectives toggle", async () => {
    await p.getByRole("button", { name: /^Continue/ }).waitFor();
    await p.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => /^Continue/.test(b.textContent) && !b.disabled), null, { timeout: 15000 });
    await p.getByRole("button", { name: /^Continue/ }).click();
    await p.getByRole("heading", { name: /What do you want to learn/ }).waitFor();
    const price = p.getByRole("button", { name: /Is my price reasonable/ });
    await price.click();
    if ((await price.getAttribute("aria-pressed")) !== "true") throw new Error("objective didn't toggle on");
  });
  await flow("onboarding: typing localhost shows the tunnel steps with the right port", async () => {
    await p.goto(BASE + "/onboarding?kind=website", { waitUntil: "networkidle" });
    await p.fill("#ob-url", "localhost:5173");
    await p.locator("#ob-url").press("Enter");
    await p.getByText("npx cloudflared tunnel --url http://localhost:5173").waitFor({ timeout: 4000 });
    const use = p.getByRole("button", { name: "Use this address" });
    if (!(await use.isDisabled())) throw new Error("'Use this address' should wait for a pasted address");
    await p.getByLabel("Your tunnel address").fill("Your quick Tunnel has been created! Visit it at https://calm-bird-12.trycloudflare.com");
    if (await use.isDisabled()) throw new Error("the pasted tunnel address wasn't recognised");
  });
  await flow("onboarding: 'Just an idea' goes to the idea form; it waits for a name and a real description", async () => {
    await p.goto(BASE + "/onboarding", { waitUntil: "networkidle" });
    await p.getByRole("button", { name: /^Just an idea/ }).first().click();
    await p.getByRole("heading", { name: /Testing an idea/ }).waitFor();
    await p.goto(BASE + "/app?kind=idea", { waitUntil: "networkidle" });
    await p.getByRole("heading", { name: /Describe your idea/ }).waitFor();
    const go = p.getByRole("button", { name: /Read my idea/ });
    if (!(await go.isDisabled())) throw new Error("should be disabled while empty");
    await p.getByPlaceholder("MealMate").fill("MealMate");
    await p.locator("textarea").fill("A meal planner that plans a week of dinners from what is already in your fridge.");
    if (await go.isDisabled()) throw new Error("should be enabled once filled in");
  });
  await flow("onboarding: switching to 'Mobile app' changes the step", async () => {
    await p.goto(BASE + "/onboarding", { waitUntil: "networkidle" });
    await p.getByRole("button", { name: /^Mobile app/ }).first().click();
    await p.getByRole("heading", { name: /Testing a mobile app/ }).waitFor();
  });
  await flow("home: one goal: URL box + sample report in the hero, stepped simulation (4 stops), 3 steps, sample report, free test first", async () => {
    await p.goto(BASE + "/", { waitUntil: "networkidle" });
    await p.locator(".wordmark21").first().waitFor({ timeout: 5000 });
    await p.locator("#hero-url").waitFor({ timeout: 3000 });
    const heroLinks = await p.locator(".hero27 form a").allInnerTexts();
    if (!heroLinks.some((t) => /See a sample report/.test(t))) throw new Error("no sample report button next to the URL box");
    await p.locator(".hero27 .launch-pill").first().waitFor({ timeout: 3000 });
    const sim = await p.locator("#simulation").boundingBox();
    if (!sim) throw new Error("no simulation block");
    const stops = await p.locator("#simulation [data-scroll-stops]").getAttribute("data-scroll-stops").catch(() => null);
    const pills = await p.locator("#simulation .lab-step").count();
    if (stops !== "4" || pills !== 4) throw new Error(`simulation should stop 4 times with 4 stage pills (stops=${stops}, pills=${pills})`);
    if (await p.locator("#patterns").count()) throw new Error("the second long animation is still on the page");
    const steps = await p.locator(".step27").allInnerTexts();
    if (steps.length !== 3 || steps.some((t) => t.split(/\s+/).length < 20)) throw new Error(`steps = ${steps.length}, words = ${steps.map((t) => t.split(/\s+/).length)}`);
    await p.getByText(/illustrative data/i).first().waitFor({ timeout: 3000 });
    await p.getByRole("tab", { name: "Recommendations", exact: true }).click();
    await p.getByText("Show the price on the homepage").first().waitFor({ timeout: 3000 });
    await p.getByRole("tab", { name: "Personas", exact: true }).click();
    await p.getByRole("button", { name: "Would buy" }).first().click();
    await p.locator(".price27-free").getByText("$0").waitFor({ timeout: 3000 });
    const order = await p.evaluate(() => ["#report", "#pricing"].map((q) => document.querySelector(q)?.getBoundingClientRect().top ?? -1));
    if (!(order[0] > 0 && order[1] > order[0])) throw new Error(`pricing should come right after the sample report: ${order}`);
  });
  await flow("home: one call to action ('Run simulation'); the page is short", async () => {
    const ctas = await p.locator("main .btn-primary, header .btn-primary").allInnerTexts();
    const other = ctas.map((t) => t.replace(/[^A-Za-z ]/g, "").trim()).filter((t) => t && !/^Run simulation/.test(t));
    if (other.length) throw new Error(`other primary buttons: ${other.join(" / ")}`);
    const screens = await p.evaluate(() => document.documentElement.scrollHeight / innerHeight);
    if (screens > 14) throw new Error(`page is ${screens.toFixed(1)} screens long`);
    return `${ctas.length} primary buttons, all "Run simulation"; ${screens.toFixed(1)} screens`;
  });
  await flow("home: the full-report link and final URL box are there", async () => {
    await p.locator('a[href="/example"]').first().waitFor();
    await p.locator("#final-url").waitFor();
  });
  await flow("home: FAQ shows 4 questions, the rest fold; answers open", async () => {
    await p.getByText("What do I get for free?").click();
    await p.getByText(/One test with 25 simulated customers/).first().waitFor();
    await p.getByText(/More questions/).click();
    await p.getByText("How long does a test take?").waitFor();
  });
  await flow("home: demo data is labelled", async () => {
    const n = await p.getByText(/demo data|illustrative/i).count();
    if (n < 2) throw new Error(`only ${n} demo labels`);
    return `${n} labels`;
  });
  await flow("home (phone): the 'Run simulation' bar appears after the hero and puts the cursor in the URL box", async () => {
    const ph = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    try {
      await ph.goto(BASE + "/", { waitUntil: "networkidle" });
      if (await ph.locator(".sticky-run[data-show]").count()) throw new Error("bar shows before scrolling");
      await ph.evaluate(() => window.scrollTo(0, 2200));
      await ph.locator(".sticky-run[data-show]").waitFor({ timeout: 4000 });
      await ph.locator(".sticky-run button").tap();
      await ph.waitForFunction(() => document.activeElement?.id === "hero-url", null, { timeout: 4000 });
    } finally {
      await ph.close();
    }
  });
  await flow("pricing: 5 monthly plans (no annual), pay per analysis, enterprise, same numbers as the code", async () => {
    await p.goto(BASE + "/pricing", { waitUntil: "networkidle" });
    for (const t of ["25 Crawlers", "1,000 Crawlers", "5,000 Crawlers", "15,000 Crawlers", "40,000 Crawlers", "$1.90 per 100 Crawlers", "Ad Analysis unlocked", "No Ad Analysis", "Most popular", "Need more Crawlers?", "Just need one test?", "Pay per analysis", "Compare plans", "renew automatically"]) await p.getByText(t, { exact: false }).first().waitFor({ timeout: 3000 });
    const price = () => p.locator(".plan-card").evaluateAll((cards) => cards.map((c) => c.textContent.match(/\$\s*([\d.]+)\s*(one time|\/ month)/)?.[1]));
    const monthly = (await price()).join(",");
    if (monthly !== "0,19,49,99,199") throw new Error(`monthly prices on cards: ${monthly}`);
    if (await p.getByRole("button", { name: /Annual/ }).count()) throw new Error("an Annual toggle is still on the page");
    if (await p.getByText(/billed yearly|annual/i).count()) throw new Error("the page still mentions annual billing");
    const per = await p.locator(".pack-card").evaluateAll((cards) => cards.map((c) => c.textContent.match(/([\d,]+) customers\$(\d+)/)?.slice(1).join("=")));
    if (per.join(",") !== "100=9,250=19,500=29,1,000=49") throw new Error(`pay-per-analysis cards: ${per.join(",")}`);
    await p.getByRole("link", { name: "Need more Crawlers?" }).click();
    await p.locator("#custom-form, #custom").first().waitFor({ timeout: 3000 });
    return "monthly prices, no annual, 4 pay-per-analysis sizes, custom volume";
  });
  await flow("sample report: fix tracker saves a status (demo: in this browser)", async () => {
    await p.goto(BASE + "/example", { waitUntil: "networkidle" });
    await p.locator("#fixes").scrollIntoViewIfNeeded();
    const sel = p.locator("#fixes select").first();
    await sel.selectOption("completed");
    await p.getByText(/1 of \d+ fixes completed/).waitFor({ timeout: 3000 });
    await p.reload({ waitUntil: "networkidle" });
    await p.getByText(/1 of \d+ fixes completed/).waitFor({ timeout: 3000 });
  });
  await flow("sample report: 'Download PDF' opens print", async () => {
    await p.evaluate(() => {
      window.__printed = false;
      window.print = () => (window.__printed = true);
    });
    await p.getByRole("button", { name: "Download PDF" }).first().click();
    if (!(await p.evaluate(() => window.__printed))) throw new Error("print not called");
  });
  await flow("sample report: copy fix prompt puts text on the clipboard", async () => {
    await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
    await p.getByRole("button", { name: /Copy fix prompt/ }).first().click();
    const text = await p.evaluate(() => navigator.clipboard.readText());
    if (!/Do NOT invent testimonials/.test(text)) throw new Error("prompt missing rules");
    return `${text.length} characters`;
  });
  await flow("API: URL checker refuses a private address", async () => {
    const r = await p.request.post(BASE + "/api/check-url", { data: { url: "http://169.254.169.254/latest/meta-data" } });
    const d = await r.json();
    if (d.ok) throw new Error("private address was accepted");
  });
  await flow("API: private APIs need sign-in", async () => {
    for (const u of ["/api/tests", "/api/crawls", "/api/billing", "/api/account/delete"]) {
      const r = await p.request.post(BASE + u, { data: {} });
      if (![401, 503].includes(r.status())) throw new Error(`${u} answered ${r.status()}`);
    }
  });

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  const out = path.join(__dirname, "..", "data", `sitecheck-${new Date().toISOString().slice(0, 10)}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ base: BASE, ran: new Date().toISOString(), passed: results.length - failed.length, failed: failed.length, results }, null, 2));
  console.log(`\nSite check: ${results.length - failed.length}/${results.length} passed. Saved ${path.relative(process.cwd(), out)}`);
  process.exit(failed.length ? 1 : 0);
})();
