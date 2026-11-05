// POST /api/tests { crawlId, audience, profile, explore?, credentials?, ownsProduct? } -> { testId }
// Checks the input, encrypts any test-account login, then start_test()
// checks your plan's limit and queues the job, all in one transaction.
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { encryptJson } from "@/lib/crypto";
import { normalizeUrl } from "@/lib/urls";
import type { Audience, Credentials, ExploreSettings, ProductProfile } from "@/lib/types";

const PERSONA_COUNT = 100; // the Free plan's size

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = (await req.json().catch(() => null)) as {
    crawlId?: string;
    audience?: Audience;
    profile?: ProductProfile;
    explore?: ExploreSettings;
    credentials?: Credentials;
    ownsProduct?: boolean;
  } | null;
  if (!body?.crawlId || !body.audience || !body.profile) return jsonError("Missing the analysis, audience or product profile.");

  // "Try the product" settings.
  let explore: ExploreSettings | undefined;
  let secret: string | null = null;
  if (body.explore?.enabled) {
    const e = body.explore;
    if (!["public", "account", "preview"].includes(e.access)) return jsonError("Unknown access mode.");
    if (e.access !== "public" && !body.ownsProduct) {
      return jsonError("Test accounts and preview links are only for your own product. Please confirm it's yours.");
    }
    const startUrl = normalizeUrl(e.startUrl);
    if (e.access === "preview" && !startUrl) return jsonError("Please paste your preview link.");
    if (e.access === "account") {
      if (!body.credentials?.email || !body.credentials?.password) {
        return jsonError("Please enter the test account's email and password.");
      }
      try {
        // Encrypted before it touches the database; the worker erases it after reading.
        secret = encryptJson({ email: body.credentials.email, password: body.credentials.password });
      } catch (err) {
        return jsonError((err as Error).message, 500);
      }
    }
    explore = {
      enabled: true,
      task: (e.task || body.profile.tryTask || "Look around and try the main feature").slice(0, 300),
      access: e.access,
      startUrl: startUrl ?? "",
      reputation: Boolean(e.reputation),
    };
  }

  const settings = { profile: body.profile, audience: body.audience, explore, count: PERSONA_COUNT };
  const { data, error } = await auth.supabase.rpc("start_test", {
    p_crawl_id: body.crawlId,
    p_settings: settings,
    p_secret: secret,
  });
  if (error) {
    if (error.message.includes("LIMIT_REACHED")) {
      return NextResponse.json(
        { error: "You've used the tests in your plan. Paid plans are coming soon.", limitReached: true },
        { status: 402 },
      );
    }
    return jsonError(error.message);
  }
  return NextResponse.json({ testId: data as string });
}
