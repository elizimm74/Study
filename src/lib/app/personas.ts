// Simulated customers for APP tests. Same idea as website personas (built in
// code from the audience, so they're varied and free), plus the mobile parts:
// iPhone or Android, where they found the app, and how many screens of
// onboarding they'll put up with.
//
// We build 3 SAMPLES (3 different crowds from the same audience). Running all
// three and comparing them tells us how much the result moves by chance, so
// the report can show a range ("28–36%") instead of one fake-precise number.
import { generatePersonas, makeRandom } from "../personas";
import type { Audience } from "../types";
import type { AppPersona, AppSettings } from "./types";

export const SAMPLES = 3;

// ASSUMPTIONS (tune as we learn): how far into an onboarding people go before
// patience runs out. Teens skim more; people sent by a friend arrive warmer.
const PATIENCE = {
  low: "low: skims, quits at the first screen that feels slow or pushy",
  medium: "medium: will tap through a few screens if each one feels useful",
  high: "high: reads and finishes setup if the app looks worth it",
};

export function generateAppPersonas(audience: Audience, settings: AppSettings, perSample: number, seed: number): AppPersona[] {
  const all: AppPersona[] = [];
  const sources = settings.sources.length ? settings.sources : (["App Store search"] as const);
  for (let s = 0; s < SAMPLES; s++) {
    const sampleSeed = seed + s * 7919; // different, repeatable crowds
    const rand = makeRandom(sampleSeed ^ 0x5bd1e995);
    for (const p of generatePersonas(audience, perSample, sampleSeed)) {
      const teen = p.age < 18;
      const source = sources[Math.floor(rand() * sources.length)];
      const r = rand();
      const lowShare = teen ? 0.45 : 0.3;
      const patience = r < lowShare ? PATIENCE.low : r < lowShare + 0.4 ? PATIENCE.medium : PATIENCE.high;
      all.push({
        ...p,
        id: `S${s + 1}-${p.id}`,
        device: "phone",
        arrivedFrom: source,
        patience,
        platform: rand() * 100 < settings.iphonePct ? "iPhone" : "Android",
        source,
        sample: s,
      });
    }
  }
  return all;
}

export function describeAppPersona(p: AppPersona): string {
  const parts = [
    `${p.id}: ${p.age}yo ${p.gender}`,
    `${p.area} ${p.country}`,
    p.occupation,
    `${p.budget} budget`,
    p.mindset,
    `tech comfort ${p.techComfort}`,
    `currently uses: ${p.currentSolution}`,
    `on ${p.platform === "iPhone" ? "an iPhone" : "an Android phone"}`,
    `found the app via ${p.source}`,
    `patience ${p.patience}`,
  ];
  if (p.role) {
    parts.push(`role ${p.role} at a ${p.companySize}-person ${p.industry} company`, p.canBuyAlone ? "can buy on their own" : "needs approval to buy");
  }
  return parts.join(", ");
}
