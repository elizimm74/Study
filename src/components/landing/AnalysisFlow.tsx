// The "how the analysis runs" picture for the landing page.
// Rows of customer avatars feed bold lines into one website. The website card
// then shows the checks that finished. The avatars are placeholders (initials);
// swap in real photos by adding a `photo` URL and rendering an <img> in Avatar.
// Everything uses the design tokens from globals.css, so light and dark both work.

// Each row: where it sits (y, in % of the box height), its avatars, and where its line
// lands on the website's left edge (target, in %).
const ROWS = [
  { y: 18, target: 22, people: ["AK", "JM", "PR", "SL", "ML"] },
  { y: 34, target: 36, people: ["DK", "TN", "NB", "RW"] },
  { y: 50, target: 50, people: ["OH", "CE", "AS", "LH", "MV", "BT"] },
  { y: 66, target: 64, people: ["EV", "FM", "GT"] },
  { y: 82, target: 78, people: ["IP", "QZ", "WR", "UD"] },
];

// Horizontal spacing between avatars, and where the website's left edge is (both in %).
const STEP = 7;
const START_X = 4;
const SITE_X = 62;

// The completed checks the website card shows.
const CHECKS = ["Landing page read", "Pricing found", "Signup found", "25 customers reviewed", "Fixes ranked"];

export default function AnalysisFlow() {
  return (
    <section aria-labelledby="flow-title" className="scroll-mt-24">
      <div className="max-w-2xl">
        <p className="t-label">how the analysis runs</p>
        <h2 id="flow-title" className="t-h2 mt-4">
          Every visitor, every step, checked.
        </h2>
        <p className="t-lead mt-4">
          Each customer reads your site on their own. When the run finishes, every check is marked off.
        </p>
      </div>

      {/* ---------- Desktop: avatars, bold lines, website ---------- */}
      <div className="relative mt-16 hidden h-[30rem] md:block">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          {ROWS.map((row) => {
            const lastX = START_X + (row.people.length - 1) * STEP;
            const startX = lastX + 2;
            const mid = (startX + SITE_X) / 2;
            // A straight bold line through the row, then a curve into the website.
            const d = `M ${START_X} ${row.y} L ${startX} ${row.y} C ${mid} ${row.y}, ${mid} ${row.target}, ${SITE_X} ${row.target}`;
            return (
              <path
                key={row.y}
                d={d}
                fill="none"
                style={{ stroke: "var(--fg)" }}
                strokeWidth={3}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {ROWS.map((row) =>
          row.people.map((initials, i) => (
            <div
              key={`${row.y}-${initials}`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${START_X + i * STEP}%`, top: `${row.y}%` }}
            >
              <Avatar initials={initials} />
            </div>
          )),
        )}

        <div className="absolute top-1/2 w-[36%] -translate-y-1/2" style={{ left: `${SITE_X}%` }}>
          <SiteCard />
        </div>
      </div>

      {/* ---------- Mobile: stacked ---------- */}
      <div className="mt-12 space-y-6 md:hidden">
        {ROWS.map((row) => (
          <div key={row.y} className="flex items-center gap-2 overflow-x-auto pb-1">
            {row.people.map((initials) => (
              <Avatar key={initials} initials={initials} />
            ))}
            <span className="ml-1 h-[3px] min-w-8 flex-1 rounded-full bg-fg" aria-hidden />
          </div>
        ))}
        <div className="pt-2">
          <SiteCard />
        </div>
      </div>

      <p className="sr-only">
        Diagram: 25 customers each read the website. Once the run finishes, five checks are marked complete: landing page read,
        pricing found, signup found, 25 customers reviewed, and fixes ranked.
      </p>
    </section>
  );
}

// A customer's profile picture. Placeholder: initials on a neutral circle.
function Avatar({ initials }: { initials: string }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-bg bg-raised text-[11px] font-medium text-muted md:h-10 md:w-10"
      aria-hidden
    >
      {initials}
    </span>
  );
}

// The website being analysed, with its checklist of finished steps.
function SiteCard() {
  return (
    <div className="card-raised overflow-hidden">
      {/* browser bar */}
      <div className="flex h-10 items-center gap-3 border-b border-line bg-subtle px-4">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-line-strong" />
          <span className="h-2 w-2 rounded-full bg-line-strong" />
          <span className="h-2 w-2 rounded-full bg-line-strong" />
        </span>
        <span className="t-label truncate">mealmate.app</span>
      </div>

      {/* a simple sketch of the page */}
      <div className="space-y-3 border-b border-line p-5" aria-hidden>
        <span className="block h-3 w-3/5 rounded bg-fg" />
        <span className="block h-2 w-4/5 rounded bg-line-strong" />
        <span className="block h-2 w-2/3 rounded bg-line-strong" />
        <span className="mt-2 inline-block h-6 w-20 rounded-lg bg-fg" />
      </div>

      {/* the checklist */}
      <div className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Analysis</p>
          <span className="t-label">{CHECKS.length} of {CHECKS.length} done</span>
        </div>
        <ul className="mt-4 space-y-3">
          {CHECKS.map((c) => (
            <li key={c} className="flex items-center gap-3 text-sm">
              <Check />
              {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// A filled circle with a check mark: "this step finished".
function Check() {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fg text-bg" aria-hidden>
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
