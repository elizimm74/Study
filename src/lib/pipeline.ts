// Runs one test from start to finish:
//   [explorer tries the product + reputation search]  (optional, at the same time)
//   -> personas (code) -> evaluate (Haiku) -> aggregate (code) -> advice (Sonnet)
//
// It's a plain function with no global state: the WORKER calls it, and saves
// progress to the database through `onChange`. Any worker on any machine can
// run any test.
import { generatePersonas } from "./personas";
import { evaluatePersonas } from "./evaluate";
import { aggregate, type Stats } from "./aggregate";
import { writeAdvice, type Advice } from "./report";
import { exploreProduct } from "./explore";
import { checkReputation } from "./reputation";
import { logRunCost } from "./cost";
import type { BlobStore } from "./blobs";
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
  userId?: string;
  crawlId: string;
  url: string;
  createdAt: string;
  profile: ProductProfile;
  audience: Audience;
  explore?: ExploreSettings; // never includes the test-account details
  seed: number;
  status: "queued" | "running" | "done" | "error";
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

export type RunInput = {
  id: string;
  userId?: string;
  crawl: Crawl;
  profile: ProductProfile;
  audience: Audience;
  count: number;
  explore?: ExploreSettings;
  credentials?: Credentials | null; // kept in memory only, never in the Run
  seed?: number; // same seed = same personas (for before/after re-runs later)
};

export type RunHooks = {
  store: BlobStore; // where screenshots are read from and written to
  testPrefix: string; // this test's folder in the store, e.g. "{userId}/tests/{id}"
  onChange: (run: Run) => void; // called whenever stage / progress / journey changes
};

export async function runTest(input: RunInput, hooks: RunHooks): Promise<Run> {
  const seed = input.seed ?? Math.floor(Math.random() * 1e9);
  const run: Run = {
    id: input.id,
    userId: input.userId,
    crawlId: input.crawl.id,
    url: input.crawl.url,
    createdAt: new Date().toISOString(),
    profile: input.profile,
    audience: input.audience,
    explore: input.explore?.enabled ? input.explore : undefined,
    seed,
    status: "running",
    stage: "Creating personas",
    progress: { done: 0, total: input.count },
    personas: generatePersonas(input.audience, input.count, seed),
    verdicts: [],
    costs: [],
  };
  const changed = () => hooks.onChange(run);
  changed();

  try {
    // 1) Optional: try the product and check reviews AT THE SAME TIME (faster).
    if (run.explore) {
      run.stage = "The explorer is trying your product";
      changed();
      const settings = run.explore;
      const [explored, rep] = await Promise.all([
        settings.task.trim()
          ? exploreProduct({ store: hooks.store, prefix: hooks.testPrefix }, settings, input.credentials ?? null, (j) => {
              run.journey = { ...j, steps: [...j.steps] }; // copy, for the live view
              changed();
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
    changed();
    const { verdicts, costs } = await evaluatePersonas(
      input.crawl,
      run.profile,
      run.personas,
      (done, total) => {
        run.progress = { done, total };
        changed();
      },
      { store: hooks.store, testPrefix: hooks.testPrefix, journey: run.journey, reputation: run.reputation ?? undefined },
    );
    run.verdicts = verdicts;
    run.costs.push(...costs);

    run.stage = "Crunching the numbers";
    run.stats = aggregate(run.audience, run.personas, verdicts, Boolean(run.journey?.steps.length));

    run.stage = "Writing your fixes";
    changed();
    const { advice, cost } = await writeAdvice(input.crawl, run.profile, run.stats, run.journey, run.reputation ?? undefined);
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
  }
  return run;
}
