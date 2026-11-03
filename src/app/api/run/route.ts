// POST /api/run  { crawlId, audience }  ->  { runId }
import { NextResponse } from "next/server";
import { loadJson } from "@/lib/storage";
import { startRun } from "@/lib/pipeline";
import { requireApiKey } from "@/lib/ai";
import type { Audience, Crawl, ProductProfile } from "@/lib/types";

export const runtime = "nodejs";

const PERSONA_COUNT = 100; // Milestone 1: free-tier size

export async function POST(req: Request) {
  const { crawlId, audience, profile } = (await req.json()) as {
    crawlId: string;
    audience: Audience;
    profile: ProductProfile; // possibly edited by the founder
  };
  const crawl = await loadJson<Crawl>("crawls", crawlId);
  if (!crawl) return NextResponse.json({ error: "Crawl not found. Analyze the URL again." }, { status: 404 });
  if (!audience || !profile) return NextResponse.json({ error: "Missing audience or product profile." }, { status: 400 });
  try {
    requireApiKey();
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const runId = startRun(crawl, profile, audience, PERSONA_COUNT);
  return NextResponse.json({ runId });
}
