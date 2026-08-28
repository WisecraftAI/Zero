import sys, colorsys
from collections import Counter
from PIL import Image

for name in sys.argv[1:]:
    im = Image.open(name).convert("RGBA")
    w, h = im.size
    px = im.load()
    counts = Counter()
    opaque = 0
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b, a = px[x, y]
            if a < 128:
                continue
            opaque += 1
            counts[(r // 32 * 32, g // 32 * 32, b // 32 * 32)] += 1
    print(f"\n=== {name}  {w}x{h}  opaque(sampled)={opaque}")
    for (r, g, b), n in counts.most_common(14):
        hh, ll, ss = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        print(f"  #{r:02X}{g:02X}{b:02X}  n={n:7d}  {100*n/opaque:5.1f}%  H={hh*360:5.0f} L={ll:.2f} S={ss:.2f}")
