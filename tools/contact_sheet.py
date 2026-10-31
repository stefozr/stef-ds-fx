"""Compose a contact sheet: one row per effect (label + N frames over a grey backdrop).

Input (stdin): JSON list of {"label": str, "file": str | null}. Args: <out.png> <frames>.
Frames come from ffmpeg (libvpx-vp9 decoding keeps the alpha channel of the effect webms). Read-only on the inputs.
"""
import json
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

CELL_W, CELL_H, LABEL_H, PAD = 240, 150, 18, 4
BACKDROP = (88, 88, 92)
# A TrueType font for the labels (CONTACT_SHEET_FONT overrides it); Pillow's default font when it is missing.
FONT = os.environ.get("CONTACT_SHEET_FONT", "C:/Windows/Fonts/arial.ttf")


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True, text=True,
    ).stdout.strip()
    try:
        return float(out)
    except ValueError:
        return 0.0


def frame(path, t, tmp):
    target = os.path.join(tmp, "f.png")
    if os.path.exists(target):
        os.remove(target)
    cmd = ["ffmpeg", "-v", "error", "-y"]
    if path.lower().endswith(".webm"):
        cmd += ["-c:v", "libvpx-vp9"]
    cmd += ["-ss", f"{t:.2f}", "-i", path, "-frames:v", "1", target]
    subprocess.run(cmd, capture_output=True)
    if not os.path.exists(target):
        return None
    with Image.open(target) as im:
        return im.convert("RGBA")


def union_box(shots):
    """Bounding box of everything visible in any frame (big canvases hold small effects), with a margin."""
    box = None
    for shot in shots:
        if shot is None:
            continue
        b = shot.getchannel("A").point(lambda a: 255 if a > 24 else 0).getbbox()
        if b:
            box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    if box is None:
        return None
    w, h = shots[0].size if shots[0] is not None else (box[2], box[3])
    m = max(8, (box[2] - box[0] + box[3] - box[1]) // 20)
    return (max(0, box[0] - m), max(0, box[1] - m), min(w, box[2] + m), min(h, box[3] + m))


def fit(im):
    im = im.copy()
    im.thumbnail((CELL_W, CELL_H))
    cell = Image.new("RGBA", (CELL_W, CELL_H), BACKDROP + (255,))
    cell.alpha_composite(im, ((CELL_W - im.width) // 2, (CELL_H - im.height) // 2))
    return cell


def main():
    out, count = sys.argv[1], int(sys.argv[2])
    items = json.load(sys.stdin)
    font = ImageFont.truetype(FONT, 13) if os.path.exists(FONT) else ImageFont.load_default()
    row_h = LABEL_H + CELL_H + PAD
    sheet = Image.new("RGBA", (count * (CELL_W + PAD) + PAD, len(items) * row_h + PAD), (30, 30, 34, 255))
    draw = ImageDraw.Draw(sheet)
    with tempfile.TemporaryDirectory() as tmp:
        for r, item in enumerate(items):
            y = PAD + r * row_h
            path = item.get("file")
            if not path or not os.path.exists(path):
                draw.text((PAD, y), item["label"], fill=(235, 235, 235), font=font)
                draw.text((PAD, y + LABEL_H + 4), "(missing)", fill=(255, 120, 120), font=font)
                continue
            if path.lower().endswith((".webp", ".png", ".jpg", ".jpeg")) and not path.lower().endswith(".webm"):
                with Image.open(path) as im:
                    shots = [im.convert("RGBA")]
            else:
                d = duration(path) or 1.0
                shots = [frame(path, d * (i + 1) / (count + 1), tmp) for i in range(count)]
                item["label"] += f"   ({d:.1f} s)"
            draw.text((PAD, y), item["label"], fill=(235, 235, 235), font=font)
            box = union_box([s for s in shots if s is not None] or [None])
            for c, shot in enumerate(shots):
                if shot is not None:
                    sheet.alpha_composite(fit(shot.crop(box) if box else shot), (PAD + c * (CELL_W + PAD), y + LABEL_H))
    sheet.convert("RGB").save(out)
    print(f"contact sheet: {len(items)} rows -> {out}")


if __name__ == "__main__":
    main()
