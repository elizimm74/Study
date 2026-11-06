// /tests: "My tests", every test this account has run, newest first.
// Row Level Security means this list can only ever contain YOUR tests.
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";

type Row = { id: string; url: string; goal: string | null; status: string; score: number | null; total: number | null; created_at: string };

export default async function MyTests() {
  if (!AUTH_ENABLED) {
    return <p className="rounded-2xl bg-slate-100 p-5 text-slate-600">Accounts are switched off, so tests aren&apos;t saved to an account.</p>;
  }
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("tests")
    .select("id, url, goal, status, score, total, created_at")
    .order("created_at", { ascending: false });
  const tests = (data ?? []) as Row[];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-900 pb-3">
        <h1 className="display text-6xl">My tests</h1>
        <Link href="/app" className="btn px-6 py-3">
          New test ↗
        </Link>
      </div>
      {error && <p className="text-sm text-slate-900">⚠ Couldn&apos;t load your tests: {error.message}</p>}

      {tests.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-100 p-10 text-center">
          <p className="display text-4xl">No tests yet</p>
          <p className="mt-2 text-slate-600">
            Your first test is free. Paste your site and see what 100 customers think.
          </p>
        </div>
      ) : (
        <ol>
          {tests.map((t, i) => (
            <li key={t.id} className="border-b border-slate-200">
              <Link href={`/run/${t.id}`} className="flex items-center gap-4 py-5 hover:bg-slate-100 sm:gap-6">
                <span className="meta w-10 text-slate-400">({String(tests.length - i).padStart(3, "0")})</span>
                <span className="display w-28 text-4xl">
                  {t.status === "done" ? t.score : t.status === "error" ? "×" : "…"}
                  {t.status === "done" && <span className="text-xl text-slate-400">/{t.total}</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{t.url.replace(/^https?:\/\//, "")}</span>
                  <span className="text-sm text-slate-500">
                    {t.status === "done"
                      ? `would ${t.goal ?? "buy"}`
                      : t.status === "error"
                        ? "failed (didn't use up your plan)"
                        : t.status === "queued"
                          ? "waiting to start"
                          : "still running"}{" "}
                    ·{" "}
                    {new Date(t.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </span>
                <span className="text-xl">↗</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
