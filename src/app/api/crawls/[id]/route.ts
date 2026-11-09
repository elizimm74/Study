// GET /api/crawls/:id -> { status, error?, crawl?, profile?, audience? }
// Row Level Security: you only ever get your own crawls.
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { fileUrl } from "@/lib/urls";
import type { CrawlData } from "@/worker/jobs";
import type { AppAnalysis } from "@/lib/app/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  const { data: row } = await auth.supabase.from("crawls").select("status, error, data").eq("id", id).maybeSingle();
  if (!row) return jsonError("Analysis not found.", 404);
  if (row.status !== "done") return NextResponse.json({ status: row.status, error: row.error });

  // App test: the labeled screens + paywall facts, with links to the images.
  if ((row.data as { kind?: string }).kind === "app") {
    const a = row.data as AppAnalysis;
    const withImage = (s: AppAnalysis["screens"][number]) => ({ ...s, image: fileUrl(a.filesPrefix, s.file) });
    return NextResponse.json({
      status: "done",
      kind: "app",
      id,
      screens: a.screens.map(withImage),
      screensB: a.screensB.map(withImage),
      paywall: a.paywall,
      paywallB: a.paywallB,
      profile: a.profile,
      audience: a.audience,
      suggestError: a.suggestError,
    });
  }
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
