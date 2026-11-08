// The landing page: deliberately minimal.
//   The promise + URL box (Hero) and one small example result. That's it.
// Pricing lives on /pricing; new users get a 3-question onboarding after sign-up.
import Hero from "@/components/landing/Hero";

// One example result, so visitors see what they'll get. (Made-up site, honest label.)
const EXAMPLE = {
  site: "mealmate.app",
  buy: 46,
  total: 100,
  blocker: "Price hidden until signup",
  fix: "Show the price on the homepage",
  fixWins: 11,
};

export default function Landing() {
  return (
    <div className="space-y-16">
      <Hero />

      {/* ---------- One small example result ---------- */}
      <section aria-label="Example result" className="card grid gap-6 p-6 sm:grid-cols-[auto_1fr_1fr] sm:items-center sm:gap-8">
        <div>
          <p className="t-label">example · {EXAMPLE.site}</p>
          <p className="mt-2 flex items-baseline gap-1">
            <span className="t-number text-5xl text-accent">{EXAMPLE.buy}</span>
            <span className="text-faint">/ {EXAMPLE.total} would buy</span>
          </p>
        </div>
        <div className="border-t border-line pt-4 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
          <p className="t-label">biggest blocker</p>
          <p className="mt-1 font-medium">{EXAMPLE.blocker}</p>
        </div>
        <div className="border-t border-line pt-4 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
          <p className="t-label">fix first</p>
          <p className="mt-1 font-medium">
            {EXAMPLE.fix} <span className="text-accent-ink">+{EXAMPLE.fixWins}</span>
          </p>
        </div>
      </section>
    </div>
  );
}
