// Supabase for code that runs in the BROWSER (sign-in and sign-up forms).
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

export function supabaseBrowser() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
