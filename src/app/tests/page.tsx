// /tests: "My tests", every test this account has run, newest first.
// Row Level Security means this list can only ever contain YOUR tests.
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";

type Row = { id: string; url: string; goal: string | null; status: string; score: number | null; total: number | null; created_at: string };

export default async function MyTests() {
  if (!AUTH_ENABLED) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="t-h1">My tests</h1>
        <p className="card mt-8 p-6 text-muted">Accounts are switched off, so tests aren&apos;t saved to an account.</p>
      </div>
    );
  }
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("tests")
    .select("id, url, goal, status, score, total, created_at")
    .order("created_at", { ascending: false });
  const tests = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="t-h1">My tests</h1>
        <Link href="/app" className="btn btn-primary">
          New test
        </Link>
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-line-strong bg-subtle p-4 text-sm">
          Couldn&apos;t load your tests: {error.message}
        </p>
      )}

      {tests.length === 0 ? (
        <div className="card p-8">
          <p className="t-h3">No tests yet</p>
          <p className="mt-1 text-muted">Your first test is free. Paste your site and see what 100 customers think.</p>
          <Link href="/app" className="btn btn-secondary mt-6">
            Run your first test
          </Link>
        </div>
      ) : (
        <ol className="card divide-y divide-line">
          {tests.map((t, i) => (
            <li key={t.id}>
              <Link href={`/run/${t.id}`} className="flex items-center gap-4 px-6 py-4 transition-colors duration-150 first:rounded-t-xl last:rounded-b-xl hover:bg-subtle sm:gap-6">
                <span className="t-label hidden w-8 sm:block">{String(tests.length - i).padStart(2, "0")}</span>
                <span className="flex w-20 items-baseline gap-1">
                  <span className={`t-number text-3xl ${t.status === "done" ? "text-accent" : "text-faint"}`}>
                    {t.status === "done" ? t.score : t.status === "error" ? "×" : "…"}
                  </span>
                  {t.status === "done" && <span className="text-sm text-faint">/{t.total}</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{t.url.replace(/^https?:\/\//, "")}</span>
                  <span className="text-sm text-muted">
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
                <span className="text-faint" aria-hidden>→</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
