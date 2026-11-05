// Saves tests to the Supabase "tests" table, as the user who ran them.
// Row Level Security means this code can only ever touch THAT user's rows.
import { supabaseAsUser } from "./supabase/server";
import type { Run } from "./pipeline";

export type Owner = { userId: string; accessToken: string };

// When a run starts: a row with status "running" (this also counts toward the free limit).
export async function saveTestStarted(owner: Owner, run: Run) {
  const { error } = await supabaseAsUser(owner.accessToken).from("tests").insert({
    id: run.id,
    user_id: owner.userId,
    url: run.url,
    goal: run.profile.goal,
    status: "running",
    total: run.personas.length,
  });
  if (error) throw new Error(`Couldn't save the test: ${error.message}`);
}

// When a run finishes (or fails): the score and the whole report.
export async function saveTestFinished(owner: Owner, run: Run) {
  const { error } = await supabaseAsUser(owner.accessToken)
    .from("tests")
    .update({
      status: run.status,
      score: run.stats?.buy ?? null,
      total: run.stats?.total ?? run.personas.length,
      cost_usd: run.totalCostUsd ?? null,
      data: run,
      updated_at: new Date().toISOString(),
    })
    .eq("id", run.id);
  if (error) console.error(`[db] couldn't save results for ${run.id}:`, error.message);
}
