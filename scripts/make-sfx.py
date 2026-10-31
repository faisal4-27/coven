"""Generate placeholder 8-bit chiptune sounds into public/sfx as mp3.

Usage:
  python3 scripts/make-sfx.py            # needs ffmpeg with libmp3lame on PATH

Pure standard library synthesis (square, triangle, noise) written to WAV, then encoded with ffmpeg.
Replace any file in public/sfx with a better one of the same name and nothing else needs to change.
"""
import math
import os
import random
import struct
import subprocess
import tempfile
import wave

RATE = 22050
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sfx")

NOTE = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4, "F#": -3, "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}


def hz(name):
    """'A4' -> 440.0"""
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((NOTE[pitch] + (octave - 4) * 12) / 12)


def square(phase, duty=0.5):
    return 1.0 if (phase % 1.0) < duty else -1.0


def triangle(phase):
    p = phase % 1.0
    return 4 * p - 1 if p < 0.5 else 3 - 4 * p


def env(t, dur, attack=0.005, release=0.06):
    """Linear attack, linear release. Keeps every sound click-free at both ends."""
    if t < attack:
        return t / attack
    if t > dur - release:
        return max(0.0, (dur - t) / release)
    return 1.0


class Track:
    def __init__(self, seconds):
        self.buf = [0.0] * int(seconds * RATE)

    def tone(self, start, dur, freq, vol=0.3, wave_fn=square, duty=0.5, glide=0.0, vibrato=0.0, decay=0.0):
        """Add a note. glide: semitones over the note. vibrato: semitone depth at 6 Hz. decay: exp decay rate."""
        phase = 0.0
        n0 = int(start * RATE)
        for i in range(int(dur * RATE)):
            t = i / RATE
            semis = glide * (t / dur) + vibrato * math.sin(2 * math.pi * 6 * t)
            f = freq * 2 ** (semis / 12)
            phase += f / RATE
            s = wave_fn(phase, duty) if wave_fn is square else wave_fn(phase)
            a = vol * env(t, dur) * (math.exp(-decay * t) if decay else 1.0)
            j = n0 + i
            if j < len(self.buf):
                self.buf[j] += s * a

    def noise(self, start, dur, vol=0.2, decay=8.0, hold=1):
        """8-bit style noise: a new random value every `hold` samples."""
        n0 = int(start * RATE)
        v = 0.0
        for i in range(int(dur * RATE)):
            if i % hold == 0:
                v = random.uniform(-1, 1)
            t = i / RATE
            j = n0 + i
            if j < len(self.buf):
                self.buf[j] += v * vol * env(t, dur) * math.exp(-decay * t)

    def write(self, name):
        peak = max(1e-9, max(abs(x) for x in self.buf))
        gain = min(1.0, 0.89 / peak)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            path = tmp.name
        with wave.open(path, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(RATE)
            w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, x * gain)) * 32767)) for x in self.buf))
        dest = os.path.join(OUT, f"{name}.mp3")
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-codec:a", "libmp3lame", "-b:a", "96k", dest],
            check=True,
        )
        os.unlink(path)
        print("wrote", os.path.relpath(dest))


def monsters():
    t = Track(1.1)  # Banshee: rising wail with heavy vibrato
    t.tone(0.0, 1.05, hz("E5"), vol=0.3, wave_fn=triangle, glide=7, vibrato=0.6)
    t.tone(0.05, 1.0, hz("E5") * 1.01, vol=0.12, duty=0.125, glide=7, vibrato=0.6)
    t.write("banshee")

    t = Track(0.6)  # Hob: bouncy kitchen bloops
    for i, n in enumerate(["C5", "E5", "G5", "E5", "C6"]):
        t.tone(i * 0.09, 0.08, hz(n), vol=0.26, duty=0.25, glide=-2)
    t.noise(0.0, 0.05, vol=0.08, hold=6)
    t.write("hob")

    t = Track(1.0)  # Zombie: low sliding groan
    t.tone(0.0, 0.95, 92, vol=0.32, duty=0.5, glide=-5, vibrato=0.3)
    t.tone(0.0, 0.95, 92 * 1.5, vol=0.1, duty=0.25, glide=-5)
    t.noise(0.0, 0.9, vol=0.06, decay=1.5, hold=12)
    t.write("zombie")


