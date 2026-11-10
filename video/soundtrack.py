# Makes video/soundtrack.wav: an ORIGINAL soundtrack built from math (no samples,
# nothing copyrighted): soft chords, a light beat, typing ticks, clicks and whooshes,
# timed to the scenes in launch.html.   Run:  python3 video/soundtrack.py
#   MUSIC=0 python3 video/soundtrack.py   -> soundtrack-sfx.wav: effects only, no music
#   (for posting with a trending sound picked inside TikTok / Instagram)
import os
import wave
import numpy as np

MUSIC = os.environ.get("MUSIC", "1") != "0"

SR = 44100
DUR = 38.5
N = int(SR * DUR)
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(7)


def add(sig, at, gain=1.0, pan=0.0):
    """Mix a sound in at `at` seconds. pan: -1 left ... 1 right."""
    i = int(at * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    L[i : i + len(sig)] += sig * (1 - max(0, pan))
    R[i : i + len(sig)] += sig * (1 + min(0, pan))


def tone(freq, dur, attack=0.01, decay=4.0, harmonics=(1.0, 0.35, 0.12)):
    t = np.arange(int(dur * SR)) / SR
    sig = sum(a * np.sin(2 * np.pi * freq * (k + 1) * t) for k, a in enumerate(harmonics))
    return sig * np.minimum(1, t / attack) * np.exp(-decay * t)


def smooth(x, n):
    return np.convolve(x, np.ones(n) / n, mode="same")


def tick(bright=1.0):  # one keyboard tick
    t = np.arange(int(0.03 * SR)) / SR
    return (rng.standard_normal(len(t)) * 0.5 + np.sin(2 * np.pi * 2400 * bright * t)) * np.exp(-180 * t)


def whoosh(dur=0.8):  # paper sliding
    n = int(dur * SR)
    env = np.sin(np.linspace(0, np.pi, n)) ** 2
    return smooth(rng.standard_normal(n), 60) * env * 6


def kick():
    t = np.arange(int(0.28 * SR)) / SR
    return np.sin(2 * np.pi * (48 * t + 60 * (1 - np.exp(-28 * t)) / 28)) * np.exp(-11 * t)


def hat():
    t = np.arange(int(0.05 * SR)) / SR
    n = rng.standard_normal(len(t))
    return (n - smooth(n, 8)) * np.exp(-90 * t)


def boom():
    t = np.arange(int(1.6 * SR)) / SR
    return np.sin(2 * np.pi * (40 * t + 30 * (1 - np.exp(-6 * t)) / 6)) * np.exp(-3 * t)


NOTE = lambda n: 440 * 2 ** ((n - 69) / 12)  # MIDI note number -> Hz
BEAT = 0.5  # 120 beats per minute
# Four chords, 4 seconds each, looped: A minor, F, C, G (root + chord notes)
CHORDS = [(45, [57, 60, 64, 67]), (41, [57, 60, 65, 69]), (48, [55, 60, 64, 67]), (43, [55, 59, 62, 67])]

# --- soft pad the whole way through (quiet in the hook, fuller in the product part) ---
for bar in range(int(DUR / 4) + 1 if MUSIC else 0):
    root, notes = CHORDS[bar % 4]
    t0 = bar * 4.0
    level = 0.05 if t0 < 12 else 0.085
    t = np.arange(int(4.4 * SR)) / SR
    env = np.minimum(1, t / 0.9) * np.minimum(1, (4.4 - t) / 0.9)
    for k, n in enumerate(notes):
        wob = 1 + 0.002 * np.sin(2 * np.pi * 0.3 * t + k)
        add((np.sin(2 * np.pi * NOTE(n) * wob * t) + 0.3 * np.sin(2 * np.pi * NOTE(n) * 2 * t)) * env, t0, level, pan=(k - 1.5) * 0.35)
    add(np.sin(2 * np.pi * NOTE(root - 12) * t) * env, t0, level * 1.6)

# --- beat: from the logo (13s) to the tagline (33.5s) ---
b = 13.0
while MUSIC and b < 33.4:
    add(kick(), b, 0.5)
    if b >= 15.0:
        add(hat(), b + BEAT / 2, 0.07, pan=0.3)
        add(hat(), b + BEAT * 0.75, 0.03, pan=-0.3)
    b += BEAT
# --- plucked notes over the product part (8th notes walking up each chord) ---
b, step = 15.0, 0
while MUSIC and b < 33.2:
    _, notes = CHORDS[int(b // 4) % 4]
    n = notes[[0, 2, 1, 3, 2, 3, 1, 2][step % 8]] + 12
    add(tone(NOTE(n), 0.5, decay=7), b, 0.075, pan=0.5 * np.sin(step))
    b += BEAT / 2
    step += 1

# --- typing ticks: (start time, letters per second, how many letters), same as launch.html ---
TYPING = [(0.25, 20, 9), (2.0, 22, 12), (3.1, 36, 41), (4.95, 19, 27), (7.35, 24, 14), (8.0, 22, 12), (9.75, 26, 37),
          (13.95, 18, 7), (15.55, 26, 14), (16.05, 17, 12), (18.6, 30, 31), (22.0, 28, 21), (25.15, 32, 32), (27.95, 32, 30),
          (30.7, 30, 31), (33.75, 34, 43)]
for start, cps, count in TYPING:
    for i in range(count):
        add(tick(0.8 + 0.4 * rng.random()), start + i / cps, 0.05 + 0.03 * rng.random(), pan=rng.uniform(-0.3, 0.3))

# --- the months counter (1..6), then a hit ---
for i in range(6):
    add(tone(NOTE(60 + i * 2), 0.18, decay=18), 0.85 + i * 0.165, 0.16)
add(boom(), 1.85, 0.5)
if MUSIC:
    add(tone(NOTE(72), 1.2, decay=3), 1.85, 0.12)

# --- paper sliding, logo, clicks, the final button ---
for at in (8.9, 12.45, 14.7, 33.15):
    add(whoosh(), at, 0.11)
add(whoosh(0.5), 13.0, 0.14)  # the claws scratch
add(boom(), 13.9, 0.6)
for k, n in enumerate((57, 64, 69, 72) if MUSIC else ()):
    add(tone(NOTE(n), 2.2, decay=1.6), 13.9 + k * 0.03, 0.09, pan=(k - 1.5) * 0.4)
for at in (6.7, 17.15, 37.3):  # mouse clicks
    add(tone(1500, 0.06, decay=70, harmonics=(1.0,)), at, 0.25)
    add(tone(700, 0.08, decay=50, harmonics=(1.0,)), at + 0.07, 0.15)
for i, at in enumerate((19.2, 23.35, 26.55, 29.5)):  # the callout pills popping in
    add(tone(NOTE(79 + (i % 2) * 2), 0.5, decay=9), at, 0.11, pan=0.4)
add(boom(), 37.3, 0.45)
for k, n in enumerate((60, 64, 67, 72, 76) if MUSIC else ()):  # the last chord
    add(tone(NOTE(n), 2.0, decay=1.8), 37.3 + k * 0.04, 0.08, pan=(k - 2) * 0.3)

# --- finish: fade in/out, keep it from clipping, save ---
mix = np.stack([L, R], axis=1)
t = np.arange(N) / SR
mix *= (np.minimum(1, t / 0.4) * np.minimum(1, (DUR - t) / 1.0))[:, None]
mix = np.tanh(mix * 1.6) / np.max(np.abs(np.tanh(mix * 1.6))) * (0.89 if MUSIC else 0.5)  # effects sit quieter, under the song
out_name = "soundtrack.wav" if MUSIC else "soundtrack-sfx.wav"
with wave.open(__file__.replace("soundtrack.py", out_name), "wb") as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(SR)
    f.writeframes((mix * 32767).astype(np.int16).tobytes())
print(out_name, "written")
