"use client";
// What this account's next test looks like: how many simulated customers, how many tests are left,
// and the invite progress. The database decides; this only fetches it (GET /api/plan).
import { useEffect, useState } from "react";
import Link from "next/link";
import type { PlanData } from "@/lib/dashboard";

export type PlanInfo = PlanData;

export function usePlan(): PlanInfo | null {
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  useEffect(() => {
    fetch("/api/plan")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && !d.error && setPlan(d))
      .catch(() => null);
  }, []);
  return plan;
}

// Shown on the launch step when this is a starter-size test.
export function StarterNote({ plan }: { plan: PlanInfo | null }) {
  if (!plan || plan.customers >= 100) return null;
  const { count, needed } = plan.referrals;
  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <p className="font-medium">
          Starter test: {plan.customers} simulated customers
        </p>
        <p className="mt-1 text-sm text-muted">
          Invite {needed} friends and unlock a full 100-customer test ({count} of {needed} so far). Friends count once they verify their email.
        </p>
      </div>
      <Link href="/dashboard#invite" className="btn btn-secondary h-11 shrink-0 px-5">
        Invite friends
      </Link>
    </div>
  );
}
