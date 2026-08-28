"""Trace the ZERO brand PNGs into color-separated SVG paths.

The supplied masters are raster, so the artwork could only ever ship in two
fixed colorways. Tracing them into paths lets every region be filled from a
CSS custom property instead, which is what makes the logo follow the operator
theme. The dark masters are gone because dark palettes are now derived rather
than drawn. Run this only when the masters under web/public change.

    python3 -m venv .venv
    .venv/bin/pip install potracer pillow numpy scipy
    .venv/bin/python support/brand/trace-brand-art.py

Output: web/src/components/zeroBrandArt.js

Each source pixel is classified into one of four brand roles (accent / ink /
plate / eye) at native resolution -- upscaling first would ring the
high-contrast edges and scatter false colors across the artwork. Masks are
painted back to front, and every layer carries the union of itself plus
everything drawn on top of it, so adjacent regions overlap instead of leaving
hairline seams between traced outlines.
"""

import colorsys
import os

import numpy as np
import potrace
from PIL import Image
from scipy import ndimage

SS = 4  # mask upsample before tracing: more sample points => smoother curves

ACCENT, INK, PLATE, EYE = "accent", "ink", "plate", "eye"
# Bottom to top. Each layer is unioned with every layer after it.
PAINT_ORDER = [ACCENT, INK, PLATE, EYE]

SOURCE = "web/public"
OUTPUT = "web/src/components/zeroBrandArt.js"


def classify(r, g, b):
    # Chroma, not HLS saturation: near-white pixels like (254,255,254) report a
    # saturation of 1.0, which would scatter them out of the plate.
    mx, mn = max(r, g, b) / 255, min(r, g, b) / 255
    lightness, chroma = (mx + mn) / 2, mx - mn
    hue = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)[0] * 360

    if chroma < 0.22 and lightness > 0.58:
        return PLATE
    if 172 <= hue <= 203 and chroma > 0.30 and lightness > 0.30:
        return EYE
    if lightness < 0.24:
        return INK
    return ACCENT


def role_masks(path, alpha_cut=128):
    arr = np.asarray(Image.open(path).convert("RGBA"))
    h, w = arr.shape[:2]

    opaque = arr[:, :, 3] >= alpha_cut
    uniq, inverse = np.unique(arr[:, :, :3].reshape(-1, 3), axis=0, return_inverse=True)
    lut = np.array([PAINT_ORDER.index(classify(*c)) for c in uniq], dtype=np.int8)
    roles = lut[inverse.ravel()].reshape(h, w)

    return {k: opaque & (roles == i) for i, k in enumerate(PAINT_ORDER)}, (w, h)


def drop_specks(mask, min_area):
    """Delete islands smaller than min_area in both polarities, so stray blobs
    and pinholes vanish while real features (a visor, a gear tooth) survive."""
    out = mask.copy()
    for fill in (True, False):
        labels, count = ndimage.label(out if fill else ~out)
        if count == 0:
            continue
        areas = np.bincount(labels.ravel())
        areas[0] = 0
        out[np.isin(labels, np.flatnonzero(areas < min_area))] = not fill
    return out


def upsample(mask):
    img = Image.fromarray(mask.astype(np.uint8) * 255, mode="L")
    img = img.resize((img.width * SS, img.height * SS), Image.BILINEAR)
    return np.asarray(img) >= 128


def trace_mask(mask, min_area):
    mask = upsample(drop_specks(mask, min_area))
    if not mask.any():
        return ""

    # Bitmap.__init__ inverts whatever it is given, so hand it the complement.
    path = potrace.Bitmap(np.invert(mask)).trace(
        turdsize=2, alphamax=1.0, opticurve=True, opttolerance=0.6
    )

    def pt(p):
        x = f"{p.x / SS:.1f}".rstrip("0").rstrip(".") or "0"
        y = f"{p.y / SS:.1f}".rstrip("0").rstrip(".") or "0"
        return f"{x} {y}"

    parts = []
    for curve in path:
        parts.append(f"M{pt(curve.start_point)}")
        for seg in curve:
            if seg.is_corner:
                parts.append(f"L{pt(seg.c)}L{pt(seg.end_point)}")
            else:
                parts.append(f"C{pt(seg.c1)} {pt(seg.c2)} {pt(seg.end_point)}")
        parts.append("Z")
    return "".join(parts)


