// POST /auth/signout: signs out, then goes to the landing page.
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";

export async function POST(request: Request) {
  if (AUTH_ENABLED) await (await supabaseServer()).auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
