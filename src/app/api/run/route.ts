// POST /api/run  { crawlId, audience, profile, explore?, credentials? }  ->  { runId }
import { NextResponse } from "next/server";
import { loadJson } from "@/lib/storage";
import { startRun } from "@/lib/pipeline";
import { requireApiKey } from "@/lib/ai";
import { supabaseServer } from "@/lib/supabase/server";
import { AUTH_ENABLED, FREE_TESTS, isAdmin } from "@/lib/supabase/config";
import type { Owner } from "@/lib/db";
import type { Audience, Crawl, Credentials, ExploreSettings, ProductProfile } from "@/lib/types";

export const runtime = "nodejs";

const PERSONA_COUNT = 100; // Milestone 1: free-tier size

export async function POST(req: Request) {
  const body = (await req.json()) as {
    crawlId: string;
    audience: Audience;
    profile: ProductProfile; // possibly edited by the founder
    explore?: ExploreSettings;
    credentials?: Credentials; // test account: used in memory for this run only
    ownsProduct?: boolean; // founder confirmed it's their own product
  };
  const { crawlId, audience, profile } = body;
  const crawl = await loadJson<Crawl>("crawls", crawlId);
  if (!crawl) return NextResponse.json({ error: "Crawl not found. Analyze the URL again." }, { status: 404 });
  if (!audience || !profile) return NextResponse.json({ error: "Missing audience or product profile." }, { status: 400 });
  try {
    requireApiKey();
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  // Check the "try the product" settings.
  let explore: ExploreSettings | undefined;
  let credentials: Credentials | null = null;
  if (body.explore?.enabled) {
    const e = body.explore;
    const startUrl = cleanUrl(e.startUrl) ?? crawl.url;
    if (!["public", "account", "preview"].includes(e.access)) {
      return NextResponse.json({ error: "Unknown access mode." }, { status: 400 });
    }
    if (e.access !== "public" && !body.ownsProduct) {
      return NextResponse.json(
        { error: "Test accounts and preview links are only for your own product. Please confirm it's yours." },
        { status: 400 },
      );
    }
    if (e.access === "preview" && !cleanUrl(e.startUrl)) {
      return NextResponse.json({ error: "Please paste your preview link." }, { status: 400 });
    }
    if (e.access === "account") {
      if (!body.credentials?.email || !body.credentials?.password) {
        return NextResponse.json({ error: "Please enter the test account's email and password." }, { status: 400 });
      }
      credentials = { email: body.credentials.email, password: body.credentials.password };
    }
    explore = {
      enabled: true,
      task: (e.task || profile.tryTask || "Look around and try the main feature").slice(0, 300),
      access: e.access,
      startUrl,
      reputation: Boolean(e.reputation),
    };
  }

  // Accounts on: who is this, and do they have a free test left?
  let owner: Owner | undefined;
  if (AUTH_ENABLED) {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!user || !session) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

    if (!isAdmin(user.email)) {
      // Count this user's tests (Row Level Security: only their own rows are visible).
      const { count, error } = await supabase.from("tests").select("id", { count: "exact", head: true });
      if (error) return NextResponse.json({ error: `Couldn't check your tests: ${error.message}` }, { status: 500 });
      if ((count ?? 0) >= FREE_TESTS) {
        return NextResponse.json(
          {
            error: `You've used your ${FREE_TESTS === 1 ? "free test" : `${FREE_TESTS} free tests`}. Paid plans are coming soon.`,
            limitReached: true,
          },
          { status: 402 },
        );
      }
    }
    owner = { userId: user.id, accessToken: session.access_token };
  }

  // Only `explore` (without the account details) goes into the saved run.
  try {
    const runId = await startRun(crawl, profile, audience, PERSONA_COUNT, explore, credentials, owner);
    return NextResponse.json({ runId });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

function cleanUrl(input?: string) {
  if (!input?.trim()) return null;
  const raw = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
  try {
    const u = new URL(raw);
    return u.hostname.includes(".") || u.hostname === "localhost" ? u.toString() : null;
  } catch {
    return null;
  }
}
