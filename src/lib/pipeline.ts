// Runs the whole engine in order and keeps track of progress.
//   personas (code) -> evaluate (Haiku) -> aggregate (code) -> advice (Sonnet)
import { generatePersonas } from "./personas";
import { evaluatePersonas } from "./evaluate";
import { aggregate, type Stats } from "./aggregate";
import { writeAdvice, type Advice } from "./report";
import { logRunCost } from "./cost";
import { loadJson, newId, saveJson } from "./storage";
import type { Audience, CallCost, Crawl, Persona, Verdict } from "./types";

export type Run = {
  id: string;
  crawlId: string;
  url: string;
  createdAt: string;
  audience: Audience;
  seed: number;
  status: "running" | "done" | "error";
  stage: string; // human-readable, shown on the progress screen
  progress: { done: number; total: number };
  error?: string;
  personas: Persona[];
  verdicts: Verdict[];
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
export function startRun(crawl: Crawl, audience: Audience, count: number): string {
  const seed = Math.floor(Math.random() * 1e9);
  const run: Run = {
    id: newId(),
    crawlId: crawl.id,
    url: crawl.url,
    createdAt: new Date().toISOString(),
    audience,
    seed,
    status: "running",
    stage: "Creating personas",
    progress: { done: 0, total: count },
    personas: generatePersonas(audience, count, seed),
    verdicts: [],
    costs: [],
  };
  liveRuns.set(run.id, run);
  void execute(run, crawl); // "void" = start it, don't wait for it
  return run.id;
}

async function execute(run: Run, crawl: Crawl) {
  try {
    run.stage = "Personas are reviewing your site";
    const { verdicts, costs } = await evaluatePersonas(crawl, run.personas, (done, total) => {
      run.progress = { done, total };
    });
    run.verdicts = verdicts;
    run.costs.push(...costs);

    run.stage = "Crunching the numbers";
    run.stats = aggregate(run.audience, run.personas, verdicts);

    run.stage = "Writing your fixes";
    const { advice, cost } = await writeAdvice(crawl, run.stats);
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
    liveRuns.delete(run.id);
  }
}
