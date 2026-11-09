// The two kinds of work the worker does. Each takes a claimed job, does the
// slow part, and saves the result to the database.
import type { SupabaseClient } from "@supabase/supabase-js";
import { crawlSite, BlockedError, MissingPageError } from "../lib/crawl";
import { understandSite, EMPTY_PROFILE } from "../lib/suggest";
import { runTest, type Run } from "../lib/pipeline";
import { logRunCost } from "../lib/cost";
import { decryptJson } from "../lib/crypto";
import type { BlobStore } from "../lib/blobs";
import type { Audience, Crawl, Credentials, ExploreSettings, ProductProfile } from "../lib/types";
import { readApp } from "../lib/app/read";
import { runAppTest, type AppRun } from "../lib/app/pipeline";
import type { AppAnalysis, AppInput, AppSettings } from "../lib/app/types";

export type Job = {
  id: number;
  kind: "analyze" | "run";
  ref_id: string;
  user_id: string;
  attempts: number;
  max_attempts: number;
  secret: string | null;
};

export type Ctx = { db: SupabaseClient; store: BlobStore; log: (msg: string, extra?: object) => void };

// Saved on a finished crawl (what the web app reads back).
export type CrawlData = { crawl: Crawl; profile: ProductProfile; audience: Audience | null; suggestError?: string };

// Saved on a test when it's started (by start_test) and read by the worker.
export type TestSettings = {
  profile: ProductProfile;
  audience: Audience;
  explore?: ExploreSettings;
  count?: number;
  kind?: "website" | "app";
  app?: AppSettings; // only for app tests
};

// ---------- analyze: crawl the site, then understand it ----------
export async function analyzeJob(job: Job, ctx: Ctx) {
  const { data: row, error } = await ctx.db.from("crawls").select("url, data").eq("id", job.ref_id).single();
  if (error || !row) throw new Error(`crawl ${job.ref_id} not found`);
  await ctx.db.from("crawls").update({ status: "running", updated_at: now() }).eq("id", job.ref_id);
  if (row.url.startsWith("app://")) return analyzeAppJob(job, ctx, (row.data as { input: AppInput }).input);

  let crawl: Crawl;
  try {
    crawl = await crawlSite(row.url, { id: job.ref_id, store: ctx.store, prefix: `${job.user_id}/crawls/${job.ref_id}` });
  } catch (err) {
    // A site that's missing or blocks bots: a clear message, not a retry.
    if (err instanceof BlockedError || err instanceof MissingPageError) {
      await ctx.db.from("crawls").update({ status: "error", error: err.message, updated_at: now() }).eq("id", job.ref_id);
      return;
    }
    throw new Error(`Couldn't open that site: ${(err as Error).message.split("\n")[0]}`);
  }

  // Understanding the site is one cheap AI call. If it fails, still return
  // the crawl so the user can fill in the profile by hand.
  let data: CrawlData;
  try {
    const { profile, audience, cost } = await understandSite(crawl);
    logRunCost(`analyze ${crawl.id}`, [...crawl.costs, cost]);
    data = { crawl, profile, audience };
  } catch (err) {
    data = { crawl, profile: EMPTY_PROFILE, audience: null, suggestError: (err as Error).message };
  }
  const { error: saveError } = await ctx.db
    .from("crawls")
    .update({ status: "done", data, updated_at: now() })
    .eq("id", job.ref_id);
  if (saveError) throw new Error(`couldn't save crawl: ${saveError.message}`);
}

// ---------- analyze (app): read the uploaded screenshots ----------
async function analyzeAppJob(job: Job, ctx: Ctx, input: AppInput) {
  const filesPrefix = `${job.user_id}/uploads/${input.batch}`;
  let data: AppAnalysis;
  try {
    const r = await readApp(input, { store: ctx.store, prefix: filesPrefix });
    logRunCost(`analyze app ${job.ref_id}`, r.costs);
    data = { kind: "app", input, filesPrefix, ...r };
  } catch (err) {
    // Still let the founder label the screens by hand.
    const blank = (file: string) => ({ file, type: "other" as const, title: "", summary: "", asks: [], cta: "", canSkip: false });
    data = {
      kind: "app",
      input,
      filesPrefix,
      screens: input.screens.map(blank),
      screensB: input.screensB.map((f) => ({ ...blank(f), type: "paywall" as const })),
      paywall: null,
      paywallB: null,
      profile: { ...EMPTY_PROFILE, goal: "start a free trial" },
      audience: null,
      suggestError: (err as Error).message,
    };
  }
  const { error } = await ctx.db.from("crawls").update({ status: "done", data, updated_at: now() }).eq("id", job.ref_id);
  if (error) throw new Error(`couldn't save app analysis: ${error.message}`);
}

