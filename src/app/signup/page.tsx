// /signup
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export default function Page() {
  // The form sits on a sheet of torn paper (.paper in globals.css).
  return (
    <div className="paper mx-auto max-w-md space-y-8 px-6 py-12 sm:px-10">
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