def moments():
    t = Track(1.2)  # Banshee full moon: shimmering arpeggio with echo
    for rep, vol in ((0.0, 0.24), (0.3, 0.1)):
        for i, n in enumerate(["A5", "C6", "E6", "A6"]):
            t.tone(rep + i * 0.07, 0.25, hz(n), vol=vol, wave_fn=triangle, decay=6)
    t.write("banshee-moon")

    t = Track(0.8)  # Hob meal ready: oven ding
    t.tone(0.0, 0.18, hz("G5"), vol=0.24, wave_fn=triangle, decay=4)
    t.tone(0.14, 0.6, hz("C6"), vol=0.28, wave_fn=triangle, decay=4)
    t.tone(0.14, 0.6, hz("C7"), vol=0.05, duty=0.125, decay=6)
    t.write("hob-meal")

    t = Track(0.9)  # Zombie reorganize: shuffle down, snap back up
    for i, n in enumerate(["G4", "E4", "C4", "C5", "G5"]):
        t.tone(i * 0.11, 0.1, hz(n), vol=0.24, duty=0.5 if i < 3 else 0.25)
    t.noise(0.0, 0.3, vol=0.05, decay=4, hold=20)
    t.write("zombie-reorganize")

    t = Track(1.6)  # Seance summon: rumble that rises into a chord
    t.noise(0.0, 1.0, vol=0.1, decay=1.0, hold=30)
    t.tone(0.0, 1.0, 70, vol=0.25, duty=0.5, glide=12)
    for n in ("A4", "C5", "E5"):
        t.tone(0.9, 0.65, hz(n), vol=0.14, wave_fn=triangle, decay=2.5)
    t.write("seance-summon")


def ui():
    t = Track(0.05)  # Click: tiny tick
    t.tone(0.0, 0.03, 1800, vol=0.3, duty=0.5)
    t.write("click")

    t = Track(0.25)  # Transition: quick upward swoosh
    t.tone(0.0, 0.2, 300, vol=0.16, duty=0.125, glide=19)
    t.noise(0.0, 0.2, vol=0.06, decay=10, hold=3)
    t.write("transition")

    t = Track(0.35)  # Success: two notes up
    t.tone(0.0, 0.1, hz("E5"), vol=0.26, duty=0.25)
    t.tone(0.1, 0.22, hz("A5"), vol=0.26, duty=0.25, decay=5)
    t.write("success")

    t = Track(0.4)  # Error: two notes down, buzzy
    t.tone(0.0, 0.14, hz("A3"), vol=0.3, duty=0.5)
    t.tone(0.15, 0.22, hz("F3"), vol=0.3, duty=0.5, decay=4)
    t.write("error")

    t = Track(0.06)  # Blip: dialogue text tick, pitched per monster at runtime
    t.tone(0.0, 0.045, 660, vol=0.3, duty=0.25)
    t.write("blip")


def ambient():
    """30 s night loop. Drone frequencies complete whole cycles in 30 s and the edges fade very slightly,
    so the loop point has no click."""
    secs = 30
    t = Track(secs)
    for f, vol in ((110, 0.07), (165, 0.04)):  # A2 and E3: 3300 and 4950 cycles in 30 s
        phase = 0.0
        for i in range(secs * RATE):
            tt = i / RATE
            lfo = 0.75 + 0.25 * math.sin(2 * math.pi * tt / 10)  # 3 full cycles
            edge = min(1.0, tt / 0.25, (secs - tt) / 0.25)
            phase += f / RATE
            t.buf[i] += triangle(phase) * vol * lfo * edge
    random.seed(13)
    scale = ["A4", "C5", "D5", "E5", "G5", "A5"]
    at = 1.5
    while at < secs - 3:
        t.tone(at, 2.2, hz(random.choice(scale)), vol=0.05, wave_fn=triangle, decay=1.4)
        at += random.choice([2.5, 3.0, 3.5, 4.5])
    for c in (4.0, 11.0, 19.5, 25.0):  # crickets
        for k in range(3):
            t.tone(c + k * 0.07, 0.04, 4200, vol=0.015, duty=0.5)
    t.write("ambient")


if __name__ == "__main__":
    random.seed(7)
    os.makedirs(OUT, exist_ok=True)
    monsters()
    moments()
    ui()
    ambient()
