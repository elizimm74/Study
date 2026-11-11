// GET /auth/callback?code=...&next=/app
// Where email-confirmation links and "Continue with Google / Apple" send people back.
// Swaps the one-time code for a real sign-in, then continues to `next`.
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  // Google or Apple sent the person back with an error (e.g. they pressed "Cancel").
  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (providerError) {
    const msg = /denied|cancel/i.test(providerError) ? "Sign-in was cancelled." : `Sign-in didn't work: ${providerError}`;
    return NextResponse.redirect(new URL(`/signin?error=${encodeURIComponent(msg)}`, url.origin));
  }

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/signin?error=That+sign-in+link+didn't+work.+Try+again.", url.origin));
}
