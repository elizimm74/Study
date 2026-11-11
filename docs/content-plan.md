# Crawler on TikTok + Instagram: the plan

Goal: a short-video account that keeps showing the Crawler logo and name, teaches founders something real, and sends them to a free test.
Nobody can promise views. What follows is the format that tends to hold attention, and a way to make it in minutes.

## 1. What the reference video does (and why it works)
The ~95 second video you sent is a story told **one word at a time** over a fast montage:
1. **A hook in the first second.** A question or a bold claim.
2. **The picture changes every 1–2 seconds.** Boredom is the enemy.
3. **One word at a time.** People stay to finish the sentence.
4. **Big numbers slam in.** They're easy to remember and easy to repeat.
5. **A small logo in the corner the whole time.** Every share carries the brand.
6. **A story with a turn.** "It was going wrong, until..."
7. **A payoff, then a call to action.**

**What we do NOT copy: the footage.** That video is built from famous movie scenes. They belong to the studios. A brand account selling something would get muted, removed or struck on TikTok and Instagram, and enough strikes can end the account. The format works without them, so Crawler uses its own visuals: motion graphics, our product screens, big numbers, the claw logo.

## 2. Make a video (the easy way)
Easiest: tell Claude "make a video about <idea>". It writes the story, makes the video, and checks it.

Or on a computer that has Node, Python (with numpy) and ffmpeg:
```bash
node video/make-story.cjs launch-blind
```
That makes `video/out/launch-blind.mp4` (1080x1920, with a generated beat). To just look at stills first:
```bash
node video/make-story.cjs launch-blind --preview
```
Six stories are ready: `launch-blind`, `ten-seconds`, `paywall-flags`, `card-trials`, `three-friends`, `meet-your-customers`. (`footage-demo` shows how your own photos and clips drop in.)

### Write your own story
Copy a file in `video/stories/`, change the lines, and run the command with its name.
```json
{
  "title": "Anything",
  "style": "hype",
  "wps": 3.2,
  "source": "Source: where the fact comes from",
  "lines": [
    { "text": "You spent *6 months* building it.", "visual": "dark", "big": "6 MONTHS" },
    { "text": "Nobody *buys*.", "visual": "paper" }
  ]
}
```
- `*word*` makes a word light blue (emphasis). `wps` = words per second (3.2 is quick; 2.6 is calmer).
- `style`: `hype` (140 bpm, heavy bass) or `chill` (92 bpm).
- `big`: a giant word or number above the caption.
- `visual` (what's behind the words): `media` (your photo/clip), `people` (illustrated customers), `dark`, `gradient`, `paper` (a dead launch page), `claws`, `grid` (100 customers), `bars` (why people said no), `fixes`, `phones` (where app users quit), `card` (the blue business card), `checklist` (add `"title"` and `"items": [...]`), `stats` (add `"stats": [{"value":"~2%","label":"..."}]`).
- `handle`, button text and tagline live in `video/brand.json`. **Change `@crawler.app` to your real account name.**

### Use real faces and footage (the safe way, and it's fast)
Drop files in `video/media/` and point a line at them (full guide: `video/media/README.md`):
```json
{ "text": "I'm 15 and I built *this*.", "visual": "media", "media": "media/me-at-desk.jpg" }
```
- **You on camera is the best asset this account has.** A 15-year-old building a product with AI is the story. Film vertical on your phone: 3 short clips (you at your desk, you reacting to a test result, you pressing the button).
- **Screen recordings of Crawler** (phone: Control Center > Screen Recording). Real product footage beats stock.
- **Licensed stock** from Pexels, Pixabay, Mixkit, or Canva's library. Read each license. Credit with `"credit"`.
- **Illustrated customers:** `"visual": "people"` shows original fictional characters (see `stories/meet-your-customers.json`). Put "simulated customer" on them, which the cards already do.
- **Not allowed here:** movie / TV clips, other creators' edits, and photos of real founders or celebrities used to sell Crawler (it looks like they endorse you).

## 3. Rules that keep the account safe and trusted
- **No movie clips, no songs you don't own, no real people's faces.** Use the generated beat, or add a trending sound inside the app when posting (the app holds that license).
- **Only claims you can source.** Every fact story has a `source` line shown on screen. If you can't source it, don't say it.
- **Always say "simulated".** Crawler shows buying intent, not real purchases. The end card says so.
- **Never invent testimonials, user counts or results.** Example numbers must be labelled as examples.
- **Don't tag real companies as failing.** Teach the lesson without naming and shaming.

## 4. What to post
Hook formulas that fit Crawler (fill in the blank):
1. "You spent ___ building it. Nobody ___."
2. "People decide in about 10 seconds." (then the lesson)
3. "Your paywall might get flagged." (then the checklist)
4. "Free trial that needs a card? One data set says ___."
5. "3 things that stop people from buying (and the fix for each)."
6. "I'm 15 and I built ___. Here's what 100 simulated customers said about it." (only if true, and say they're simulated)
7. "We tested a landing page with 100 customers. Here's the #1 reason they left." (use a real test of your own page)
8. "Stop guessing why people don't sign up."

Posting rhythm that's realistic: **4–5 short videos a week for 30 days**, same format each time, so people learn to recognize it. Post the same video on TikTok, Instagram Reels and YouTube Shorts.

## 5. Account setup
- Handle: same name everywhere. Profile photo: the claw logo on blue.
- Bio: one line ("See what stops customers from buying, before launch day") + the link to the site (the **example report** page converts better than the home page: `/example`).
- Pin your 3 best videos.
- Put "link in bio" in the last caption, not in the video's first second.

## 6. What to watch
- **Watch time / finish rate** is what the apps reward. If people leave in the first 2 seconds, change the hook. Keep the rest.
- **Shares and saves** beat likes. Fact videos (paywall rules, the 10-second rule) tend to get saved.
- **Link clicks → free tests finished.** If views are high and tests are low, the fix is the site, not the video.
- Keep a simple list: video, hook, views, finish rate, clicks. After 20 videos, make more of whatever the top three have in common.

## 7. A first 2 weeks
| Day | Video |
|---|---|
| 1 | `launch-blind` (the brand story) |
| 2 | `ten-seconds` |
| 4 | `paywall-flags` |
| 5 | `card-trials` |
| 7 | `three-friends` (invite 3 friends, unlock 100) |
| 8–14 | New stories from the hook list above. Reuse the best performer's hook with a different fact. |
