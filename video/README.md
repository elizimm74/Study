# Crawler launch video

`crawler-launch.mp4` is the finished video (38.5 seconds, 1920x1080, 60 frames per second, with sound).

## How it's made
| File | What it is |
|---|---|
| `launch.html` | The whole video as a web page. Every scene is a function of time: `seek(seconds)` draws that exact moment. All the words and timings are in here. |
| `render.cjs` | Opens the page in a hidden browser, takes a picture of every frame, and hands them to ffmpeg to make the .mp4. |
| `soundtrack.py` | Builds the music and sound effects from math (no samples, nothing copyrighted), timed to the scenes. |
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