// ---------- run: the full test ----------
export async function runJob(job: Job, ctx: Ctx) {
  const { data: test, error } = await ctx.db.from("tests").select("id, crawl_id, data").eq("id", job.ref_id).single();
  if (error || !test) throw new Error(`test ${job.ref_id} not found`);
  const settings = (test.data as { settings: TestSettings }).settings;
  if (settings.kind === "app") return runAppJob(job, ctx, test.crawl_id, settings);
  const { data: crawlRow } = await ctx.db.from("crawls").select("data").eq("id", test.crawl_id).single();
  const crawl = (crawlRow?.data as CrawlData | undefined)?.crawl;
  if (!crawl) throw new Error(`crawl ${test.crawl_id} has no data`);

  // Read the encrypted test-account login (if any), then erase it right away.
  let credentials: Credentials | null = null;
  if (job.secret) {
    credentials = decryptJson<Credentials>(job.secret);
    await ctx.db.from("jobs").update({ secret: null }).eq("id", job.id);
  }

  // Save progress for the live view, at most about once a second.
  let lastSave = 0;
  let lastStage = "";
  let pending: Promise<unknown> = Promise.resolve();
  const saveProgress = (run: Run) => {
    const t = Date.now();
    if (run.stage === lastStage && t - lastSave < 1000) return;
    lastSave = t;
    lastStage = run.stage;
    const update = {
      status: "running",
      stage: run.stage,
      progress: { done: run.progress.done, total: run.progress.total, journey: run.journey ?? null },
      updated_at: now(),
    };
    pending = pending.then(() => ctx.db.from("tests").update(update).eq("id", job.ref_id));
  };

  const run = await runTest(
    {
      id: job.ref_id,
      userId: job.user_id,
      crawl,
      profile: settings.profile,
      audience: settings.audience,
      count: settings.count ?? 100,
      explore: settings.explore,
      credentials,
    },
    { store: ctx.store, testPrefix: `${job.user_id}/tests/${job.ref_id}`, onChange: saveProgress },
  );
  await pending; // let the last progress update land first

  // Users get a friendly message; the technical one goes to the logs.
  if (run.error) ctx.log("test error", { test: job.ref_id, error: run.error });
  const { error: saveError } = await ctx.db
    .from("tests")
    .update({
      status: run.status,
      stage: run.stage,
      error: run.error ? "Something went wrong on our side while running this test. It didn't use up your plan; please try again." : null,
      score: run.stats?.buy ?? null,
      total: run.stats?.total ?? run.personas.length,
      cost_usd: run.totalCostUsd ?? null,
      progress: null,
      data: run,
      updated_at: now(),
    })
    .eq("id", job.ref_id);
  if (saveError) throw new Error(`couldn't save test: ${saveError.message}`);
  ctx.log("test finished", { test: job.ref_id, status: run.status, score: run.stats?.buy, costUsd: run.totalCostUsd });
}

// ---------- run (app) ----------
async function runAppJob(job: Job, ctx: Ctx, crawlId: string, settings: TestSettings) {
  const { data: crawlRow } = await ctx.db.from("crawls").select("url, data").eq("id", crawlId).single();
  const analysis = crawlRow?.data as AppAnalysis | undefined;
  if (!analysis || !settings.app) throw new Error(`app analysis ${crawlId} has no data`);

  let lastSave = 0;
  let lastStage = "";
  let pending: Promise<unknown> = Promise.resolve();
  const saveProgress = (run: AppRun) => {
    const t = Date.now();
    if (run.stage === lastStage && t - lastSave < 1000) return;
    lastSave = t;
    lastStage = run.stage;
    const update = { status: "running", stage: run.stage, progress: { done: run.progress.done, total: run.progress.total }, updated_at: now() };
    pending = pending.then(() => ctx.db.from("tests").update(update).eq("id", job.ref_id));
  };

  const run = await runAppTest(
    {
      id: job.ref_id,
      userId: job.user_id,
      crawlId,
      url: crawlRow!.url,
      screensPrefix: analysis.filesPrefix,
      settings: settings.app,
      profile: settings.profile,
      audience: settings.audience,
      perSample: settings.count ?? 100,
    },
    { store: ctx.store, onChange: saveProgress },
  );
  await pending;
  if (run.error) ctx.log("app test error", { test: job.ref_id, error: run.error });
  // The headline is the middle sample: "X of 100 would start a trial".
  const middle = run.stats ? [...run.stats.converts].sort((a, b) => a - b)[Math.floor((run.stats.converts.length - 1) / 2)] : null;
  const { error: saveError } = await ctx.db
    .from("tests")
    .update({
      status: run.status,
      stage: run.stage,
      error: run.error ? "Something went wrong on our side while running this test. It didn't use up your plan; please try again." : null,
      score: middle,
      total: run.stats?.perSample ?? settings.count ?? 100,
      cost_usd: run.totalCostUsd ?? null,
      progress: null,
      data: run,
      updated_at: now(),
    })
    .eq("id", job.ref_id);
  if (saveError) throw new Error(`couldn't save test: ${saveError.message}`);
  ctx.log("app test finished", { test: job.ref_id, status: run.status, score: middle, costUsd: run.totalCostUsd });
}

// When a job can't be finished: tell the user on their crawl / test.
// Messages written for users (like "Couldn't open that site...") are kept;
// anything technical is replaced with a friendly one.
export async function markFailed(job: Job, ctx: Ctx, message: string) {
  const table = job.kind === "run" ? "tests" : "crawls";
  const friendly = /^Couldn't open that site/.test(message)
    ? message
    : job.kind === "run"
      ? "Something went wrong on our side while running this test. It didn't use up your plan; please try again."
      : "Something went wrong while reading that site. Please try again.";
  await ctx.db.from(table).update({ status: "error", error: friendly, updated_at: now() }).eq("id", job.ref_id);
}

const now = () => new Date().toISOString();
