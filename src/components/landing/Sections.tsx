// Three more home-page sections (all plain text and SVG, no client code):
//   Customers: the kinds of SIMULATED people who visit your page (made-up characters)
//   Research:  the public research Crawler's customers are built on (named in text, never as logos)
//   Compare:   Crawler next to the other ways people check a launch (honest about the trade-offs)
// We deliberately do NOT show other companies' logos or "trusted by" claims: nobody has used
// Crawler yet, and claiming otherwise would be false.
import Reveal from "../Reveal";

const PEOPLE = [
  { name: "Maya", age: 16, mind: "Skeptical teen", budget: "tight budget", device: "phone", quote: "I'm not giving my email just to see a price.", skin: "#f2c9a0", hair: "#2b1d12", shirt: "#1a2aa6" },
  { name: "Jordan", age: 24, mind: "Early adopter", budget: "okay budget", device: "laptop", quote: "Cool idea. Show me it working before I sign up.", skin: "#c68b5c", hair: "#111", shirt: "#4d60f5" },
  { name: "Priya", age: 34, mind: "Busy parent", budget: "okay budget", device: "phone", quote: "If I can't get it in two taps, I'm gone.", skin: "#a8744a", hair: "#1b1210", shirt: "#0c0e1f" },
  { name: "Sam", age: 29, mind: "Price-sensitive", budget: "tight budget", device: "phone", quote: "Is there a free plan, or is this a trial trap?", skin: "#f5d5b5", hair: "#8a5a2b", shirt: "#1a2aa6" },
  { name: "Marcus", age: 41, mind: "Small-business owner", budget: "comfortable", device: "laptop", quote: "What does it save me, in hours or dollars?", skin: "#8d5a3b", hair: "#222", shirt: "#4d60f5" },
  { name: "Lena", age: 52, mind: "Careful buyer", budget: "comfortable", device: "laptop", quote: "I want reviews from people like me.", skin: "#eec3a0", hair: "#b9b9c4", shirt: "#0c0e1f" },
] as const;

function Face({ p }: { p: (typeof PEOPLE)[number] }) {
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20 shrink-0" role="img" aria-label={`Illustration of ${p.name}, a simulated customer`}>
      <circle cx="40" cy="40" r="40" fill="#e8ebf6" />
      <path d="M12 80c2-18 14-26 28-26s26 8 28 26z" fill={p.shirt} />
      <circle cx="40" cy="34" r="15" fill={p.skin} />
      <path d="M25 33c0-11 7-16 15-16s15 5 15 16c-3-5-8-8-15-8s-12 3-15 8z" fill={p.hair} />
      <circle cx="35" cy="36" r="1.6" fill="#0c0e1f" />
      <circle cx="45" cy="36" r="1.6" fill="#0c0e1f" />
      <path d="M36 43c2 2 6 2 8 0" stroke="#0c0e1f" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Customers() {
  return (
    <div>
      <p className="t-label text-center">your simulated customers</p>
      <h2 className="t-chunk mt-3 text-center">Not 100 copies of one person.</h2>
      <p className="t-lead mx-auto mt-4 max-w-2xl text-center">
        Every test builds a varied crowd: different ages, budgets, devices and patience. Here are six of the kinds of people it can create.
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PEOPLE.map((p, i) => (
          <li key={p.name}>
            <Reveal delay={i * 60} className="card h-full p-5">
              <div className="flex items-center gap-4">
                <Face p={p} />
                <div>
                  <p className="font-medium">
                    {p.name}, {p.age}
                  </p>
                  <p className="text-sm text-muted">{p.mind}</p>
                  <p className="text-xs text-faint">
                    {p.budget} · {p.device}
                  </p>
                </div>
              </div>
              <blockquote className="mt-4 border-l-2 border-accent pl-3 text-sm">“{p.quote}”</blockquote>
              <p className="mt-3 text-xs text-faint">Made-up example character and quote. Simulated customer.</p>
            </Reveal>
          </li>
        ))}
      </ul>
    </div>
  );
}

const SOURCES = [
  { who: "Nielsen Norman Group", what: "Visitors decide within about 10 seconds and skim instead of reading.", use: "How patient each simulated customer is" },
  { who: "Baymard Institute", what: "Forced account creation is a top reason people quit (about 18–19% of abandoners).", use: "How customers react to sign-up walls" },
  { who: "Unbounce", what: "The median landing page converts about 6.6% of visitors (SaaS about 3.8%).", use: "The skeptical starting point: most visitors don't buy" },
  { who: "Pew Research Center", what: "Teens are on YouTube and TikTok daily, many almost constantly.", use: "Where younger customers come from, and phone use" },
  { who: "Piper Sandler", what: "About 87% of US teens own an iPhone (Taking Stock With Teens, Fall 2025).", use: "The phone mix for teen audiences" },
  { who: "RevenueCat", what: "Median download-to-trial rate for subscription apps is about 6.2% (State of Subscription Apps 2025).", use: "The app benchmark flag in app reports" },
] as const;

export function Research() {
  return (
    <div>
      <p className="t-label text-center">built on public research</p>
      <h2 className="t-chunk mt-3 text-center">Grounded in real numbers.</h2>
      <p className="t-lead mx-auto mt-4 max-w-2xl text-center">
        Crawler&apos;s customers aren&apos;t pure guesses. Their habits start from published studies. We name the sources so you can check them.
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SOURCES.map((s, i) => (
          <li key={s.who}>
            <Reveal delay={i * 60} className={`h-full rounded-xl p-5 ${i % 2 === 0 ? "card" : "card-blue"}`}>
              <p className="t-label">{s.who}</p>
              <p className="mt-3 font-medium">{s.what}</p>
              <p className="mt-3 text-sm opacity-80">Used for: {s.use}</p>
            </Reveal>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-center text-xs text-faint">
        We use these as starting assumptions. Some are older or reported second-hand. These organizations don&apos;t endorse or use Crawler.
      </p>
    </div>
  );
}

const ROWS = [
  { way: "Guess and launch", time: "0 min", people: "None", cost: "Free", note: "Fast, but you learn after launch day." },
  { way: "Ask friends", time: "Days", people: "Real, but biased", cost: "Free", note: "Friends are polite. They rarely say “I wouldn't pay”." },
  { way: "Real user testing", time: "Days to weeks", people: "Real strangers", cost: "Paid per person", note: "The gold standard for realism. Slow and costly." },
  { way: "Crawler", time: "About a minute", people: "Simulated", cost: "Free first test", note: "A fast signal on what to fix first. Not real purchases." },
] as const;

export function Compare() {
  return (
    <div>
      <p className="t-label text-center">where Crawler fits</p>
      <h2 className="t-chunk mt-3 text-center">Not instead of real users. Before them.</h2>
      <div className="mt-10 overflow-x-auto">
        <table className="card w-full min-w-[40rem] border-separate border-spacing-0 text-left text-sm">
          <caption className="sr-only">Comparison of ways to check a launch</caption>
          <thead>
            <tr className="text-muted">
              {["Way", "Time", "People", "Cost", "The catch"].map((h) => (
                <th key={h} scope="col" className="t-label border-b border-line px-4 py-3 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.way} className={r.way === "Crawler" ? "bg-subtle font-medium" : ""}>
                <th scope="row" className="border-b border-line px-4 py-3 font-medium">
                  {r.way}
                </th>
                <td className="border-b border-line px-4 py-3">{r.time}</td>
                <td className="border-b border-line px-4 py-3">{r.people}</td>
                <td className="border-b border-line px-4 py-3">{r.cost}</td>
                <td className="border-b border-line px-4 py-3 text-muted">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
