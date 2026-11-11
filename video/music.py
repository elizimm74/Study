# Makes an ORIGINAL beat (no samples, nothing copyrighted) for a story video of any length.
#   python3 video/music.py <duration seconds> <style: hype|chill> <drop seconds> <body-end seconds> <out.wav>
# hype  = 140 beats per minute, heavy 808 bass, kick + clap + rolling hi-hats, a build-up and a drop
# chill = 92 beats per minute, soft pads, light kick and hats (for calmer, explainer-style videos)
# Before the drop it's quiet (a slow bass heartbeat); the drop lands where the story gets going;
# one last hit lands when the end card appears (body-end).
import sys
import wave
import numpy as np

duration, style, drop, body_end, out_path = float(sys.argv[1]), sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
SR = 44100
N = int(SR * duration)
rng = np.random.default_rng(11)
tracks = {k: np.zeros((N, 2)) for k in ("drums", "bass", "music", "fx")}
HYPE = style == "hype"
BPM = 140 if HYPE else 92
BEAT = 60 / BPM
STEP = BEAT / 4
BAR = BEAT * 4


def add(track, sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N or i < 0:
        return
    sig = sig[: N - i] * gain
    tracks[track][i : i + len(sig), 0] += sig * (1 - max(0, pan))
    tracks[track][i : i + len(sig), 1] += sig * (1 + min(0, pan))


def times(d):
    return np.arange(int(d * SR)) / SR


def smooth(x, n):
    return np.convolve(x, np.ones(n) / n, mode="same")


NOTE = lambda n: 440 * 2 ** ((n - 69) / 12)


def kick():
    t = times(0.32)
    body = np.sin(2 * np.pi * (46 * t + 110 * (1 - np.exp(-38 * t)) / 38)) * np.exp(-9 * t)
    return np.tanh((body + rng.standard_normal(len(t)) * np.exp(-400 * t) * 0.3) * 2.2)


def bass808(note, dur):
    t = times(dur + 0.12)
    f = NOTE(note)
    phase = 2 * np.pi * (f * t + f * 0.5 * (1 - np.exp(-30 * t)) / 30)
    env = np.minimum(1, t / 0.004) * np.exp(-2.2 * t) * np.minimum(1, (dur + 0.12 - t) / 0.1)
    return (np.tanh(np.sin(phase) * 3.5) + 0.35 * np.sin(phase * 3) * np.exp(-6 * t)) * env


def clap():
    t = times(0.22)
    n = rng.standard_normal(len(t))
    n = n - smooth(n, 14)
    bursts = sum(np.exp(-90 * np.maximum(0, t - d)) * (t >= d) for d in (0, 0.012, 0.024))
    return n * bursts * 0.5 + np.sin(2 * np.pi * 190 * t) * np.exp(-30 * t) * 0.5


def hat(length=0.04):
    t = times(length)
    n = rng.standard_normal(len(t))
    return (n - smooth(n, 5)) * np.exp(-t * (4 / length))


def lead(note, dur=0.3):
    t = times(dur)
    f = NOTE(note)
    sig = sum(np.sin(2 * np.pi * f * k * t * d) / k for k in (1, 2, 3, 4, 5, 6) for d in (0.997, 1.003))
    return sig * np.minimum(1, t / 0.004) * np.exp(-9 * t)


def pad(notes, dur, bright=1.0):
    t = times(dur)
    env = np.minimum(1, t / 0.5) * np.minimum(1, (dur - t) / 0.5)
    return sum(np.sin(2 * np.pi * NOTE(n) * t) + 0.4 * bright * np.sin(2 * np.pi * NOTE(n) * 2 * t) for n in notes) * env


def riser(dur):
    n = int(dur * SR)
    p = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    tone = np.sin(2 * np.pi * np.cumsum(200 + 1400 * p**2) / SR) * 0.15
    return ((1 - p) * smooth(noise, 80) * 5 + p * (noise - smooth(noise, 6)) * 0.5 + tone) * p**1.5


ROOTS = [30, 30, 26, 28]  # F# F# D E (low), F# minor
CHORDS = [[54, 57, 61], [54, 57, 61], [50, 54, 57], [52, 56, 59]]
RIFF = [66, 0, 73, 71, 0, 69, 66, 0, 64, 0, 69, 73, 0, 71, 69, 66]
drop = min(max(drop, 0.0), max(0.0, duration - 2))

# quiet intro: a pad and a slow bass heartbeat
for i, at in enumerate(np.arange(0, drop + 0.01, BAR * 2)):
    add("music", pad(CHORDS[(i * 2) % 4], BAR * 2 + 0.3, bright=0.3), at, 0.011 if HYPE else 0.02)
for at in np.arange(0.4, max(0.5, drop - 0.3), BEAT * 2):
    add("bass", bass808(30, 0.6), at, 0.5 if HYPE else 0.3)
if drop > 1.6:
    add("fx", riser(1.2), drop - 1.2, 0.3)
    at, gap = drop - 1.2, 0.18
    while at < drop - 0.02:
        add("drums", clap(), at, 0.3 + 0.5 * (at - (drop - 1.2)) / 1.2)
        gap = max(0.05, gap * 0.86)
        at += gap

# the drop, then the groove until the end card
add("fx", np.tanh(bass808(18, 2.0) * 2), drop, 0.9)
end_groove = min(body_end, duration - 0.5)
bar = 0
while drop + bar * BAR < end_groove - 0.01:
    b0 = drop + bar * BAR
    root = ROOTS[bar % 4]
    quiet = HYPE and bar % 8 == 7  # a bar with no drums every 8 bars, to breathe
    if HYPE:
        for step, length in ((0, 3), (3, 3), (6, 4), (10, 6)):
            add("bass", bass808(root + (12 if step == 6 and bar % 2 else 0), length * STEP * 0.95), b0 + step * STEP, 0.95)
            if not quiet:
                add("drums", kick(), b0 + step * STEP, 0.95)
        if not quiet:
            add("drums", clap(), b0 + 8 * STEP, 1.0)
            for step in range(0, 16, 2):
                add("drums", hat(), b0 + step * STEP, 0.42 if step % 4 else 0.55, pan=0.25)
            if bar % 2:
                for r in range(6):
                    add("drums", hat(0.025), b0 + 13 * STEP + r * STEP / 2, 0.28 + r * 0.06, pan=-0.3)
        if bar >= 1 and not quiet:
            for i in range(8):
                n = RIFF[(bar % 2) * 8 + i]
                if n:
                    add("music", lead(n), b0 + i * 2 * STEP, 0.05, pan=0.35 * (-1) ** i)
        add("music", pad(CHORDS[bar % 4], BAR + 0.2), b0, 0.012)
    else:  # chill
        add("bass", bass808(root + 12, BAR * 0.9), b0, 0.55)
        add("drums", kick(), b0, 0.6)
        add("drums", kick(), b0 + 2.5 * BEAT, 0.45)
        add("drums", clap(), b0 + BEAT, 0.35)
        add("drums", clap(), b0 + 3 * BEAT, 0.35)
        for step in range(0, 16, 2):
            add("drums", hat(), b0 + step * STEP, 0.16, pan=0.2)
        for i in range(4):
            n = RIFF[(bar % 2) * 8 + i * 2] or RIFF[(bar % 2) * 8 + i * 2 + 1]
            add("music", lead(n, 0.45), b0 + i * BEAT, 0.035, pan=0.3 * (-1) ** i)
        add("music", pad(CHORDS[bar % 4], BAR + 0.2), b0, 0.03)
    bar += 1

# the end card: one last hit
add("drums", kick(), body_end, 1.0)
add("bass", bass808(30, 1.0), body_end, 1.0)
add("drums", clap(), body_end, 0.5)
for n in (66, 69, 73, 78):
    add("music", lead(n, 1.0), body_end, 0.05, pan=(n - 71) / 12)

# mix: the melody dips on every kick ("sidechain"), then a soft limiter so it never crackles
kick_env = np.abs(smooth(tracks["drums"].mean(axis=1), 40))
duck = np.ones(N)
level = 0.0
for i in range(0, N, 64):
    level = max(kick_env[i : i + 64].max(), level * 0.965)
    duck[i : i + 64] = 1 - 0.55 * min(1, level)
mix = tracks["drums"] * 0.85 + tracks["bass"] * (0.42 if HYPE else 0.5) + tracks["music"] * duck[:, None] * (6.0 if HYPE else 5.0) + tracks["fx"]
t = np.arange(N) / SR
mix *= (np.minimum(1, t / 0.3) * np.minimum(1, (duration - t) / 0.8))[:, None]
mix = np.tanh(mix * 1.5)
mix = mix / np.max(np.abs(mix)) * 0.92
with wave.open(out_path, "wb") as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(SR)
    f.writeframes((mix * 32767).astype(np.int16).tobytes())
print(f"{out_path} written ({duration:.1f}s, {style})")
