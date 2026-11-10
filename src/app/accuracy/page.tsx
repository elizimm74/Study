// /accuracy: Crawler's PUBLIC track record. Founders enter what really happened
// after launch; we show it next to what Crawler predicted. Nothing identifying.
// We say plainly what this can and can't show.
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import { Arrow } from "@/components/landing/UrlForm";

export const metadata = {
  title: "crawler: accuracy",
  description: "Crawler's predictions next to what really happened after launch. Honest numbers, shown publicly.",
};

type Row = { kind: "website" | "app"; predicted: number; real: number };

export default async function Accuracy() {
  let rows: Row[] = [];
  if (AUTH_ENABLED) {
    const supabase = await supabaseServer();
    const { data } = await supabase.rpc("public_accuracy");
    rows = (data as Row[] | null) ?? [];
  }
  const rank = rows.length >= 5 ? spearman(rows.map((r) => r.predicted), rows.map((r) => r.real)) : null;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="t-label">accuracy</p>
      <h1 className="t-h1 mt-4">Do the predictions match reality?</h1>
      <p className="t-lead mt-4">
        Simulated customers can&apos;t be perfect, so we don&apos;t claim they are. Founders who launched tell us what really happened, and we
        show it here, next to what Crawler predicted.
      </p>

      <div className="card mt-12 p-6 sm:p-8">
        <div className="grid gap-8 sm:grid-cols-3">
          <Stat label="real results shared" value={String(rows.length)} />
          <Stat label="ranking match" value={rank === null ? "needs 5+" : rank.toFixed(2)} hint="1 = tests Crawler rated higher also did better in real life" />
          <Stat label="updated" value="live" />
        </div>
        {rows.length === 0 ? (
          <p className="mt-8 rounded-lg border border-line-strong bg-subtle p-4 text-sm">
            No real results yet. We&apos;d rather show an empty page than invent numbers. Be the first: run a test, launch, then add your real
            conversion rate under your report.
          </p>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="t-label border-b border-line">
                  <th className="py-2 pr-4 font-normal">type</th>
                  <th className="py-2 pr-4 font-normal">crawler predicted</th>
                  <th className="py-2 font-normal">really happened</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-b border-line">
                    <td className="py-3 pr-4">{r.kind === "app" ? "app" : "website"}</td>
                    <td className="py-3 pr-4 tabular-nums">{r.predicted}%</td>
                    <td className="py-3 tabular-nums">{r.real}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-12 space-y-4 text-muted">
        <h2 className="t-h3 text-fg">How to read this</h2>
        <p>
          <span className="font-medium text-fg">Predicted</span> is the share of our simulated customers who would take your goal action.{" "}
          <span className="font-medium text-fg">Really happened</span> is the share of your real visitors or installs who did. Real people
          usually convert at lower rates than simulated ones, so the two numbers are not expected to be equal. What matters more is whether
          Crawler ranks things in the right order: pages and paywalls it rates higher should do better.
        </p>
        <p>That&apos;s the &quot;ranking match&quot; above. It stays hidden until there are at least 5 results, because a smaller number would be luck.</p>
      </div>

      <div className="mt-12">
        <Link href="/onboarding" className="btn btn-primary h-12 px-6">
          Run a test <Arrow />
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="t-number text-4xl">{value}</p>
      <p className="t-label mt-2">{label}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

// Rank correlation: do higher predictions go with higher real results? (-1 to 1)
function spearman(a: number[], b: number[]): number {
  const rank = (xs: number[]) => {
    const order = xs.map((v, i) => [v, i] as const).sort((p, q) => p[0] - q[0]);
    const r = new Array<number>(xs.length);
    for (let i = 0; i < order.length; ) {
      let j = i;
      while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
      for (let k = i; k <= j; k++) r[order[k][1]] = (i + j) / 2 + 1; // ties share the average rank
      i = j + 1;
    }
    return r;
  };
  const ra = rank(a);
  const rb = rank(b);
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const ma = mean(ra);
  const mb = mean(rb);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < ra.length; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}