def build(name, min_area, clip_bottom=None):
    masks, (w, h) = role_masks(os.path.join(SOURCE, f"zero-{name}.png"))
    if clip_bottom is not None:
        # The supplied icon was cut out of the full lockup and dragged a slice
        # of the capability bar along with it.
        for m in masks.values():
            m[clip_bottom:, :] = False

    layers = []
    for i, key in enumerate(PAINT_ORDER):
        union = np.zeros((h, w), dtype=bool)
        for later in PAINT_ORDER[i:]:
            union |= masks[later]

        area = min_area
        if key == EYE:
            # The eyes are the only cyan in the art, so anything much smaller
            # than an eye on that layer is a stray highlight, not a feature.
            sizes = np.bincount(ndimage.label(union)[0].ravel())[1:]
            if sizes.size:
                area = max(min_area, int(sizes.max() * 0.5))

        d = trace_mask(union, area)
        if d:
            layers.append((key, d))
    return {"width": w, "height": h, "layers": layers}


def build_wordmark(min_area):
    """The wordmark needs a spatial split, not a color one: the O is a single
    glyph shaded from deep navy to bright blue, so classifying it by color
    would tear it in half. Cut at the empty column between the R and the O."""
    arr = np.asarray(Image.open(os.path.join(SOURCE, "zero-wordmark.png")).convert("RGBA"))
    opaque = arr[:, :, 3] >= 128
    cols = opaque.any(axis=0)

    x = opaque.shape[1] - 1
    while x > 0 and not cols[x]:
        x -= 1
    while x > 0 and cols[x]:
        x -= 1

    left, right = opaque.copy(), opaque.copy()
    left[:, x:] = False
    right[:, :x] = False

    return {
        "width": arr.shape[1],
        "height": arr.shape[0],
        "layers": [
            (INK, trace_mask(left, min_area)),
            (ACCENT, trace_mask(right, min_area)),
        ],
    }


def emit(arts):
    lines = [
        "/**",
        " * ZERO brand artwork as color-separated SVG paths.",
        " *",
        " * GENERATED FILE -- do not edit by hand. Regenerate with",
        " * support/brand/trace-brand-art.py after changing the master art.",
        " *",
        " * Every path carries a `role` rather than a color so ZeroLogo can fill it",
        " * from the active theme. Layers are ordered back to front and deliberately",
        " * overlap, so they must be rendered in array order.",
        " */",
        "",
    ]
    for name, art in arts.items():
        layers = ",\n".join(
            f"    {{ role: '{role}', d: '{d}' }}" for role, d in art["layers"]
        )
        lines.append(
            f"export const {name.upper()} = {{\n"
            f"  width: {art['width']},\n"
            f"  height: {art['height']},\n"
            f"  layers: [\n{layers},\n  ],\n}};\n"
        )
    with open(OUTPUT, "w") as fh:
        fh.write("\n".join(lines))


if __name__ == "__main__":
    arts = {
        "mark": build("mark", min_area=90),
        "icon": build("icon", min_area=22, clip_bottom=236),
        "wordmark": build_wordmark(min_area=40),
    }
    for name, art in arts.items():
        size = sum(len(d) for _, d in art["layers"])
        roles = [role for role, _ in art["layers"]]
        print(f"{name}: {art['width']}x{art['height']} {roles} {size / 1024:.1f} KiB")
    emit(arts)
    print(f"wrote {OUTPUT}")
