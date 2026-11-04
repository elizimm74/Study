// How real people behave on websites, based on published research.
// Full notes and sources: docs/persona-research.md
//
// Two parts:
//  1. RULES: research findings, each attached to the kind of person it fits.
//     The persona prompt includes only the rules that apply to this batch.
//  2. VISITS: for each persona we simulate the visit itself, in code (free):
//     what device they're on, where they came from, how patient they are.
//     These percentages are our ASSUMPTIONS informed by the research,
//     not exact published numbers. Tune them as we learn more.
import type { Persona } from "./types";

// ---------- 1. Research rules ----------

type Rule = {
  appliesTo: (p: Persona) => boolean;
  text: string;
};

const isTeen = (p: Persona) => p.age < 18;

export const RULES: Rule[] = [
  // Everyone
  {
    appliesTo: () => true,
    text: "Most visitors decide within about 10 seconds whether to stay, and they skim headlines and buttons instead of reading paragraphs. If the first screen doesn't make the point, they leave. (Nielsen Norman Group)",
  },
  {
    appliesTo: () => true,
    text: "Across tens of thousands of landing pages, the median page converts only about 6-7% of visitors. A big majority leaving is normal. (Unbounce benchmark)",
  },
  {
    appliesTo: () => true,
    text: "Being forced to create an account is one of the top reasons people quit, and requiring a credit card just to start a free trial cuts trial signups a lot. A 'Continue with Google' button and few fields reduce that friction. (Baymard Institute; SaaS trial benchmarks)",
  },
  // Teens
  {
    appliesTo: isTeen,
    text: "Teens (13-17) are less web-savvy than adults assume: in usability tests they finished tasks about 55% of the time vs 66% for adults. They have little patience for reading, prefer short text, big visuals and things they can try or do right away, and are put off by sites that feel childish or use words like 'kids' or 'youth'. (Nielsen Norman Group, Teenagers on the Web)",
  },
  {
    appliesTo: isTeen,
    text: "Most teens don't have their own credit card. Paying usually means asking a parent, using a gift card, or an app-store balance. A paid plan or 'card required' trial is a real obstacle for them; free plans matter a lot.",
  },
  {
    appliesTo: isTeen,
    text: "Teens discover products on TikTok, YouTube and Instagram and are almost all on phones (about 87% of US teens own an iPhone). Before trusting something new they check comments and reviews, and trust friends and family more than influencers or the company's own claims. (Pew Research; Piper Sandler Taking Stock With Teens; teen shopping surveys)",
  },
  // Budget
  {
    appliesTo: (p) => p.budget === "tight",
    text: "People on a tight budget look for the price first. Any monthly fee has to beat 'free' alternatives clearly, and a hidden price feels like a trap.",
  },
  // Tech comfort
  {
    appliesTo: (p) => p.techComfort === "low",
    text: "People with low tech comfort give up when a step is confusing, jargon-heavy, or asks for setup they don't understand.",
  },
  // Business buyers
  {
    appliesTo: (p) => p.canBuyAlone === false,
    text: "Business buyers who need approval rarely buy on the spot. They look for something to show their boss (pricing, security, case studies) and often only sign up for a trial or demo.",
  },
];

// The rules that apply to at least one persona in this batch.
export function rulesFor(personas: Persona[]): string[] {
  return RULES.filter((r) => personas.some(r.appliesTo)).map((r) => r.text);
}

// ---------- 2. Simulated visit ----------

export type Visit = {
  device: "phone" | "laptop";
  arrivedFrom: string;
  patience: "about 10 seconds" | "about 30 seconds" | "a few minutes";
};

type Rand = () => number;

// Pick from {option: weight}.
function weighted<T extends string>(rand: Rand, weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = rand() * total;
  for (const [key, w] of entries) {
    roll -= w;
    if (roll < 0) return key;
  }
  return entries[0][0];
}

export function simulateVisit(p: Persona, rand: Rand): Visit {
  const teen = isTeen(p);
  const business = p.role !== undefined;

  // ASSUMPTION: teens browse mostly on phones; business buyers more on laptops.
  const phoneShare = teen ? 0.85 : business ? 0.35 : 0.6;
  const device = rand() < phoneShare ? "phone" : "laptop";

  // ASSUMPTION: where visitors come from, by type of person.
  const arrivedFrom = teen
    ? weighted(rand, {
        "a TikTok, YouTube or Instagram video": 50,
        "a link a friend sent": 25,
        "a Google search": 15,
        "an ad": 10,
      })
    : business
      ? weighted(rand, {
          "a Google search": 40,
          "a colleague's recommendation": 25,
          "a post on LinkedIn or X": 20,
          "an ad": 15,
        })
      : weighted(rand, {
          "a Google search": 35,
          "a social media post": 25,
          "a link a friend sent": 20,
          "an ad": 20,
        });

  // ASSUMPTION based on NN/g: many people leave within ~10 seconds, but
  // those who stay past ~30 seconds often stay for minutes.
  const patience = weighted(rand, {
    "about 10 seconds": teen ? 50 : 40,
    "about 30 seconds": 35,
    "a few minutes": teen ? 15 : 25,
  });

  return { device, arrivedFrom, patience };
}
