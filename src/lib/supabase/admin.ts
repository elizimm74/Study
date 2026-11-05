// WORKER ONLY. A Supabase connection with the SECRET key, which skips Row
// Level Security. Never import this from the web app (pages, API routes,
// components). The web app only uses the public key + the visitor's sign-in.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

export function supabaseAdmin() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY is missing (worker only).");
  return createClient(SUPABASE_URL, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
