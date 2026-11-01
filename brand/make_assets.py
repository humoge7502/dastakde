"""DastakDe brand asset generator.

The mark is a bold white "D" whose counter is an amber knocker — the initial
of the name plus the sound of an opportunity knocking. Flat, geometric, no
text, legible at 48 px.

Palette: ink #191033, violet #6D28D9, deep violet #3B1478,
         amber #F59E0B, paper #FBF9FF.

Usage:  python brand/make_assets.py
Output: brand/assets/*.png
"""

from __future__ import annotations

import os

from PIL import Image, ImageChops, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "assets")

INK = (25, 16, 51)          # #191033
VIOLET = (109, 40, 217)     # #6D28D9
DEEP_VIOLET = (59, 20, 120)  # #3B1478
AMBER = (245, 158, 11)      # #F59E0B
PAPER = (251, 249, 255)     # #FBF9FF
WHITE = (255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)

SS = 4


def diagonal_gradient(size, c1, c2):
    w, h = size
    gx = Image.new("L", (w, 1))
    if w > 1:
        gx.putdata([round(127 * x / (w - 1)) for x in range(w)])
    gy = Image.new("L", (1, h))
    if h > 1:
        gy.putdata([round(128 * y / (h - 1)) for y in range(h)])
    mask = ImageChops.add(
        gx.resize((w, h), Image.Resampling.NEAREST),
        gy.resize((w, h), Image.Resampling.NEAREST),
    )
    return Image.composite(
        Image.new("RGB", size, c2), Image.new("RGB", size, c1), mask
    )


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255
    )
    return mask


def _shape_box(cx, cy, s, x0, y0, x1, y1):
    return [cx + x0 * s, cy + y0 * s, cx + x1 * s, cy + y1 * s]


def with_rings(img, ellipses, alpha=30, width=2):
    """Overlay translucent rings on an RGBA image (true alpha blending)."""
    layer = Image.new("RGBA", img.size, TRANSPARENT)
    overlay = ImageDraw.Draw(layer)
    for e in ellipses:
        overlay.ellipse(e, outline=(255, 255, 255, alpha), width=width)
    return Image.alpha_composite(img, layer)


def draw_d(
    draw,
    cx,
    cy,
    s,
    fill=WHITE,
    counter=AMBER,
    cutout=False,
    radius=0.04,
):
    """Draw the DastakDe D. `s` is the mark's height scale.

    The stem is a rounded rectangle whose right-hand rounding is covered by a
    flat rectangle; the bowl is a true half-disc attached to that flat edge,
    so the two shapes meet without a notch. The amber counter doubles as the
    door knocker.
    """
    cx = cx + 0.05 * s  # visually centre the asymmetric D
    half = 0.34
    stem_left, stem_right = -0.30, -0.14
    draw.rounded_rectangle(
        _shape_box(cx, cy, s, stem_left, -half, stem_right, half),
        radius=radius * s,
        fill=fill,
    )
    draw.rectangle(
        [
            cx + (stem_left + radius) * s,
            cy - half * s,
            cx + stem_right * s,
            cy + half * s,
        ],
        fill=fill,
    )
    draw.pieslice(
        _shape_box(cx, cy, s, stem_right - half, -half, stem_right + half, half),
        start=-90,
        end=90,
        fill=fill,
    )
    r = 0.125
    hole = _shape_box(cx, cy, s, 0.025 - r, -r, 0.025 + r, r)
    if cutout:
        draw.ellipse(hole, fill=(0, 0, 0, 0))
    elif counter is not None:
        draw.ellipse(hole, fill=counter)


def make_icon_square(size=1024):
    ss = size * SS
    img = diagonal_gradient((ss, ss), VIOLET, DEEP_VIOLET).convert("RGBA")
    draw_d(ImageDraw.Draw(img), ss / 2, ss / 2, 0.88 * ss)
    return img.convert("RGB").resize((size, size), Image.Resampling.LANCZOS)


def make_mark_rounded(size=1024):
    ss = size * SS
    img = diagonal_gradient((ss, ss), VIOLET, DEEP_VIOLET).convert("RGBA")
    draw_d(ImageDraw.Draw(img), ss / 2, ss / 2, 0.84 * ss)
    img.putalpha(rounded_mask((ss, ss), round(0.22 * ss)))
    return img.resize((size, size), Image.Resampling.LANCZOS)


def make_foreground(size=1024):
    ss = size * SS
    img = Image.new("RGBA", (ss, ss), TRANSPARENT)
    draw_d(ImageDraw.Draw(img), ss / 2, ss / 2, 0.72 * ss)
    return img.resize((size, size), Image.Resampling.LANCZOS)


def make_background(size=1024):
    return diagonal_gradient((size, size), VIOLET, DEEP_VIOLET)


