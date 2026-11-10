# Makes video/soundtrack-hype.wav: an ORIGINAL hype track built from math (no
# samples, nothing copyrighted). Fast (140 beats per minute), heavy 808 bass,
# punchy kick + clap, rolling hi-hats, a build-up and a DROP when the logo lands
# (13.9s), plus the same typing ticks / clicks as the calm version.
#   Run:  python3 video/soundtrack_hype.py
#   SFX=0 python3 video/soundtrack_hype.py -> soundtrack-hype-music.wav (music only, no typing ticks; used by edit.html)
import os
import wave
import numpy as np

SFX = os.environ.get("SFX", "1") != "0"

SR = 44100
DUR = 38.5
N = int(SR * DUR)
rng = np.random.default_rng(11)
# Separate tracks, so the music can "duck" (dip) every time the kick hits.
tracks = {name: np.zeros((N, 2)) for name in ("drums", "bass", "music", "fx")}


def add(track, sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N or i < 0:
        return
    sig = sig[: N - i] * gain
    tracks[track][i : i + len(sig), 0] += sig * (1 - max(0, pan))
    tracks[track][i : i + len(sig), 1] += sig * (1 + min(0, pan))


def times(dur):
    return np.arange(int(dur * SR)) / SR


def smooth(x, n):
    return np.convolve(x, np.ones(n) / n, mode="same")


NOTE = lambda n: 440 * 2 ** ((n - 69) / 12)  # MIDI note number -> Hz


def kick():
    t = times(0.32)
    body = np.sin(2 * np.pi * (46 * t + 110 * (1 - np.exp(-38 * t)) / 38)) * np.exp(-9 * t)
    click = rng.standard_normal(len(t)) * np.exp(-400 * t) * 0.3
    return np.tanh((body + click) * 2.2)


def bass808(note, dur):
    """The long booming bass note. Distorted a little so phone speakers can hear it."""
    t = times(dur + 0.12)
    f = NOTE(note)
    phase = 2 * np.pi * (f * t + f * 0.5 * (1 - np.exp(-30 * t)) / 30)  # starts a bit higher, slides down
    env = np.minimum(1, t / 0.004) * np.exp(-2.2 * t) * np.minimum(1, (dur + 0.12 - t) / 0.1)
    return (np.tanh(np.sin(phase) * 3.5) + 0.35 * np.sin(phase * 3) * np.exp(-6 * t)) * env


def clap():
    t = times(0.22)
    n = rng.standard_normal(len(t))
    n = n - smooth(n, 14)  # keep the bright part of the noise
    bursts = sum(np.exp(-90 * np.maximum(0, t - d)) * (t >= d) for d in (0, 0.012, 0.024))
    return n * bursts * 0.5 + np.sin(2 * np.pi * 190 * t) * np.exp(-30 * t) * 0.5


def hat(length=0.04):
    t = times(length)
    n = rng.standard_normal(len(t))
    return (n - smooth(n, 5)) * np.exp(-t * (4 / length))


def lead(note, dur=0.3):
    """A bright plucked synth note (a few stacked, slightly detuned waves)."""
    t = times(dur)
    f = NOTE(note)
    sig = sum(np.sin(2 * np.pi * f * k * t * d) / k for k in (1, 2, 3, 4, 5, 6) for d in (0.997, 1.003))
    return sig * np.minimum(1, t / 0.004) * np.exp(-9 * t)


def pad(notes, dur, bright=1.0):
    t = times(dur)
    env = np.minimum(1, t / 0.5) * np.minimum(1, (dur - t) / 0.5)
    return sum(np.sin(2 * np.pi * NOTE(n) * t) + 0.4 * bright * np.sin(2 * np.pi * NOTE(n) * 2 * t) for n in notes) * env


def riser(dur):
    """Noise that gets louder and brighter: the build-up before a drop."""
    n = int(dur * SR)
    p = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    dark = smooth(noise, 80)
    tone = np.sin(2 * np.pi * np.cumsum(200 + 1400 * p**2) / SR) * 0.15
    return ((1 - p) * dark * 5 + p * (noise - smooth(noise, 6)) * 0.5 + tone) * p**1.5


def tick(bright=1.0):
    t = times(0.03)
    return (rng.standard_normal(len(t)) * 0.5 + np.sin(2 * np.pi * 2400 * bright * t)) * np.exp(-180 * t)


# ---------- the song ----------
BEAT = 60 / 140  # seconds per beat
STEP = BEAT / 4  # a 16th note
BAR = BEAT * 4
DROP = 13.9  # the logo lands here: everything is lined up to it
END_DROP = DROP + 11 * BAR  # ~32.8s, right before the tagline
FINAL = 37.3  # the button click

# Key: F sharp minor. One bass note per bar, repeating every 4 bars.
ROOTS = [30, 30, 26, 28]  # F#, F#, D, E (low)
CHORDS = [[54, 57, 61], [54, 57, 61], [50, 54, 57], [52, 56, 59]]
# The lead melody: 2 bars of 8th notes (0 = rest). Our own tune.
RIFF = [66, 0, 73, 71, 0, 69, 66, 0, 64, 0, 69, 73, 0, 71, 69, 66]

# --- intro (0 - 12s): dark and quiet, so the drop feels huge ---
for i, at in enumerate(np.arange(0, 12.0, BAR * 2)):
    add("music", pad(CHORDS[(i * 2) % 4], BAR * 2 + 0.3, bright=0.3), at, 0.011)
add("bass", bass808(30, 1.6), 1.85, 0.9)  # the "6 MONTHS" hit
add("drums", kick(), 1.85, 0.9)
for at in (4.5, 7.2, 9.0):  # a heartbeat under the search + "zero answers"
    add("bass", bass808(30, 0.9), at, 0.6)
for k in range(6 if SFX else 0):  # the months counter
    add("fx", lead(66 + k * 2, 0.15), 0.85 + k * 0.165, 0.05)

# --- build-up (12 - 13.9s): riser + a clap roll that speeds up ---
add("fx", riser(DROP - 11.6), 11.6, 0.3)
at, gap = 12.2, 0.21
while at < DROP - 0.02:
    add("drums", clap(), at, 0.25 + 0.5 * (at - 12.2) / 1.7)
    gap = max(0.05, gap * 0.86)
    at += gap

# --- THE DROP (13.9s - 32.8s) ---
add("fx", np.tanh(bass808(18, 2.2) * 2), DROP, 0.9)  # a huge low boom on the first hit
bar = 0
while DROP + bar * BAR < END_DROP - 0.01:
    b0 = DROP + bar * BAR
    root = ROOTS[bar % 4]
    quiet = 8 <= bar < 9  # one bar with no drums in the middle, to breathe
    # 808 bass + kick together: steps 0, 3, 6, 10 (the bouncy trap pattern)
    for step, length in ((0, 3), (3, 3), (6, 4), (10, 6)):
        add("bass", bass808(root + (12 if step == 6 and bar % 2 else 0), length * STEP * 0.95), b0 + step * STEP, 0.95)
        if not quiet:
            add("drums", kick(), b0 + step * STEP, 0.95)
    if not quiet:
        add("drums", clap(), b0 + 8 * STEP, 1.0)  # clap on beat 3
        for step in range(0, 16, 2):  # hi-hats on every 8th note...
            add("drums", hat(), b0 + step * STEP, 0.42 if step % 4 else 0.55, pan=0.25)
        if bar % 2:  # ...and a fast roll at the end of every other bar
            for r in range(6):
                add("drums", hat(0.025), b0 + 13 * STEP + r * STEP / 2, 0.28 + r * 0.06, pan=-0.3)
    # melody (comes in after the first 2 bars, drops out for the breathing bar)
    if bar >= 2 and not quiet:
        for i in range(8):
            n = RIFF[(bar % 2) * 8 + i]
            if n:
                add("music", lead(n + (12 if bar >= 9 and i % 4 == 2 else 0)), b0 + i * 2 * STEP, 0.05, pan=0.35 * (-1) ** i)
    add("music", pad(CHORDS[bar % 4], BAR + 0.2), b0, 0.012)
    bar += 1
add("fx", riser(BAR), DROP + 8 * BAR, 0.16)  # small riser through the breathing bar

# --- outro (32.8s - end): strip back for the tagline, then one last hit on the click ---
for i, at in enumerate((END_DROP, END_DROP + BAR * 1.3)):
    add("music", pad(CHORDS[i * 2], BAR * 1.5, bright=0.4), at, 0.016)
for step in range(0, int((FINAL - 0.9 - END_DROP) / (2 * STEP))):
    add("drums", hat(), END_DROP + step * 2 * STEP, 0.07, pan=0.2)
add("fx", riser(1.5), FINAL - 1.5, 0.28)
add("drums", kick(), FINAL, 1.0)
add("bass", bass808(30, 1.1), FINAL, 1.0)
add("drums", clap(), FINAL, 0.5)
for n in (66, 69, 73, 78):
    add("music", lead(n, 1.1), FINAL, 0.05, pan=(n - 71) / 12)

# --- sound effects: typing ticks, mouse clicks, paper whooshes (same times as launch.html) ---
TYPING = [(0.25, 20, 9), (2.0, 22, 12), (3.1, 36, 41), (4.95, 19, 27), (7.35, 24, 14), (8.0, 22, 12), (9.75, 26, 37),
          (13.95, 18, 7), (15.55, 26, 14), (16.05, 17, 12), (18.6, 30, 31), (22.0, 28, 21), (25.15, 32, 32), (27.95, 32, 30),
          (30.7, 30, 31), (33.75, 34, 43)]
for start, cps, count in TYPING if SFX else []:
    loud = 0.05 if start < DROP else 0.03  # quieter once the beat is playing
    for i in range(count):
        add("fx", tick(0.8 + 0.4 * rng.random()), start + i / cps, loud * (0.7 + 0.6 * rng.random()), pan=rng.uniform(-0.3, 0.3))
for at in (6.7, 17.15, 37.3) if SFX else ():
    t = times(0.06)
    add("fx", np.sin(2 * np.pi * 1500 * t) * np.exp(-70 * t), at, 0.25)
for at in (8.9, 12.45, 14.7, 33.15) if SFX else ():
    n = int(0.8 * SR)
    add("fx", smooth(rng.standard_normal(n), 60) * np.sin(np.linspace(0, np.pi, n)) ** 2 * 6, at, 0.08)

# ---------- mix ----------
# "Sidechain": the melody and pads dip for a moment on every kick, which makes the kick punch through.
duck = np.ones(N)
kick_env = np.abs(smooth(tracks["drums"].mean(axis=1), 40))  # smoothing ignores the hi-hats
level = 0.0
for i in range(0, N, 64):  # follow the drum loudness in small chunks (fast enough, and quick to compute)
    level = max(kick_env[i : i + 64].max(), level * 0.965)
    duck[i : i + 64] = 1 - 0.55 * min(1, level)
# Balance: bass is strong but leaves room, so the melody and hi-hats still cut through on phone speakers.
mix = tracks["drums"] * 0.85 + tracks["bass"] * 0.42 + tracks["music"] * duck[:, None] * 6.0 + tracks["fx"]
t = np.arange(N) / SR
mix *= (np.minimum(1, t / 0.3) * np.minimum(1, (DUR - t) / 0.8))[:, None]
mix = np.tanh(mix * 1.5)  # soft limiter: loud but never crackling
mix = mix / np.max(np.abs(mix)) * 0.92
out_name = "soundtrack-hype.wav" if SFX else "soundtrack-hype-music.wav"
with wave.open(__file__.replace("soundtrack_hype.py", out_name), "wb") as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(SR)
    f.writeframes((mix * 32767).astype(np.int16).tobytes())
print(out_name, "written")
