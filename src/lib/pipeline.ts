// Runs the whole engine in order and keeps track of progress.
//   [explorer tries the product + reputation search]  (optional, at the same time)
//   -> personas (code) -> evaluate (Haiku) -> aggregate (code) -> advice (Sonnet)
import { generatePersonas } from "./personas";
import { evaluatePersonas } from "./evaluate";
import { aggregate, type Stats } from "./aggregate";
import { writeAdvice, type Advice } from "./report";
import { exploreProduct } from "./explore";
import { checkReputation } from "./reputation";
import { logRunCost } from "./cost";
import { loadJson, newId, saveJson } from "./storage";
import { saveTestFinished, saveTestStarted, type Owner } from "./db";
import type {
  Audience,
  CallCost,
  Crawl,
  Credentials,
  ExploreSettings,
  Journey,
  Persona,
  ProductProfile,
  Reputation,
  Verdict,
} from "./types";

export type Run = {
  id: string;
  userId?: string; // who ran it (when accounts are on)
  crawlId: string;
  url: string;
  createdAt: string;
  profile: ProductProfile;
  audience: Audience;
  explore?: ExploreSettings; // never includes the test account details
  seed: number;
  status: "running" | "done" | "error";
  stage: string; // human-readable, shown on the progress screen
  progress: { done: number; total: number };
  error?: string;
  personas: Persona[];
  verdicts: Verdict[];
  journey?: Journey; // what the explorer did inside the product
  reputation?: Reputation | null;
  stats?: Stats;
  advice?: Advice;
  costs: CallCost[];
  totalCostUsd?: number;
};

// Runs in progress live in memory. `globalThis` keeps them alive when the
// dev server reloads code after you save a file.
const g = globalThis as unknown as { __runs?: Map<string, Run> };
const liveRuns = (g.__runs ??= new Map<string, Run>());

export async function getRun(id: string): Promise<Run | null> {
  return liveRuns.get(id) ?? (await loadJson<Run>("runs", id));
}

// Starts a run and returns its id right away; the work continues in the
// background while the browser checks progress every second.
export async function startRun(
  crawl: Crawl,
  profile: ProductProfile,
  audience: Audience,
  count: number,
  explore?: ExploreSettings,
  credentials: Credentials | null = null, // passed along in memory only
  owner?: Owner, // the signed-in user (accounts on); results are saved to their account
): Promise<string> {
  const seed = Math.floor(Math.random() * 1e9);
  const run: Run = {
    id: newId(),
    userId: owner?.userId,
    crawlId: crawl.id,
    url: crawl.url,
    createdAt: new Date().toISOString(),
    profile,
    audience,
    explore: explore?.enabled ? explore : undefined,
    seed,
    status: "running",
    stage: "Creating personas",
    progress: { done: 0, total: count },
    personas: generatePersonas(audience, count, seed),
    verdicts: [],
    costs: [],
  };
  // Save the "running" row first, so it counts toward the free limit right away.
  if (owner) await saveTestStarted(owner, run);
  liveRuns.set(run.id, run);
  void execute(run, crawl, credentials, owner); // "void" = start it, don't wait for it
  return run.id;
}

async function execute(run: Run, crawl: Crawl, credentials: Credentials | null, owner?: Owner) {
  try {
    // 1) Optional: try the product and check reviews AT THE SAME TIME (faster).
    if (run.explore) {
      run.stage = "The explorer is trying your product";
      const settings = run.explore;
      const [explored, rep] = await Promise.all([
        settings.task.trim()
          ? exploreProduct(run.id, settings, credentials, (j) => {
              run.journey = { ...j, steps: [...j.steps] }; // copy, for the live view
            })
          : Promise.resolve(null),
        settings.reputation ? checkReputation(run.url, run.profile) : Promise.resolve(null),
      ]);
      if (explored) {
        run.journey = explored.journey;
        run.costs.push(...explored.costs);
      }
      if (rep) {
        run.reputation = rep.reputation;
        run.costs.push(...rep.costs);
      }
    }

    // 2) Personas review everything they'd see.
    run.stage = "Personas are reviewing your site";
    const { verdicts, costs } = await evaluatePersonas(
      crawl,
      run.profile,
      run.personas,
      (done, total) => {
        run.progress = { done, total };
      },
      { runId: run.id, journey: run.journey, reputation: run.reputation ?? undefined },
    );
    run.verdicts = verdicts;
    run.costs.push(...costs);

    run.stage = "Crunching the numbers";
    run.stats = aggregate(run.audience, run.personas, verdicts, Boolean(run.journey?.steps.length));

    run.stage = "Writing your fixes";
    const { advice, cost } = await writeAdvice(crawl, run.profile, run.stats, run.journey, run.reputation ?? undefined);
    run.advice = advice;
    run.costs.push(cost);

    run.totalCostUsd = logRunCost(run.id, run.costs);
    run.status = "done";
    run.stage = "Done";
  } catch (err) {
    run.status = "error";
    run.error = (err as Error).message;
    console.error(`[run ${run.id}] failed:`, err);
    if (run.costs.length) run.totalCostUsd = logRunCost(run.id, run.costs);
  } finally {
    await saveJson("runs", run.id, run);
    if (owner) await saveTestFinished(owner, run);
    liveRuns.delete(run.id);
  }
}
