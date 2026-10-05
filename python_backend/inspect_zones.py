import os
from PIL import Image
import numpy as np

out_dir = r"c:\Users\IT\Desktop\printhub\python_backend\debug_output"
img = Image.open(os.path.join(out_dir, "birefnet_letterbox_blue.png"))
w, h = img.size

# Let's crop 3 critical inspection areas:
# 1. Beard curls (bottom center and right)
crop_beard = img.crop((int(w * 0.15), int(h * 0.45), int(w * 0.85), int(h * 0.90)))
crop_beard.save(os.path.join(out_dir, "inspect_beard.png"))

# 2. Cap top (top center)
crop_cap = img.crop((int(w * 0.20), int(h * 0.05), int(w * 0.80), int(h * 0.35)))
crop_cap.save(os.path.join(out_dir, "inspect_cap.png"))

# 3. Right ear & hair junction
crop_ear = img.crop((int(w * 0.60), int(h * 0.30), int(w * 0.95), int(h * 0.65)))
crop_ear.save(os.path.join(out_dir, "inspect_ear.png"))

print("Inspection crops saved!")
