// /onboarding: shown once, right after sign-up. 3 questions, then the first test.
// If this account already finished onboarding, skip straight to where they were going.
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import Onboarding from "@/components/Onboarding";

export const metadata = { title: "crawler: welcome" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; kind?: string; mind?: string; preset?: string }> }) {
  const { next, kind, mind, preset } = await searchParams;
  // Only allow going back to pages on OUR site.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";

  const user = await currentUser();
  if (user?.user_metadata?.onboarded) redirect(safeNext);

  // Came from the landing page's URL box (next = /app?url=...)? Pre-fill that URL.
  const startUrl = new URL(safeNext, "http://x").searchParams.get("url") ?? "";
  return <Onboarding startUrl={startUrl} startKind={kind === "app" ? "app" : "website"} mind={mind && /^[0-9a-f-]{36}$/.test(mind) ? mind : undefined} preset={preset?.slice(0, 40)} />;
}
