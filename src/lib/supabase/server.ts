// Supabase for code that runs on the SERVER (pages, API routes).
// It reads the visitor's sign-in from their cookies.
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { AUTH_ENABLED, SUPABASE_KEY, SUPABASE_URL } from "./config";

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        // Pages can't set cookies (only middleware and API routes can).
        // That's fine: the middleware keeps the sign-in fresh.
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {}
      },
    },
  });
}

// The signed-in user, or null. (Always null when accounts are switched off.)
export async function currentUser() {
  if (!AUTH_ENABLED) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// A Supabase connection that acts AS a specific user, using their sign-in
// token. Used by the background run so it can save results to that user's
// own row. Row Level Security still applies: it can only touch their rows.
export function supabaseAsUser(accessToken: string) {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
