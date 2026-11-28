// THE WORKER: a long-running program that does the slow work (crawling,
// trying products, AI calls). Run as many copies as you need; the database
// queue gives each one different jobs.
//
//   npm run worker:dev      (on your computer, reads .env.local)
//   npm run worker          (in production, e.g. the Docker image)
import { anthropic, apiKeyHint } from "../lib/ai";
import os from "os";
import { checkWorkerEnv } from "../lib/env";
import { supabaseAdmin } from "../lib/supabase/admin";
import { SupabaseBlobStore } from "../lib/blobs";
import { analyzeJob, markFailed, runJob, type Ctx, type Job } from "./jobs";
import { startPulse } from "./pulse";
import { calibrateJob } from "./calibrate";

const HEARTBEAT_MS = 30_000;
const { concurrency, pollMs } = checkWorkerEnv();
const workerId = `${os.hostname()}-${process.pid}`;
const db = supabaseAdmin();
const ctx: Ctx = {
  db,
  store: new SupabaseBlobStore(db),
  // One JSON line per event: easy to search in any hosting provider's logs.
  log: (msg, extra = {}) => console.log(JSON.stringify({ t: new Date().toISOString(), worker: workerId, msg, ...extra })),
};

let stopping = false;
const running = new Set<Promise<void>>();

async function claim(): Promise<Job | null> {
  const { data, error } = await db.rpc("claim_job_kinds", { p_worker: workerId, p_kinds: ["analyze", "run", "calibrate"] }).then(
    (r) => r,
    (err: Error) => ({ data: null, error: err }), // a network blip: try again on the next poll
  );
  if (error) {
    ctx.log("claim failed", { error: error.message });
    return null;
  }
  return (data as Job[] | null)?.[0] ?? null;
}

async function handle(job: Job) {
  const started = Date.now();
  ctx.log("job started", { job: job.id, kind: job.kind, ref: job.ref_id, attempt: job.attempts });
  // "Still alive": if this worker dies, another one picks the job up later.
  // NOTE: Supabase requests only SEND when awaited / .then()-ed, so a bare `void db.rpc(...)` does nothing.
  const beat = setInterval(() => {
    db.rpc("heartbeat_job", { p_id: job.id }).then(({ error }) => error && ctx.log("heartbeat failed", { job: job.id, error: error.message }));
  }, HEARTBEAT_MS);
  try {
    if (job.kind === "analyze") await analyzeJob(job, ctx);
    else if (job.kind === "calibrate") await calibrateJob(job, ctx);
    else await runJob(job, ctx);
    await db.from("jobs").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", job.id);
    ctx.log("job done", { job: job.id, seconds: Math.round((Date.now() - started) / 1000) });
  } catch (err) {
    const message = (err as Error).message;
    // Analyses are cheap: try once more. Tests cost money: don't auto-repeat.
    const retry = (job.kind === "analyze" || job.kind === "calibrate") && job.attempts < job.max_attempts;
    await db
      .from("jobs")
      .update({ status: retry ? "queued" : "error", last_error: message.slice(0, 500), updated_at: new Date().toISOString() })
      .eq("id", job.id);
    if (!retry && job.kind !== "calibrate") await markFailed(job, ctx, message);
    ctx.log("job failed", { job: job.id, retry, error: message });
  } finally {
    clearInterval(beat);
  }
}

// Each "slot" works on one job at a time; `concurrency` slots run side by side.
// A slot must NEVER die: any surprise error is logged and the loop carries on after a short pause.
async function slot() {
  while (!stopping) {
    try {
      const job = await claim();
      if (!job) {
        await new Promise((r) => setTimeout(r, pollMs));
        continue;
      }
      const p = handle(job);
      running.add(p);
      await p.finally(() => running.delete(p));
    } catch (err) {
      ctx.log("slot error (continuing)", { error: (err as Error).message });
      await new Promise((r) => setTimeout(r, 5_000));
    }
  }
}

// Last line of defence: log instead of crashing the whole worker (Node exits on these by default).
process.on("unhandledRejection", (err) => ctx.log("unhandled rejection (continuing)", { error: String((err as Error)?.message ?? err) }));
process.on("uncaughtException", (err) => ctx.log("uncaught exception (continuing)", { error: err.message }));
// Every 5 minutes: "still alive" + memory use, so a crash from running out of memory shows up in the logs.
setInterval(() => ctx.log("alive", { rssMb: Math.round(process.memoryUsage().rss / 1e6), running: running.size }), 300_000).unref();

// Clean shutdown (hosts send SIGTERM before restarting): stop taking new jobs
// and let current ones finish. Jobs cut off anyway get retried by another worker.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, async () => {
    if (stopping) process.exit(1);
    stopping = true;
    ctx.log("stopping: finishing current jobs", { inFlight: running.size });
    await Promise.race([Promise.all(running), new Promise((r) => setTimeout(r, 25_000))]);
    process.exit(0);
  });
}

ctx.log("worker started", { concurrency, pollMs, anthropicKey: apiKeyHint() });
// Check the Anthropic key once at start (a free call, no AI tokens used), so a wrong key shows up
// in the Railway logs right away instead of as a failed test.
anthropic.models
  .list({ limit: 1 })
  .then(() => ctx.log("anthropic key OK"))
  .catch((err: Error) => ctx.log("ANTHROPIC KEY REJECTED: paste a new key into ANTHROPIC_API_KEY and redeploy", { key: apiKeyHint(), error: err.message.slice(0, 200) }));
startPulse(db, ctx.log); // Slack alerts + daily report for the founder (only if SLACK_WEBHOOK_URL is set)
for (let i = 0; i < concurrency; i++) void slot();
