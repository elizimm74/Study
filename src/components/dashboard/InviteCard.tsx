"use client";
// "Invite 3 friends, unlock the full 100-customer test." Progress dots, the invite link,
// and the send buttons. The database counts a friend only after they verify their email.
import type { PlanData } from "@/lib/dashboard";
import SendBar from "@/components/SendBar";

export default function InviteCard({ plan }: { plan: PlanData }) {
  const { count, needed } = plan.referrals;
  const unlocked = count >= needed;
  return (
    <section id="invite" className="card scroll-mt-24 p-6 sm:p-8" aria-labelledby="invite-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="t-label">{unlocked ? "unlocked" : "free upgrade"}</p>
          <h2 id="invite-title" className="t-h2 mt-2">
            {unlocked ? "Full 100-customer tests unlocked" : `Invite ${needed} friends, unlock 100 customers`}
          </h2>
          <p className="mt-2 text-muted">
            {unlocked
              ? "Thanks for spreading the word. Your tests now run the full 100 simulated customers, and you got one extra test."
              : `Your free test has ${plan.customers} simulated customers. When ${needed} friends join with your link and verify their email, every test runs the full 100 and you get one more test.`}
          </p>
        </div>
        <div className="flex items-center gap-2" role="img" aria-label={`${count} of ${needed} friends joined`}>
          {Array.from({ length: needed }, (_, i) => (
            <span
              key={i}
              className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm ${
                i < count ? "border-accent bg-accent text-accent-fg" : "border-line-strong text-faint"
              }`}
            >
              {i < count ? "✓" : i + 1}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-6 space-y-4">
        <input readOnly value={plan.inviteLink} onFocus={(e) => e.currentTarget.select()} className="field h-11 text-sm" aria-label="Your invite link" />
        <SendBar
          url={plan.inviteLink}
          subject="Try Crawler with me"
          text="I'm testing my launch on Crawler. Simulated customers show what stops people from buying. Join with my link:"
        />
        <p className="text-xs text-faint">A friend counts once they&apos;ve signed up with your link and verified their email. You can&apos;t invite yourself.</p>
      </div>
    </section>
  );
}
