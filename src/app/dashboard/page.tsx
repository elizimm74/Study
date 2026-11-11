// /dashboard: the signed-in home. Recent analyses (with trends), your next best moves, your saved
// customer minds, what's working for apps and high conversion, and your invite progress.
// This file only LOADS the data (as you: Row Level Security keeps it yours); DashboardView shows it.
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import { SITE_URL } from "@/lib/config";
import DashboardView from "@/components/dashboard/DashboardView";
import { analyses, fixQueue, nextMoves, recurringBlockers, type DashboardData, type PlanData, type TestRow, type Trends } from "@/lib/dashboard";

export const metadata = { title: "crawler: dashboard", robots: { index: false } };

export default async function Dashboard() {
  if (!AUTH_ENABLED) {
    return (
      <div className="paper mx-auto max-w-3xl px-6 py-12 sm:px-10">
        <h1 className="t-h1">Dashboard</h1>
        <p className="card mt-8 p-6 text-muted">Accounts are switched off, so there is no dashboard yet.</p>
      </div>
    );
  }
  const user = await currentUser();
  const supabase = await supabaseServer();

  const [testsRes, mindsRes, planRes, trendsRes] = await Promise.all([
    // Only the small parts of each test the dashboard needs (not the whole saved report).
    supabase
      .from("tests")
      .select("id, url, goal, status, score, total, created_at, kind:data->>kind, objections:data->stats->objections, fixes:data->advice->fixes")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("saved_audiences").select("id, name, audience, updated_at").order("updated_at", { ascending: false }),
    supabase.rpc("my_plan"),
    supabase.rpc("crawler_trends"),
  ]);

  const rows = (testsRes.data ?? []) as unknown as TestRow[];
  const raw = planRes.data as (Omit<PlanData, "inviteLink"> & { referrals: PlanData["referrals"] }) | null;
  const plan: PlanData = raw
    ? { ...raw, inviteLink: `${SITE_URL}/r/${raw.referrals.code}` }
    : { plan: "free", unlimited: false, customers: 25, used: 0, limit: 1, left: 1, inviteLink: SITE_URL, referrals: { count: 0, needed: 3, code: "" } };

  const blockers = recurringBlockers(rows);
  const meta = user?.user_metadata ?? {};
  const first = String(meta.full_name ?? meta.name ?? "").trim().split(" ")[0];
  const email = user?.email ?? "";
  // Apple's "hide my email" addresses look like random text, so don't greet people with those.
  const name = first || (email && !email.endsWith("privaterelay.appleid.com") ? email.split("@")[0] : "there");

  const data: DashboardData = {
    name,
    analyses: analyses(rows),
    blockers,
    fixes: fixQueue(rows),
    moves: nextMoves(blockers),
    minds: (mindsRes.data ?? []) as DashboardData["minds"],
    plan,
    trends: (trendsRes.data as Trends | null) ?? null,
  };
  return <DashboardView data={data} />;
}
