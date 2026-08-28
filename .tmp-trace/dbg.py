import numpy as np, potrace
from PIL import Image
import sys
sys.path.insert(0, ".tmp-trace")
from trace import masks_for, PAINT_ORDER

masks, size = masks_for("web/public/zero-mark.png")
print("size", size)
for k in PAINT_ORDER:
    print(k, int(masks[k].sum()))

full = np.zeros_like(masks["accent"])
for k in PAINT_ORDER:
    full |= masks[k]
print("full", int(full.sum()), full.shape, full.dtype)

bmp = potrace.Bitmap(full.astype(np.uint8))
p = bmp.trace(turdsize=8)
curves = list(p)
print("curves", len(curves))
for c in curves[:3]:
    segs = list(c)
    print("  start", c.start_point.x, c.start_point.y, "segs", len(segs))
