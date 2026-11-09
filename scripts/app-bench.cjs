// APP TEST BENCH: checks the parts of app testing that must be exactly right,
// with known answers and no AI (free, runs anywhere):
//   - store-rule checks on paywall facts
//   - fixing contradictions in customers' answers
//   - the counting: ranges, drop-off per screen, the paired A/B test, benchmark flag
//   - cleaning what the browser sends
// Run: npm run bench (it builds first). Any failure = exit code 1.
const path = require("path");
const build = path.join(__dirname, "..", ".bench-build", "lib", "app");
const { checkPaywall } = require(path.join(build, "checks.js"));
const { normalizeApp } = require(path.join(build, "normalize.js"));
const { aggregateApp, signTest, range, benchmark } = require(path.join(build, "aggregate.js"));
const { cleanAppSettings } = require(path.join(build, "validate.js"));

let pass = 0;
let total = 0;
function test(name, fn) {
  total++;
  try {
    const problem = fn();
    if (problem) throw new Error(problem);
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}
const eq = (a, b, what) => (JSON.stringify(a) === JSON.stringify(b) ? null : `${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const near = (a, b, what) => (Math.abs(a - b) < 1e-4 ? null : `${what}: expected ${b}, got ${a}`);

// ---------- sample facts ----------
const GOOD = {
  plans: [
    { name: "Yearly", price: "$39.99", period: "year", trialDays: 7, highlighted: true },
    { name: "Monthly", price: "$7.99", period: "month", trialDays: 0, highlighted: false },
  ],
  closeButton: "visible",
  restorePurchases: true,
  termsLink: true,
  privacyLink: true,
  priceAfterTrialShown: true,
  autoRenewExplained: true,
  socialProof: ["4.8★ from 12k ratings"],
  headline: "Unlock everything",
  ctaText: "Start free trial",
};
const failing = (facts) => checkPaywall(facts).filter((c) => !c.ok).map((c) => c.id).sort();

console.log("\nStore-rule checks");
test("a complete paywall passes everything", () => eq(failing(GOOD), [], "failed checks"));
test("missing restore, privacy and after-trial price are caught", () =>
  eq(failing({ ...GOOD, restorePurchases: false, privacyLink: false, priceAfterTrialShown: false }), ["after-trial", "legal-links", "restore"], "failed checks"));
test("a price with no billing period is caught", () =>
  eq(failing({ ...GOOD, plans: [{ ...GOOD.plans[0], period: "other" }] }), ["period-shown"], "failed checks"));
test("a hidden close button is a conversion warning, not a store rule", () => {
  const c = checkPaywall({ ...GOOD, closeButton: "small or faint" }).find((x) => x.id === "close-button");
  return c.ok ? "should fail" : eq(c.kind, "conversion", "kind");
});
test("no trial = no after-trial check", () =>
  eq(checkPaywall({ ...GOOD, plans: GOOD.plans.map((p) => ({ ...p, trialDays: 0 })) }).some((c) => c.id === "after-trial"), false, "has after-trial"));
test("too many plans is flagged", () =>
  eq(failing({ ...GOOD, plans: [1, 2, 3, 4].map((i) => ({ ...GOOD.plans[1], name: `P${i}`, highlighted: i === 1 })) }), ["plan-count"], "failed checks"));
test("no paywall gives one clear note", () => eq(checkPaywall(null).map((c) => c.id), ["no-paywall"], "ids"));
test("store rules never say 'will be rejected'", () => (JSON.stringify(checkPaywall({ ...GOOD, restorePurchases: false })).includes("rejected") ? "says rejected" : null));

// ---------- normalize ----------
const screen = (type) => ({ file: "x.jpg", type, title: "", summary: "", asks: [], cta: "", canSkip: false });
const SETTINGS = {
  screens: ["welcome", "question", "permission", "paywall", "other"].map(screen),
  screensB: [screen("paywall")],
  paywall: GOOD,
  paywallB: GOOD,
  iphonePct: 50,
  sources: ["App Store search"],
};
const persona = { id: "S1-P001", sample: 0 };
const raw = (o) => ({ persona_id: "S1-P001", stopped_at_screen: 0, paywall_a: "close", paywall_b: "close", objection_category: "price", objection: "", would_change_mind: "", quote: "", ...o });

console.log("\nFixing contradictions");
test("quit before the paywall can't subscribe", () => {
  const v = normalizeApp(raw({ stopped_at_screen: 2, paywall_a: "subscribe", paywall_b: "start trial" }), persona, SETTINGS, true);
  return eq([v.decision, v.decisionB, v.stoppedAt], ["never reached", "never reached", 2], "decision");
});
test("a trial on a paywall with no trial becomes subscribe", () => {
  const noTrial = { ...SETTINGS, paywall: { ...GOOD, plans: GOOD.plans.map((p) => ({ ...p, trialDays: 0 })) } };
  return eq(normalizeApp(raw({ paywall_a: "start trial" }), persona, noTrial, false).decision, "subscribe", "decision");
});
test("paid at the paywall, so they didn't quit there", () =>
  eq(normalizeApp(raw({ stopped_at_screen: 4, paywall_a: "start trial" }), persona, SETTINGS, true).stoppedAt, 0, "stoppedAt"));
test("reached the paywall but said 'never reached' = close", () =>
  eq(normalizeApp(raw({ paywall_a: "never reached" }), persona, SETTINGS, true).decision, "close", "decision"));
test("no version B = no B decision", () => eq(normalizeApp(raw({}), persona, SETTINGS, false).decisionB, null, "decisionB"));
test("converters have no objection category", () =>
  eq(normalizeApp(raw({ paywall_a: "start trial" }), persona, SETTINGS, false).objectionCategory, "none", "category"));
test("stopped_at is kept inside the flow", () => eq(normalizeApp(raw({ stopped_at_screen: 99, paywall_a: "close" }), persona, SETTINGS, false).stoppedAt, 5, "stoppedAt"));

// ---------- counting ----------
console.log("\nCounting");
test("sign test: no switchers = no evidence", () => near(signTest(0, 0), 1, "p"));
test("sign test: 10 vs 0 is very unlikely by chance", () => near(signTest(10, 0), 2 / 1024, "p"));
test("sign test: 5 vs 5 is a coin flip", () => near(signTest(5, 5), 1, "p"));
test("range: middle, lowest, highest", () => eq(range([0.3, 0.2, 0.4]), { mid: 0.3, low: 0.2, high: 0.4 }, "range"));
test("benchmark flags too-good results instead of changing them", () => eq([benchmark(0.5).level, benchmark(0.08).level, benchmark(0.01).level], ["high", "normal", "low"], "levels"));

// 3 samples x 10 people. Per sample: 2 quit at screen 2, 3 reach the paywall and close
// on A but start a trial on B, 1 converts on both, 4 close both.
const personas = [];
const verdicts = [];
for (let s = 0; s < 3; s++) {
  for (let i = 0; i < 10; i++) {
    const id = `S${s + 1}-P${i}`;
    personas.push({ id, sample: s, age: 20 + i, budget: "okay", mindset: "busy", platform: i % 2 ? "iPhone" : "Android", source: "App Store search", patience: "low: x", occupation: "student" });
    const v = { personaId: id, sample: s, objectionCategory: "price", objection: "too pricey", wouldChangeMind: "cheaper", quote: "hmm that's a lot for an app" };
    if (i < 2) verdicts.push({ ...v, stoppedAt: 2, decision: "never reached", decisionB: "never reached" });
    else if (i < 5) verdicts.push({ ...v, stoppedAt: 0, decision: "close", decisionB: "start trial" });
    else if (i < 6) verdicts.push({ ...v, stoppedAt: 0, decision: "start trial", decisionB: "start trial", objectionCategory: "none" });
    else verdicts.push({ ...v, stoppedAt: 0, decision: "close", decisionB: "close" });
  }
}
const stats = aggregateApp(SETTINGS.screens, personas, verdicts, 3);
test("conversion range per sample", () => eq(stats.convert, { mid: 0.1, low: 0.1, high: 0.1 }, "convert"));
test("drop-off counted at the right screen", () => eq(stats.funnel.map((f) => f.quit), [0, 6, 0, 0, 0], "quits"));
test("people who reached the paywall", () => eq(stats.reachedPaywall.mid, 0.8, "reached"));
test("A/B: 9 switched to B, 0 to A, all 3 crowds agree = clear win for B", () =>
  eq([stats.ab.winner, stats.ab.confidence, stats.ab.onlyB, stats.ab.onlyA], ["B", "clear win", 9, 0], "ab"));
test("objections only count non-converters", () => eq(stats.objections.reduce((s, o) => s + o.count, 0), 27, "objection count"));

const weak = aggregateApp(SETTINGS.screens, personas, verdicts.map((v, i) => (i === 2 ? v : { ...v, decisionB: v.decision })), 3);
test("A/B: 1 switcher is too close to call", () => eq([weak.ab.winner, weak.ab.confidence], [null, "too close to call"], "ab"));

// ---------- cleaning browser input ----------
console.log("\nCleaning input");
test("unknown screens, bad types and huge trials are cleaned", () => {
  const c = cleanAppSettings(
    {
      screens: [{ file: "1.jpg", type: "hacker", title: "x".repeat(500) }, { file: "../../etc.jpg", type: "paywall" }],
      paywall: { plans: [{ name: "Y", price: "$1", period: "decade", trialDays: 9999 }] },
      iphonePct: 250,
      sources: ["App Store search", "evil"],
    },
    ["1.jpg", "2.jpg"],
    [],
  );
  return (
    eq(c.screens.map((s) => [s.file, s.type]), [["1.jpg", "other"], ["2.jpg", "other"]], "screens") ||
    eq([c.screens[0].title.length, c.paywall.plans[0].period, c.paywall.plans[0].trialDays, c.iphonePct, c.sources], [200, "other", 90, 100, ["App Store search"]], "values")
  );
});

console.log(`\nApp bench: ${pass}/${total}`);
if (pass < total) process.exit(1);
