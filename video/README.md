# Crawler launch video

`crawler-launch.mp4` is the finished video (38.5 seconds, 1920x1080, 60 frames per second, with sound).

## The three versions
| File | Sound | Use it for |
|---|---|---|
| `crawler-launch-hype.mp4` | Hype, bass-heavy original track | Posting anywhere (X, YouTube, TikTok, Instagram) |
| `crawler-launch.mp4` | Calm original track | A softer feel, e.g. on the website |
| `crawler-launch-for-trending-sound.mp4` | Effects only, no music | TikTok / Instagram when you add a trending song inside the app |

## The vertical hype edit
`crawler-edit.mp4` is a 15-second vertical (1080x1920) edit for TikTok / Reels / Shorts: big word-by-word captions,
cuts on the beat, zoom hits, and a Crawler-blue business card. It is fully original (no film footage). Source: `edit.html`.
```bash
SFX=0 python3 video/soundtrack_hype.py
```
```bash
ffmpeg -y -ss 10 -t 15 -i video/soundtrack-hype-music.wav -af "afade=t=in:d=0.15,afade=t=out:st=14.2:d=0.8" video/edit-audio.wav
```
```bash
PAGE=edit.html W=1080 H=1920 FPS=30 AUDIO=edit-audio.wav OUT=crawler-edit.mp4 node video/render.cjs
```

To put a different soundtrack on the same picture (no re-recording needed):
```bash
ffmpeg -y -i video/crawler-launch.mp4 -i video/soundtrack-hype.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest video/crawler-launch-hype.mp4
```

## How it's made
| File | What it is |
|---|---|
| `launch.html` | The whole video as a web page. Every scene is a function of time: `seek(seconds)` draws that exact moment. All the words and timings are in here. |
| `render.cjs` | Opens the page in a hidden browser, takes a picture of every frame, and hands them to ffmpeg to make the .mp4. |
| `soundtrack.py` | Builds the calm music and sound effects from math (no samples, nothing copyrighted), timed to the scenes. `MUSIC=0` makes an effects-only version. |
| `soundtrack_hype.py` | The HYPE version: 140 beats per minute, heavy 808 bass, kick + clap, rolling hi-hats, a build-up and a drop when the logo lands. Also original. |
| `fonts/` | The site's fonts (Archivo, Geist, Geist Mono; all open-source), so the video looks the same on any computer. |

## Change it and re-make it
1. Edit the words or times in `launch.html` (search for the text you want to change).
2. Quick check, a still picture every half second in `video/preview/`:
   ```bash
   node video/render.cjs --preview
   ```
3. If you changed any timing, re-make the sound (and update the `TYPING` list in `soundtrack.py` to match):
   ```bash
   python3 video/soundtrack.py
   ```
4. Record the video (a few minutes):
   ```bash
   node video/render.cjs
   ```

Needs `ffmpeg` and Python with `numpy` on the computer that records it.

## The scenes
| Time | Scene |
|---|---|
| 0–4.5s | Hook: "You spent 6 MONTHS building it. And you're still guessing why nobody buys." |
| 4.5–9s | The search bar, then "You guess, but zero answers" |
| 9–13s | "What if 100 customers tried it first?" (white paper slides in) |
| 13–15s | Claws scratch, the logo lands |
| 15–30.5s | The product in 5 beats: paste a link, 100 customers, what stopped them, ranked fixes, apps too |
| 30.5–33.5s | "All the answers. Before launch." |
| 33.5–38.5s | "See what stops customers. Before you launch." and the button |

All numbers shown (38 of 100, 34%, +11...) are the same made-up example the website uses, and the last frame says "simulated customers · buying intent, not real purchases".

## Story videos for TikTok / Instagram / Shorts
Vertical (1080x1920) one-word-at-a-time stories, with the logo and handle on every frame:
```bash
node video/make-story.cjs launch-blind
```
Ready stories: `launch-blind`, `ten-seconds`, `paywall-flags`, `card-trials`, `three-friends` (in `video/stories/`).
How to write your own, what to post and how to stay safe: `docs/content-plan.md`.
