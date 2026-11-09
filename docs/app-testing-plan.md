# App testing: onboarding + paywalls (Phase 1 plan)

Status: PROPOSED, waiting for the founder's OK. Nothing below is built yet.

## Goal
Founders upload their app's onboarding + paywall screens and get: which screen loses people and why,
a paywall teardown, App Store / Google Play rule checks, an A/B winner, and ranked fixes with rewritten copy.

## Honest accuracy promise
- "100% accurate" at predicting real people isn't possible for any tool. We don't claim it.
- What CAN be ~100%: the FACTS about the screens (prices, trial length, buttons, links), because the
  founder confirms them before the test runs.
- What we MEASURE and publish: how consistent results are, how often we pick the right A/B winner, and
  (later) how close predictions were to founders' real numbers.

## How a founder uses it (wizard: Website | App)
1. **Upload**: drag in up to 15 screenshots in order (onboarding → paywall). Optional: Version B of the
   paywall (for A/B), and an App Store / Google Play link (store page test, phase 1b).
2. **Review ("what we understood")**: the AI labels every screen (welcome, question, permission ask,
   sign-up, paywall...) and reads the paywall facts into a table: plans, prices, billing period, trial
   length, close button, restore purchases, terms/privacy links. The founder fixes anything wrong.
   This confirmation step is the main reason the facts are trustworthy.
3. **Audience**: presets + mobile fields (iPhone/Android split, where they came from: App Store search,
   TikTok/Instagram ad, friend's link; how many subscriptions they already pay for).
4. **Launch** → live progress → report.

## The pipeline (runs in the worker)
1. **Read the screens**: Haiku (vision) labels each screen with strict JSON. Paywall screens are read
   by Sonnet (more accurate on small print). Temperature 0. Results go to the Review step.
2. **Rule checks in CODE** (on the confirmed facts, not AI guesses): price + billing period shown,
   trial terms clear, restore purchases, terms + privacy links, close button present. Each check names
   the rule it's based on and says "may be flagged", never "will be rejected".
3. **Customers walk the flow screen by screen**: each simulated customer sees the screens in order with
   a patience budget and research-based mobile behavior (permission prompts, sign-up walls, price shock),
   and returns JSON: the last screen they reached, why they stopped, and at the paywall: start trial /
   subscribe / close / leave, + objection + what would change their mind + a quote.
4. **Count in CODE**: drop-off per screen, paywall outcomes, objection groups, segments.
5. **Ranges, not fake precision**: run 3 different customer samples and show the middle + range
   (e.g. "28–36% would start a trial"). About 3x the cost (still a few cents).
6. **A/B, done right**: the SAME customers see Version A and Version B (paired), so the comparison is fair;
   the report says how sure it is (clear win / slight edge / too close to call).
7. **Benchmarks as a sanity check**: compare against published subscription-app ranges (e.g. RevenueCat's
   yearly report; numbers to be verified and cited before use). If a result is far outside normal ranges,
   we FLAG it ("unusually high; customers may be too optimistic"), we never quietly adjust it.
8. **Report**: Sonnet writes ranked fixes + rewritten paywall/onboarding copy from the counted summary only.

## Proving accuracy (the "locked in" part)
1. **Fact-reading bench** (like `npm run bench` for the crawler): ~10 sample paywall/onboarding screenshot
   sets we design with known answers. Target: ≥95% of facts read correctly before the founder even edits.
2. **Consistency test**: the same input run 5 times; the score must stay within about ±5 points.
3. **Known-winner pairs**: paywall pairs where the better version is known (public case studies + our own
   clear-cut examples). Target: Crawler picks the winner ≥80% of the time; we report the real number.
4. **Real-world calibration (after launch)**: founders can enter their real trial/conversion numbers;
   we track predicted vs real and tune. Over time this becomes a public track record.

## Cost
About 1–5¢ per test (images are shared across customers with prompt caching; 3 samples for ranges).

## What's needed
- Nothing new to install for screenshots. (Screen RECORDINGS would need ffmpeg: later, with permission.)
- Database: an `app_tests` path (or `kind` on tests) + screenshots in the existing private storage bucket.

## Later phases
- **Phase 2**: tap through clickable prototypes (Figma links, Expo web previews) with the explorer.
- **Phase 3**: the real app in a phone emulator (device farm; costly; only if founders need it).

## Our own conversion (dogfooding)
Once Crawler is hosted, run Crawler on Crawler: the home page, onboarding and pricing. Fix what it finds.
