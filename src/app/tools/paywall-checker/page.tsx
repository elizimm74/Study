// /tools/paywall-checker: a free tool anyone can use without signing up. It runs
// in the browser (no AI, no cost) and leads to a real app test.
import PaywallChecker from "@/components/app/PaywallChecker";

export const metadata = {
  title: "Free App Store paywall checker | crawler",
  description:
    "Check your subscription paywall against Apple App Store and Google Play rules in 30 seconds: price, billing period, trial terms, restore purchases, terms and privacy links. Free, no sign-up.",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="t-label">free tool · no sign-up</p>
      <h1 className="t-h1 mt-4">Will your paywall get flagged?</h1>
      <p className="t-lead mt-4 max-w-xl">
        Fill in what your paywall shows. We check it against what Apple and Google commonly ask subscription apps to show, and tell you what to
        fix before you submit.
      </p>
      <div className="mt-12">
        <PaywallChecker />
      </div>
    </div>
  );
}
