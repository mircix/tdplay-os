#!/usr/bin/env python3
"""Chrome Web Store artwork for chrome-sidepanel/.

    python3 tools/store_shot.py shot.png dist/store-1.png      # pad a screenshot to exactly 1280x800
    python3 tools/store_shot.py shot.png dist/store-1.png --size 640x400
    python3 tools/store_shot.py --tile dist/store-tile.png     # the 440x280 small promo tile

Screenshots must be exactly 1280x800 or 640x400. A capture that is larger is scaled down to fit and
centred on the OS's own near-black; a smaller one is centred at its real size rather than blurred up.
"""
import argparse, os, sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("pip3 install --user Pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG = (7, 7, 12)
GOLD = (255, 209, 102)


def canvas(size):
    w, h = size
    im = Image.new("RGB", size, BG)
    d = ImageDraw.Draw(im)
    for y in range(h):                                   # a faint top-down lift, like the OS desktop
        f = 1 - y / float(h)
        d.line([(0, y), (w, y)], fill=(int(7 + 16 * f), int(7 + 14 * f), int(12 + 26 * f)))
    return im


def pad(src, out, size):
    shot = Image.open(src).convert("RGB")
    if shot.width > size[0] or shot.height > size[1]:
        k = min(size[0] / float(shot.width), size[1] / float(shot.height))
        shot = shot.resize((max(1, int(shot.width * k)), max(1, int(shot.height * k))), Image.LANCZOS)
    im = canvas(size)
    im.paste(shot, ((size[0] - shot.width) // 2, (size[1] - shot.height) // 2))
    im.save(out)
    print("%s  %dx%d  (from %dx%d)" % (os.path.relpath(out, ROOT), size[0], size[1], shot.width, shot.height))


def font(px):
    p = os.path.join(ROOT, "assets", "Oswald.ttf")
    try:
        return ImageFont.truetype(p, px)
    except Exception:
        return ImageFont.load_default()


def tile(out, size=(440, 280)):
    im = canvas(size)
    d = ImageDraw.Draw(im)
    logo = Image.open(os.path.join(ROOT, "assets", "logo.png")).convert("RGBA")
    s = 104
    logo = logo.resize((s, s), Image.LANCZOS)
    im.paste(logo, ((size[0] - s) // 2, 42), logo)
    big, small = font(34), font(17)
    for text, y, fill, f in [("TDPlay OS", 160, (255, 255, 255), big), ("Instagram side panel", 204, GOLD, small)]:
        w = d.textbbox((0, 0), text, font=f)[2]
        d.text(((size[0] - w) // 2, y), text, font=f, fill=fill)
    im.save(out)
    print("%s  %dx%d" % (os.path.relpath(out, ROOT), size[0], size[1]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src", nargs="?", help="screenshot to pad")
    ap.add_argument("out", nargs="?", help="where to write it")
    ap.add_argument("--size", default="1280x800", help="1280x800 (default) or 640x400")
    ap.add_argument("--tile", metavar="OUT", help="write the 440x280 promo tile instead")
    a = ap.parse_args()
    if a.tile:
        os.makedirs(os.path.dirname(os.path.abspath(a.tile)), exist_ok=True)
        tile(a.tile)
        return
    if not (a.src and a.out):
        ap.error("give a screenshot and an output path, or --tile OUT")
    if a.size not in ("1280x800", "640x400"):
        ap.error("--size must be 1280x800 or 640x400")
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    pad(a.src, a.out, tuple(int(n) for n in a.size.split("x")))


if __name__ == "__main__":
    main()
