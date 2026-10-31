"""Process voiced dialogue lines into public/voice for the speech bubbles.

Usage:
  python3 scripts/make-voices.py results.json

results.json maps a line id (lineId() in src/shared/dialogue.ts, e.g. "vampire-tu5a7m") to the URL or local
path of its raw recording (we generated them with Higgsfield's seed_audio voices). Each file is trimmed,
given a light lo-fi filter so it sits with the 8-bit sound effects, loudness matched, and written to
public/voice/<id>.mp3. src/shared/voiceLines.json records each line's duration in ms, which the app uses to
pace typing and to know which lines have a voice. Needs ffmpeg with libmp3lame.
"""
import json
import os
import subprocess
import sys
import tempfile

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "public", "voice")
# Imported by src/shared/sound.ts, so it lives in src rather than public.
MANIFEST = os.path.join(ROOT, "src", "shared", "voiceLines.json")

# Trim leading/trailing silence, shorten long internal gaps, then band-limit and lightly bit-crush for a
# retro radio feel. Loudness is normalised low (-20 LUFS) so a presenter can talk over it.
FILTER = ",".join(
    [
        "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05",
        "areverse",
        "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08",
        "areverse",
        "highpass=f=170",
        "lowpass=f=6500",
        "acrusher=bits=11:mode=log:aa=1:mix=0.25",
        "loudnorm=I=-20:TP=-2:LRA=9",
        "aresample=24000",
    ]
)


def fetch(src, dest):
    if os.path.exists(src):
        with open(src, "rb") as f, open(dest, "wb") as g:
            g.write(f.read())
    else:
        # curl rather than urllib: python.org builds on macOS often lack CA certificates.
        subprocess.run(["curl", "-sfL", "--retry", "2", "-o", dest, src], check=True)


def duration_ms(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True,
    ).stdout
    return round(float(out) * 1000)


def main(results_path):
    os.makedirs(OUT, exist_ok=True)
    manifest_path = MANIFEST
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
    failed = []
    for line_id, src in json.load(open(results_path)).items():
        dest = os.path.join(OUT, f"{line_id}.mp3")
        if not os.path.exists(dest):  # already processed lines are reused, so reruns only fetch what's missing
            try:
                with tempfile.TemporaryDirectory() as tmp:
                    raw = os.path.join(tmp, "raw")
                    fetch(src, raw)
                    subprocess.run(
                        ["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", FILTER, "-ac", "1",
                         "-codec:a", "libmp3lame", "-b:a", "48k", dest],
                        check=True,
                    )
            except subprocess.CalledProcessError as e:
                failed.append(line_id)
                print(f"{line_id}: failed ({e.returncode}), rerun to retry")
                continue
        manifest[line_id] = duration_ms(dest)
    with open(manifest_path, "w") as f:
        json.dump(dict(sorted(manifest.items())), f, indent=1)
    print(f"{len(manifest)} voiced lines in {os.path.relpath(manifest_path)}")
    if failed:
        sys.exit(f"{len(failed)} failed: {', '.join(failed)}")


if __name__ == "__main__":
    main(sys.argv[1])
