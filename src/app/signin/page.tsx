// /signin
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export default function Page() {
  return (
    <div className="mx-auto max-w-sm space-y-8 py-8">
      <div>
        <h1 className="t-h1">Welcome back</h1>
        <p className="t-lead mt-4">Sign in to run tests and see your reports.</p>
      </div>
      {/* Suspense: the form reads the ?next= part of the address. */}
      <Suspense>
        <AuthForm mode="signin" />
      </Suspense>
    </div>
  );
}
