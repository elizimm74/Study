// /signup
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export default function Page() {
  return (
    <div className="mx-auto max-w-sm space-y-8 py-8">
      <div>
        <h1 className="t-h1">Start free</h1>
        <p className="t-lead mt-4">Your first test is free. No card needed.</p>
      </div>
      {/* Suspense: the form reads the ?next= part of the address. */}
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