def make_monochrome(size=1024):
    ss = size * SS
    img = Image.new("RGBA", (ss, ss), TRANSPARENT)
    draw_d(ImageDraw.Draw(img), ss / 2, ss / 2, 0.72 * ss, counter=None, cutout=True)
    return img.resize((size, size), Image.Resampling.LANCZOS)


def make_splash(size=1024):
    ss = size * SS
    img = Image.new("RGBA", (ss, ss), INK + (255,))
    draw_d(ImageDraw.Draw(img), ss / 2, ss / 2, 0.90 * ss)
    return img.convert("RGB").resize((size, size), Image.Resampling.LANCZOS)


def make_splash_mark(size=1024):
    ss = size * SS
    img = Image.new("RGBA", (ss, ss), TRANSPARENT)
    draw_d(ImageDraw.Draw(img), ss / 2, ss / 2, 0.90 * ss)
    return img.resize((size, size), Image.Resampling.LANCZOS)


def _load_font(px):
    candidates = [
        r"C:\Windows\Fonts\segoeuib.ttf",
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\calibrib.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, px)
    return ImageFont.load_default(size=px)


def make_feature_graphic(w=1024, h=500):
    W, H = w * SS, h * SS
    img = diagonal_gradient((W, H), VIOLET, DEEP_VIOLET).convert("RGBA")

    # Soft translucent rings add depth without competing with the wordmark.
    img = with_rings(
        img,
        [
            [-120 * SS, 260 * SS, 420 * SS, 800 * SS],
            [520 * SS, -200 * SS, 980 * SS, 260 * SS],
        ],
        alpha=30,
        width=2 * SS,
    )
    draw = ImageDraw.Draw(img)

    px = 104 * SS
    while draw.textlength("DastakDe", font=_load_font(px)) > 560 * SS and px > 40 * SS:
        px -= 2 * SS
    draw.text((64 * SS, 210 * SS), "DastakDe", font=_load_font(px), fill=WHITE, anchor="lm")
    draw.text(
        (66 * SS, 300 * SS),
        "Mauka dastak de raha hai.",
        font=_load_font(42 * SS),
        fill=AMBER,
        anchor="lm",
    )
    draw.text(
        (66 * SS, 360 * SS),
        "Verified student opportunities · real deadlines",
        font=_load_font(26 * SS),
        fill=(223, 214, 244, 255),
        anchor="lm",
    )
    draw_d(draw, 820 * SS, 250 * SS, 2 * 170 * SS)
    return img.convert("RGB").resize((w, h), Image.Resampling.LANCZOS)


def make_og(w=1200, h=630):
    W, H = w * SS, h * SS
    img = diagonal_gradient((W, H), VIOLET, DEEP_VIOLET).convert("RGBA")
    img = with_rings(
        img,
        [[-160 * SS, 300 * SS, 560 * SS, 1020 * SS]],
        alpha=28,
        width=3 * SS,
    )
    draw = ImageDraw.Draw(img)
    draw.text((72 * SS, 210 * SS), "DastakDe", font=_load_font(112 * SS), fill=WHITE, anchor="lm")
    draw.text(
        (76 * SS, 320 * SS),
        "Mauka dastak de raha hai.",
        font=_load_font(46 * SS),
        fill=AMBER,
        anchor="lm",
    )
    draw.text(
        (76 * SS, 390 * SS),
        "Verified hackathons, internships, scholarships and more.",
        font=_load_font(30 * SS),
        fill=(223, 214, 244, 255),
        anchor="lm",
    )
    draw_d(draw, 1000 * SS, 315 * SS, 2 * 190 * SS)
    return img.convert("RGB").resize((w, h), Image.Resampling.LANCZOS)


def _save(img, name):
    path = os.path.join(OUT, name)
    img.save(path)
    print(f"  wrote {path}  ({img.size[0]}x{img.size[1]}, {img.mode})")


def main():
    os.makedirs(OUT, exist_ok=True)
    print("Generating DastakDe brand assets ->", OUT)

    icon = make_icon_square(1024)
    _save(icon, "icon-1024.png")
    _save(icon.resize((512, 512), Image.Resampling.LANCZOS), "play-icon-512.png")

    mark = make_mark_rounded(1024)
    _save(mark, "mark-rounded-1024.png")
    _save(mark.resize((64, 64), Image.Resampling.LANCZOS), "favicon-64.png")

    _save(make_foreground(1024), "icon-foreground-1024.png")
    _save(make_background(1024), "icon-background-1024.png")
    _save(make_monochrome(1024), "icon-monochrome-1024.png")
    _save(make_splash(1024), "splash-1024.png")
    _save(make_splash_mark(1024), "splash-mark-1024.png")
    _save(make_feature_graphic(), "feature-graphic-1024x500.png")
    _save(make_og(), "og-1200x630.png")

    print("Done.")


if __name__ == "__main__":
    main()
