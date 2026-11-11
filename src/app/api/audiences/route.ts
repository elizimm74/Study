// GET  /api/audiences                 -> { audiences: [{ id, name, audience, updated_at }] }
// POST /api/audiences { name, audience } -> { id }
// "Customer minds": audiences a person builds once and reuses in tests.
// Row Level Security keeps each person's list private; the database also caps it at 20.
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { cleanAudience, mindProblem } from "@/lib/audience";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { data, error } = await auth.supabase
    .from("saved_audiences")
    .select("id, name, audience, updated_at")
    .order("updated_at", { ascending: false });
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ audiences: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = (await req.json().catch(() => ({}))) as { name?: string; audience?: unknown };
  const name = (body.name ?? "").trim().slice(0, 60);
  if (!name) return jsonError("Give your customer mind a name.");
  const audience = cleanAudience(body.audience);
  if (!audience) return jsonError("That audience wasn't understood.");
  const problem = mindProblem(audience);
  if (problem) return jsonError(problem);
  const { data, error } = await auth.supabase
    .from("saved_audiences")
    .insert({ user_id: auth.user.id, name, audience })
    .select("id")
    .single();
  if (error) return jsonError(error.code === "23505" ? "You already have a mind with that name." : error.message);
  return NextResponse.json({ id: data.id });
}
