# Your photos and clips

Drop files in this folder, then point a story line at them. That's the whole trick:

```json
{ "text": "I'm 15 and I built *this*.", "visual": "media", "media": "media/me-at-desk.jpg" }
```
A clip (mp4, mov, webm) works the same way, and you can choose where in the clip to start:
```json
{ "text": "Watch what happens.", "visual": "media", "media": { "src": "media/screen-recording.mp4", "start": 3, "credit": "Footage: Crawler" } }
```
- Photos fill the screen and slowly zoom. Clips play in sync with the line (a clip shorter than the line freezes on its last picture).
- Best sizes: vertical (9:16). Wide clips are cropped to the middle.
- `credit` shows as small text on screen. Use it for photographers / stock sites.
- Run it: `node video/make-story.cjs <story-name>`

## What you can safely put here
| Safe | Why |
|---|---|
| **You**, your friends, your family (with their OK) | It's yours. A 15-year-old founder on camera is the strongest thing this account can show. |
| **Screen recordings of Crawler** | It's your product. Record a real test (phone: Control Center > Screen Recording). |
| **Free-to-use stock** from Pexels, Pixabay, Mixkit | Their licenses allow commercial use without paying. Read each site's license: usually no implying that people shown endorse you, and no re-selling the clip unchanged. |
| **Canva's stock library** | You have Canva. Its content license allows use in your designs; check that your plan covers the items you pick. |
| **Illustrated characters** | `"visual": "people"` draws original fictional customers. No real people involved. |

## What NOT to put here
- **Movie or TV clips**, and other people's edits. They belong to studios and creators; brand accounts get muted or struck.
- **Photos of real founders** (or anyone famous) used to sell Crawler. It looks like they endorse you, which is a legal problem even if the photo is public. Mentioning someone's name in plain text as a fact is different, but keep it accurate and don't suggest they back you.
- **Music you didn't make or license.** The generated beat is yours. For a trending sound, add it inside TikTok / Instagram when you post.

`media/demo/` holds two placeholder files (a test photo and a test clip) used by the `footage-demo` story to show it works.
