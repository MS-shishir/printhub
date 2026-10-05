import os
from PIL import Image

src_path = r"C:\Users\IT\.gemini\antigravity-ide\brain\36286947-cecc-49f0-9cee-a92f6c5abb7e\.user_uploaded\media_1791085218474.png"
img = Image.open(src_path)
print("Screenshot size:", img.size)

# Crop the inner photo (inside the canvas / blue dashed boundary)
# The image is 415x415 approx or similar, let's inspect coordinates
w, h = img.size
# Crop center image
crop_photo = img.crop((int(w * 0.15), int(h * 0.08), int(w * 0.83), int(h * 0.93)))
out_dir = r"c:\Users\IT\Desktop\printhub\python_backend\debug_output"
os.makedirs(out_dir, exist_ok=True)
crop_photo.save(os.path.join(out_dir, "user_man_test.png"))
print("Saved user_man_test.png size:", crop_photo.size)
