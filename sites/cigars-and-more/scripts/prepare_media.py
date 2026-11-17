#!/usr/bin/env python3
"""Cigars & More media pipeline.

Turns the original photographs and videos taken at the store into optimized,
responsive web media for the demo site. Originals are only read, never changed.

Usage (run from sites/cigars-and-more/):
    python3 -I scripts/prepare_media.py [--src media-src] [--out site/media] [--work media-work]

Steps:
 1. Inventory every expected source file (ffprobe): format, dimensions, duration.
 2. Extract 8 candidate stills from each video and score them for sharpness and
    exposure; write a contact sheet per video to media-work/ for human review.
 3. Pick the stills each slot needs (sharpest frame per time bucket), unless
    media-selection.json pins exact timestamps.
 4. Apply a restrained correction (light auto-levels, partial white balance that
    keeps the warm tungsten character). No generative edits, no re-composition.
 5. Write WebP + JPEG at responsive widths, a dedicated mobile crop for the hero,
    compressed muted MP4 clips with poster frames.
 6. Write site/media/media.generated.js (consumed by the site) and
    media-work/asset-report.json (filenames, dimensions, provenance).

Missing source files are reported and skipped; the site keeps showing a clearly
labeled "photo pending" panel for those slots.
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps, ImageStat

ROOT = Path(__file__).resolve().parent.parent

# What each source file feeds. Keep in sync with site/media-plan.js.
SOURCES = {
    "IMG_2013.jpg": {"kind": "image", "role": "Exterior: night storefront, red CIGARS & MORE sign"},
    "IMG_2014.mov": {"kind": "video", "role": "Glass display cabinetry, several perspectives"},
    "IMG_2015.jpg": {"kind": "image", "role": "Decorative glass display, close-up"},
    "IMG_2016.jpg": {"kind": "image", "role": "Glass display"},
    "IMG_2017.jpg": {"kind": "image", "role": "Smoking accessories and shelf merchandise"},
    "IMG_2018.mov": {"kind": "video", "role": "Cigar cabinets, several perspectives (Digital Humidor source)"},
    "IMG_2019.jpg": {"kind": "image", "role": "Cigar cabinet and wooden display detail"},
    "IMG_2020.jpg": {"kind": "image", "role": "Cigar cabinet"},
    "IMG_2021.mov": {"kind": "video", "role": "Interior shelving"},
}

# slot id -> how to produce it
SLOTS = {
    "hero":        {"from": "IMG_2013.jpg", "widths": [1000, 1600, 2400], "mobile_crop": (4, 5)},
    "humidor-1":   {"from": "IMG_2018.mov", "frame": 0, "of": 4, "widths": [800, 1600, 2400]},
    "humidor-2":   {"from": "IMG_2018.mov", "frame": 1, "of": 4, "widths": [800, 1600, 2400]},
    "humidor-3":   {"from": "IMG_2018.mov", "frame": 2, "of": 4, "widths": [800, 1600, 2400]},
    "humidor-4":   {"from": "IMG_2018.mov", "frame": 3, "of": 4, "widths": [800, 1600, 2400]},
    "humidor-5":   {"from": "IMG_2019.jpg", "widths": [800, 1600, 2400]},
    "humidor-6":   {"from": "IMG_2020.jpg", "widths": [800, 1600, 2400]},
    "glass-1":     {"from": "IMG_2015.jpg", "widths": [800, 1600, 2400]},
    "glass-2":     {"from": "IMG_2016.jpg", "widths": [800, 1600, 2400]},
    "glass-still": {"from": "IMG_2014.mov", "frame": 0, "of": 1, "widths": [800, 1600]},
    "accessories": {"from": "IMG_2017.jpg", "widths": [800, 1600, 2400]},
    "shelves-still": {"from": "IMG_2021.mov", "frame": 0, "of": 1, "widths": [800, 1600, 2400]},
    "glass-clip":  {"from": "IMG_2014.mov", "clip": True},
    "shelves-clip": {"from": "IMG_2021.mov", "clip": True},
}

CANDIDATES_PER_VIDEO = 8
CLIP_MAX_SECONDS = 14


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def find_source(src_dir: Path, name: str):
    stem = Path(name).stem.lower()
    want_video = Path(name).suffix.lower() == ".mov"
    for p in sorted(src_dir.glob("*")):
        if p.stem.lower() != stem:
            continue
        ext = p.suffix.lower()
        if want_video and ext in (".mov", ".mp4", ".m4v"):
            return p
        if not want_video and ext in (".jpg", ".jpeg", ".png", ".heic", ".webp"):
            return p
    return None


def probe(path: Path):
    out = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", str(path)]).stdout
    data = json.loads(out)
    v = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), {})
    w, h = v.get("width"), v.get("height")
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(sd["rotation"])
    if abs(rot) in (90, 270) and w and h:
        w, h = h, w
    return {
        "codec": v.get("codec_name"),
        "width": w,
        "height": h,
        "duration": float(data.get("format", {}).get("duration") or 0) or None,
        "bytes": int(data.get("format", {}).get("size") or 0),
        "has_audio": any(s.get("codec_type") == "audio" for s in data.get("streams", [])),
    }


def open_image(path: Path) -> Image.Image:
    img = Image.open(path)
    img = ImageOps.exif_transpose(img)
    return img.convert("RGB")


def sharpness(img: Image.Image) -> float:
    small = img.convert("L").resize((480, max(1, int(480 * img.height / img.width))))
    edges = small.filter(ImageFilter.FIND_EDGES)
    return ImageStat.Stat(edges).var[0]


def exposure_penalty(img: Image.Image) -> float:
    mean = ImageStat.Stat(img.convert("L")).mean[0]
    return abs(mean - 110) / 110  # 0 = well exposed


def grade(img: Image.Image) -> Image.Image:
    """Restrained correction: light levels stretch + partial gray-world balance.

    Store lighting is warm by design, so white balance only moves channels a
    third of the way toward neutral and never more than 6%.
    """
    leveled = ImageOps.autocontrast(img, cutoff=0.4, preserve_tone=True)
    out = Image.blend(img, leveled, 0.55)
    r, g, b = ImageStat.Stat(out).mean
    gray = (r + g + b) / 3
    gains = []
    for c in (r, g, b):
        full = gray / c if c else 1
        partial = 1 + (full - 1) * 0.33
        gains.append(max(0.94, min(1.06, partial)))
    channels = [ch.point(lambda v, k=k: min(255, int(v * k))) for ch, k in zip(out.split(), gains)]
    return Image.merge("RGB", channels)


def crop_ratio(img: Image.Image, rw: int, rh: int, fx=0.5, fy=0.45) -> Image.Image:
    w, h = img.size
    target = rw / rh
    if w / h > target:
        nw = int(h * target)
        x = int(max(0, min(w - nw, fx * w - nw / 2)))
        return img.crop((x, 0, x + nw, h))
    nh = int(w / target)
    y = int(max(0, min(h - nh, fy * h - nh / 2)))
    return img.crop((0, y, w, y + nh))


def write_variants(img: Image.Image, out_dir: Path, base: str, widths):
    out = []
    for w in widths:
        if w > img.width and out:
            continue  # never upscale; keep at least one size
        tw = min(w, img.width)
        th = round(img.height * tw / img.width)
        r = img.resize((tw, th), Image.LANCZOS)
        r.save(out_dir / f"{base}-{tw}.webp", "WEBP", quality=80, method=6)
        r.save(out_dir / f"{base}-{tw}.jpg", "JPEG", quality=82, optimize=True, progressive=True)
        out.append({"w": tw, "h": th, "webp": f"media/{base}-{tw}.webp", "jpg": f"media/{base}-{tw}.jpg"})
    return out


def extract_candidates(video: Path, info: dict, work: Path):
    cdir = work / "candidates" / video.stem
    if cdir.exists():
        shutil.rmtree(cdir)
    cdir.mkdir(parents=True)
    dur = info["duration"] or 1
    cands = []
    for i in range(CANDIDATES_PER_VIDEO):
        t = dur * (0.05 + 0.9 * i / max(1, CANDIDATES_PER_VIDEO - 1))
        f = cdir / f"t{t:07.2f}.png"
        run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", str(video), "-frames:v", "1", str(f)])
        img = open_image(f)
        cands.append({"t": round(t, 2), "file": str(f),
                      "sharpness": round(sharpness(img), 1), "exposure_penalty": round(exposure_penalty(img), 3)})
    # contact sheet for human review
    thumbs = [Image.open(c["file"]).convert("RGB") for c in cands]
    tw = 360
    th = round(thumbs[0].height * tw / thumbs[0].width)
    cols = 4
    sheet = Image.new("RGB", (cols * tw, ((len(thumbs) + cols - 1) // cols) * th), "black")
    for i, t in enumerate(thumbs):
        sheet.paste(t.resize((tw, th)), ((i % cols) * tw, (i // cols) * th))
    sheet.save(work / f"contact-{video.stem}.jpg", quality=80)
    return cands


def pick_frames(cands, count, pinned):
    if pinned:
        return pinned[:count]
    buckets = [cands[i * len(cands) // count:(i + 1) * len(cands) // count] for i in range(count)]
    picks = []
    for b in buckets:
        best = max(b, key=lambda c: c["sharpness"] * (1 - min(0.8, c["exposure_penalty"])))
        picks.append(best["t"])
    return picks


def frame_at(video: Path, t: float, work: Path) -> Image.Image:
    f = work / f"frame-{video.stem}-{t:.2f}.png"
    run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", str(video), "-frames:v", "1", str(f)])
    return open_image(f)


def encode_clip(video: Path, info: dict, out: Path, base: str):
    portrait = (info["height"] or 0) > (info["width"] or 0)
    scale = "scale=720:-2" if portrait else "scale=-2:720"
    dur = min(CLIP_MAX_SECONDS, info["duration"] or CLIP_MAX_SECONDS)
    mp4 = out / f"{base}.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-t", f"{dur:.2f}", "-vf", f"{scale},format=yuv420p",
         "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-an", "-movflags", "+faststart", str(mp4)])
    return {"mp4": f"media/{base}.mp4", "bytes": mp4.stat().st_size, "seconds": round(dur, 2)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=str(ROOT / "media-src"))
    ap.add_argument("--out", default=str(ROOT / "site" / "media"))
    ap.add_argument("--work", default=str(ROOT / "media-work"))
    args = ap.parse_args()
    src, out, work = Path(args.src), Path(args.out), Path(args.work)
    out.mkdir(parents=True, exist_ok=True)
    work.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*"):
        if old.name != ".gitkeep":
            old.unlink()

    sel_path = ROOT / "media-selection.json"
    selection = json.loads(sel_path.read_text()) if sel_path.exists() else {}
    focal = selection.get("focal", {})

    report = {"sources": {}, "slots": {}, "missing": []}
    found = {}
    for name, meta in SOURCES.items():
        p = find_source(src, name)
        if not p:
            report["missing"].append(name)
            print(f"MISSING  {name}  ({meta['role']})")
            continue
        info = probe(p)
        if meta["kind"] == "image":
            info["duration"] = None
        found[name] = (p, info)
        report["sources"][name] = {"file": p.name, **meta, **info}
        print(f"OK       {name}  {info['width']}x{info['height']}  {str(info['duration']) + 's' if info['duration'] else ''}")

    cands = {}
    for name, (p, info) in found.items():
        if SOURCES[name]["kind"] == "video":
            cands[name] = extract_candidates(p, info, work)
            report["sources"][name]["candidates"] = cands[name]

    generated = {}
    picks_cache = {}
    for slot, spec in SLOTS.items():
        name = spec["from"]
        if name not in found:
            continue
        p, info = found[name]
        entry = {"source": name}
        if spec.get("clip"):
            entry["clip"] = encode_clip(p, info, out, slot)
            poster_t = pick_frames(cands[name], 1, None)[0]
            poster = grade(frame_at(p, poster_t, work))
            entry["poster"] = write_variants(poster, out, f"{slot}-poster", [1280])
            generated[slot] = entry
            report["slots"][slot] = entry
            continue
        if "frame" in spec:
            key = (name, spec["of"])
            if key not in picks_cache:
                picks_cache[key] = pick_frames(cands[name], spec["of"], selection.get(name))
            t = picks_cache[key][spec["frame"]]
            img = frame_at(p, t, work)
            entry["frameSeconds"] = t
        else:
            img = open_image(p)
        img = grade(img)
        entry["sizes"] = write_variants(img, out, slot, spec["widths"])
        entry["aspect"] = round(img.width / img.height, 4)
        if spec.get("mobile_crop"):
            fx, fy = focal.get(slot, [0.5, 0.45])
            m = crop_ratio(img, *spec["mobile_crop"], fx=fx, fy=fy)
            entry["mobile"] = write_variants(m, out, f"{slot}-mobile", [800, 1200])
        generated[slot] = entry
        report["slots"][slot] = entry

    (out / "media.generated.js").write_text(
        "/* Generated by scripts/prepare_media.py. Do not edit by hand. */\n"
        f"window.CM_MEDIA_FILES = {json.dumps(generated, indent=1)};\n")
    (work / "asset-report.json").write_text(json.dumps(report, indent=1))
    total = sum(f.stat().st_size for f in out.glob("*"))
    print(f"\nWrote {len(generated)} slots, {total/1e6:.1f} MB to {out}")
    if report["missing"]:
        print(f"{len(report['missing'])} source file(s) missing; those slots stay 'photo pending'.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
