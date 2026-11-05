// /signup
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export default function Page() {
  return (
    <div className="mx-auto max-w-md space-y-6 py-10">
      <div>
        <p className="meta text-slate-400">✱ crawler</p>
        <h1 className="display mt-3 text-6xl">Start free</h1>
        <p className="mt-3 text-slate-600">Your first test with 100 AI customers is free. No card needed.</p>
      </div>
      {/* Suspense: the form reads the ?next= part of the address. */}
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
