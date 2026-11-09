// GET  /api/tests/:id/messages           -> { messages, remaining }   (remaining: null = unlimited)
// POST /api/tests/:id/messages { content } -> { answer, needsRerun, remaining }
// The free-question limit is enforced by the database (ask_test), not here.
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { answerAboutTest, buildContext, FREE_MESSAGES, type ChatTurn } from "@/lib/chat";
import type { CrawlData } from "@/worker/jobs";

type Row = { id: number; role: "user" | "assistant"; content: string; needs_rerun: boolean };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  const { data: messages } = await auth.supabase
    .from("test_messages")
    .select("id, role, content, needs_rerun")
    .eq("test_id", id)
    .order("id");
  const { data: profile } = await auth.supabase.from("profiles").select("is_admin").eq("id", auth.user.id).maybeSingle();
  const asked = (messages ?? []).filter((m) => m.role === "user").length;
  return NextResponse.json({
    messages: (messages ?? []) as Row[],
    remaining: profile?.is_admin ? null : Math.max(0, FREE_MESSAGES - asked),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { content?: string };
  const content = (body.content ?? "").trim();
  if (!content) return jsonError("Please write a question.");

  // 1) Save the question. The database checks the owner, the length and the free limit.
  const { data: remaining, error } = await auth.supabase.rpc("ask_test", { p_test_id: id, p_content: content });
  if (error) {
    if (error.message.includes("CHAT_LIMIT")) {
      return NextResponse.json(
        { error: "You've used your 2 free questions for this test. More questions come with packs (coming soon).", limitReached: true },
        { status: 402 },
      );
    }
    return jsonError(error.message);
  }

  try {
    // 2) Load the saved test (RLS: only yours) and, for websites, what the crawler read.
    const { data: test } = await auth.supabase.from("tests").select("data, crawl_id").eq("id", id).single();
    const run = test?.data as Record<string, unknown> | null;
    if (!run) throw new Error("This test has no saved results.");
    let pages: { step: string; url: string; text: string }[] = [];
    if (run.kind !== "app" && test?.crawl_id) {
      const { data: crawl } = await auth.supabase.from("crawls").select("data").eq("id", test.crawl_id).maybeSingle();
      pages = ((crawl?.data as CrawlData | undefined)?.crawl.pages ?? []).map((p) => ({ step: p.step, url: p.url, text: p.text }));
    }

    // 3) Answer from the saved data, then save the answer.
    const { data: rows } = await auth.supabase.from("test_messages").select("role, content").eq("test_id", id).order("id");
    const history = (rows ?? []) as ChatTurn[]; // already includes the new question, last
    const { answer, needsRerun, cost } = await answerAboutTest(buildContext(run, pages), history);
    const { error: saveError } = await auth.supabase.rpc("answer_test", {
      p_test_id: id,
      p_content: answer,
      p_needs_rerun: needsRerun,
      p_cost: cost.usd,
    });
    if (saveError) throw new Error(saveError.message);
    return NextResponse.json({ answer, needsRerun, remaining });
  } catch (err) {
    // Our side failed: take the question back so it doesn't use up a free one.
    console.error(`[chat ${id}] failed:`, (err as Error).message);
    await auth.supabase.rpc("retract_test", { p_test_id: id });
    return jsonError("Couldn't answer that right now. It didn't use up a question. Please try again.", 500);
  }
}
