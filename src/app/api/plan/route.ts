// GET /api/plan -> { customers, left, limit, unlimited, used, plan, referrals: { count, needed, code } }
// How many simulated customers your next test gets, how many tests are left, and your invite progress.
// (The database decides all of this; the browser only displays it.)
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { SITE_URL } from "@/lib/config";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { data, error } = await auth.supabase.rpc("my_plan");
  if (error) return jsonError(error.message, 500);
  const p = data as { referrals: { code: string } };
  return NextResponse.json({ ...p, inviteLink: `${SITE_URL}/r/${p.referrals.code}` });
}
