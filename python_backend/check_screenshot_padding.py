import numpy as np
from PIL import Image

src_path = r"C:\Users\IT\.gemini\antigravity-ide\brain\36286947-cecc-49f0-9cee-a92f6c5abb7e\.user_uploaded\media_1791011479607.png"
img = Image.open(src_path)
arr = np.array(img)
h, w = arr.shape[:2]

# Check columns that are dark gray border (RGB ~ 32, 32, 32)
dark_mask = np.all(np.abs(arr[:, :, :3] - 32) <= 3, axis=2)
dark_cols = np.mean(dark_mask, axis=0)
dark_rows = np.mean(dark_mask, axis=1)

print("Dark columns (>90% dark):", np.where(dark_cols > 0.9)[0])
print("Dark rows (>90% dark):", np.where(dark_rows > 0.9)[0])
