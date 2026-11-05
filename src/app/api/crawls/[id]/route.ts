// GET /api/crawls/:id -> { status, error?, crawl?, profile?, audience? }
// Row Level Security: you only ever get your own crawls.
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { fileUrl } from "@/lib/urls";
import type { CrawlData } from "@/worker/jobs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  const { data: row } = await auth.supabase.from("crawls").select("status, error, data").eq("id", id).maybeSingle();
  if (!row) return jsonError("Analysis not found.", 404);
  if (row.status !== "done") return NextResponse.json({ status: row.status, error: row.error });

  const d = row.data as CrawlData;
  return NextResponse.json({
    status: "done",
    // Only what the page shows (not the full page text).
    crawl: {
      id,
      url: d.crawl.url,
      pages: d.crawl.pages.map((p) => ({
        step: p.step,
        url: p.url,
        title: p.title,
        note: p.note,
        screenshots: p.screenshotFiles.map((f) => fileUrl(d.crawl.filesPrefix, f)),
      })),
    },
    profile: d.profile,
    audience: d.audience,
    suggestError: d.suggestError,
  });
}
