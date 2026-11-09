// Runs one APP test from start to finish (the worker calls this):
//   rule checks (code) -> customers (code, 3 samples) -> walk the flow (Haiku)
//   -> count (code) -> fixes + copy (Sonnet)
import { logRunCost } from "../cost";
import type { BlobStore } from "../blobs";
import type { Audience, CallCost, ProductProfile } from "../types";
import { checkPaywall } from "./checks";
import { generateAppPersonas, SAMPLES } from "./personas";
import { evaluateApp } from "./evaluate";
import { aggregateApp, type AppStats } from "./aggregate";
import { writeAppAdvice, type AppAdvice } from "./report";
import type { AppPersona, AppSettings, AppVerdict, RuleCheck } from "./types";

export type AppRun = {
  kind: "app";
  id: string;
  userId?: string;
  crawlId: string;
  url: string; // "app://{batch}"
  createdAt: string;
  profile: ProductProfile;
  audience: Audience;
  settings: AppSettings;
  screensPrefix: string; // where the screenshots are, "{userId}/uploads/{batch}"
  seed: number;
  status: "running" | "done" | "error";
  stage: string;
  progress: { done: number; total: number };
  error?: string;
  checks: RuleCheck[];
  checksB: RuleCheck[] | null;
  personas: AppPersona[];
  verdicts: AppVerdict[];
  stats?: AppStats;
  advice?: AppAdvice;
  costs: CallCost[];
  totalCostUsd?: number;
};

export type AppRunInput = {
  id: string;
  userId?: string;
  crawlId: string;
  url: string;
  screensPrefix: string;
  settings: AppSettings;
  profile: ProductProfile;
  audience: Audience;
  perSample: number;
  seed?: number;
};

export async function runAppTest(
  input: AppRunInput,
  hooks: { store: BlobStore; onChange: (run: AppRun) => void },
): Promise<AppRun> {
  const seed = input.seed ?? Math.floor(Math.random() * 1e9);
  const personas = generateAppPersonas(input.audience, input.settings, input.perSample, seed);
  const run: AppRun = {
    kind: "app",
    id: input.id,
    userId: input.userId,
    crawlId: input.crawlId,
    url: input.url,
    createdAt: new Date().toISOString(),
    profile: input.profile,
    audience: input.audience,
    settings: input.settings,
    screensPrefix: input.screensPrefix,
    seed,
    status: "running",
    stage: "Customers are going through your app",
    progress: { done: 0, total: personas.length },
    checks: checkPaywall(input.settings.paywall),
    checksB: input.settings.paywallB ? checkPaywall(input.settings.paywallB) : null,
    personas,
    verdicts: [],
    costs: [],
  };
  const changed = () => hooks.onChange(run);
  changed();

  try {
    const { verdicts, costs } = await evaluateApp({
      settings: input.settings,
      profile: input.profile,
      personas,
      store: hooks.store,
      screensPrefix: input.screensPrefix,
      onProgress: (done, total) => {
        run.progress = { done, total };
        changed();
      },
    });
    run.verdicts = verdicts;
    run.costs.push(...costs);

    run.stage = "Crunching the numbers";
    run.stats = aggregateApp(input.settings.screens, personas, verdicts, SAMPLES);

    run.stage = "Writing your fixes";
    changed();
    const { advice, cost } = await writeAppAdvice(input.settings, input.profile, run.stats, run.checks);
    run.advice = advice;
    run.costs.push(cost);

    run.totalCostUsd = logRunCost(run.id, run.costs);
    run.status = "done";
    run.stage = "Done";
  } catch (err) {
    run.status = "error";
    run.error = (err as Error).message;
    console.error(`[app run ${run.id}] failed:`, err);
    if (run.costs.length) run.totalCostUsd = logRunCost(run.id, run.costs);
  }
  return run;
}
