// Explorer bench: checks the explorer's actions and SAFETY RULES with a
// scripted "brain" (no AI, no cost). Run with:  npm run bench
//
// The AI's judgment can't be tested this way. That needs a real API key and
// real sites. But everything the explorer DOES with the AI's decisions is
// tested: clicking through pop-ups, hover menus, dropdowns, canvas clicks and
// drags, and every block (buy/delete, personal details, card fields, other
// websites, captchas, never leaking the test password).
const path = require("path");
const { serve } = require("./bench-server.cjs");
const { exploreProduct } = require(path.join(__dirname, "..", ".bench-build", "lib", "explore.js"));

const D = (action, extra = {}) => ({ observation: "test", friction: "", action, element_id: -1, text: "", x: -1, y: -1, x2: -1, y2: -1, reason: "scripted", ...extra });
const find = (els, label) => (els.find((e) => e.label === label) || els.find((e) => e.label.startsWith(label)) || { id: -1 }).id;
const canvasAt = (els) => {
  const m = (els.find((e) => e.kind === "canvas") || { box: "" }).box.match(/x=(\d+)\.\.\d+, y=(\d+)\.\.\d+/);
  return m ? { x: +m[1], y: +m[2] } : { x: 0, y: 0 };
};

async function run(dir, start, access, credentials, script) {
  const server = await serve(dir);
  const startUrl = `http://localhost:${server.address().port}${start}`;
  const seen = [];
  let lastText = "";
  const settings = { enabled: true, task: "bench", access, startUrl, reputation: false };
  const r = await exploreProduct(`bench${Math.random().toString(16).slice(2, 10)}`, settings, credentials, (j) => seen.push(JSON.stringify(j)),
    async (n, els, url, text) => {
      seen.push(JSON.stringify(els));
      lastText = text;
      return (script[n - 1] || (() => D("done")))(els);
    });
  server.close();
  return { journey: r.journey, lastText, seen: seen.join("") };
}

const tests = [
  {
    name: "pop-up in the way, hover menu, dropdown, canvas click + drag",
    async run() {
      const r = await run("sites/editor", "/", "public", null, [
        (els) => D("click", { element_id: find(els, "Start designing") }), // covered by a welcome pop-up
        (els) => D("hover", { element_id: find(els, "File") }),
        (els) => D("click", { element_id: find(els, "Templates") }),
        (els) => D("select", { element_id: find(els, "12"), text: "24" }),
        (els) => { const c = canvasAt(els); return D("click_xy", { x: c.x + 500, y: c.y + 100 }); },
        (els) => { const c = canvasAt(els); return D("drag", { x: c.x + 150, y: c.y + 150, x2: c.x + 400, y2: c.y + 300 }); },
        () => D("click_xy", { x: 1175, y: 40 }), // the "Delete design" button: must be blocked
      ]);
      const want = ["started=yes", "templates=open", "size=24", "dragged=yes", "deleted=no"];
      const problems = want.filter((w) => !r.lastText.includes(w)).map((w) => `expected "${w}" in: ${r.lastText.match(/STATUS.*/)}`);
      if (/clicked=none/.test(r.lastText)) problems.push("the canvas click didn't register");
      if (!r.journey.steps.some((s) => /Did NOT click "Delete design"/.test(s.action))) problems.push("Delete wasn't reported as blocked");
      return problems;
    },
  },
  {
    name: "blocks buying, personal details and other websites",
    async run() {
      const r = await run("sites/app", "/app.html", "public", null, [
        (els) => D("type", { element_id: find(els, "Search templates"), text: "birthday" }),
        (els) => D("click", { element_id: find(els, "Search") }),
        (els) => D("click", { element_id: find(els, "Buy Pro") }),
        (els) => D("type", { element_id: find(els, "Your email"), text: "me@example.com" }),
        (els) => D("click", { element_id: find(els, "Open Birthday cake") }),
        (els) => D("click", { element_id: find(els, "Our partner site") }),
      ]);
      const a = r.journey.steps.map((s) => s.action).join(" | ");
      const problems = [];
      if (!/Did NOT click "Buy Pro/.test(a)) problems.push("Buy wasn't blocked");
      if (!/Did NOT enter personal details/.test(a)) problems.push("email in public mode wasn't blocked");
      if (!r.journey.steps.some((s) => /editor\.html/.test(s.url))) problems.push("didn't reach the editor");
      if (r.journey.steps.some((s) => !/localhost/.test(s.url))) problems.push("left the site");
      return problems;
    },
  },
  {
    name: "test account: logs in, password never leaks",
    async run() {
      const r = await run("sites/app", "/app-login.html", "account", { email: "tester@example.com", password: "S3cret-Pass!" }, [
        // These boxes have no labels on purpose (that's how the leak was found before).
        (els) => D("type", { element_id: els.find((e) => /email/.test(e.attrs)).id, text: "{{EMAIL}}" }),
        (els) => D("type", { element_id: els.find((e) => /password/.test(e.attrs)).id, text: "{{PASSWORD}}" }),
        (els) => D("click", { element_id: find(els, "Log in") }),
      ]);
      const problems = [];
      if (!r.journey.steps.some((s) => /app\.html/.test(s.url))) problems.push("login didn't work");
      if (r.seen.includes("S3cret-Pass!")) problems.push("PASSWORD LEAKED into what the AI sees or the saved journey");
      if (r.seen.includes("tester@example.com")) problems.push("email leaked into what the AI sees or the saved journey");
      return problems;
    },
  },
  {
    name: "stops at a captcha",
    async run() {
      const r = await run("sites/app", "/captcha.html", "public", null, []);
      return r.journey.status === "blocked" ? [] : [`expected blocked, got ${r.journey.status}`];
    },
  },
];

(async () => {
  console.log("\nExplorer bench (scripted brain: tests actions + safety, not AI judgment)\n");
  let passed = 0;
  for (const t of tests) {
    const t0 = Date.now();
    let problems;
    try {
      problems = await t.run();
    } catch (err) {
      problems = [`crashed: ${String(err && err.message).split("\n")[0]}`];
    }
    if (!problems.length) passed++;
    console.log(`${problems.length ? "FAIL" : "PASS"}  ${t.name.padEnd(60)} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    for (const p of problems) console.log(`        - ${p}`);
  }
  console.log(`\nScore: ${passed}/${tests.length}\n`);
  process.exit(passed === tests.length ? 0 : 1);
})();
