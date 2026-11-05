// Small helpers shared by the web API routes.
import { NextResponse } from "next/server";
import { supabaseServer } from "./server";
import { AUTH_ENABLED } from "./config";

// The signed-in user + a database connection acting as them (RLS applies).
// Returns a ready-made error response if accounts are off or nobody's signed in.
export async function requireUser() {
  if (!AUTH_ENABLED) {
    return { error: NextResponse.json({ error: "Accounts aren't set up yet (Supabase keys missing)." }, { status: 503 }) };
  }
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Please sign in first." }, { status: 401 }) };
  return { supabase, user };
}

export const jsonError = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
