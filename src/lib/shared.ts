// Loads a PUBLIC scorecard by its random link token. The database function
// get_shared_test only returns headline numbers (see migration 0005).
import { supabaseServer } from "./supabase/server";
import { AUTH_ENABLED } from "./supabase/config";
import type { Shared } from "./scorecard";

export async function getShared(token: string): Promise<Shared | null> {
  if (!AUTH_ENABLED || !/^[a-f0-9]{16,40}$/.test(token)) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("get_shared_test", { p_token: token });
  return (data as Shared | null) ?? null;
}
