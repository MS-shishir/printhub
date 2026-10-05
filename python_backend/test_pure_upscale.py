import os
import cv2
import numpy as np
from PIL import Image, ImageFilter

out_dir = r"c:\Users\IT\Desktop\printhub\python_backend\debug_output"
src_path = os.path.join(out_dir, "new_engine_result.png")
if not os.path.exists(src_path):
    src_path = r"C:\Users\IT\.gemini\antigravity-ide\brain\36286947-cecc-49f0-9cee-a92f6c5abb7e\.user_uploaded\media_1791011479607.png"

img = Image.open(src_path)
print("Original size:", img.size, "Mode:", img.mode)

# Split alpha
arr = np.array(img)
if len(arr.shape) == 3 and arr.shape[2] == 4:
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3]
else:
    rgb = arr[:, :, :3]
    alpha = None

scale = 2.0  # Or 4.0
h, w = rgb.shape[:2]
target_w = int(w * scale)
target_h = int(h * scale)

# 1. High-order Lanczos4 Upscale on RGB
rgb_pil = Image.fromarray(rgb)
rgb_upscaled = rgb_pil.resize((target_w, target_h), Image.Resampling.LANCZOS)
rgb_arr = np.array(rgb_upscaled)

# 2. Multi-Frequency Edge-Preserving Unblur (Detail Reconstruction)
# Bilateral decomposition: separate base illumination from micro-texture
base = cv2.bilateralFilter(rgb_arr, d=5, sigmaColor=25, sigmaSpace=25)
texture = cv2.subtract(rgb_arr, base)

# Edge-aware sharpening mask using Sobel gradient
gray = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2GRAY)
grad_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
grad_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
edge_magnitude = cv2.magnitude(grad_x, grad_y)
edge_mask = np.clip(edge_magnitude / 60.0, 0.0, 1.0)[:, :, np.newaxis]

# Amplify true texture and fine edges, while keeping flat skin smooth
restored = cv2.addWeighted(rgb_arr, 1.0, texture, 0.50, 0)

# Apply gentle high-pass unsharp mask
pil_restored = Image.fromarray(restored)
sharpened = pil_restored.filter(ImageFilter.UnsharpMask(radius=1.2, percent=85, threshold=1))
final_rgb = np.array(sharpened)

# 3. Alpha channel upscaled separately with INTER_CUBIC
if alpha is not None:
    alpha_up = cv2.resize(alpha, (target_w, target_h), interpolation=cv2.INTER_CUBIC)
    final_rgba = np.dstack([final_rgb, alpha_up])
else:
    final_rgba = final_rgb

final_img = Image.fromarray(final_rgba)
final_img.save(os.path.join(out_dir, "pure_upscale_result.png"))

# Composite with blue background to preview
if final_rgba.shape[2] == 4:
    blue_bg = Image.new("RGBA", (target_w, target_h), (25, 78, 220, 255))
    blue_comp = Image.alpha_composite(blue_bg, final_img)
    blue_comp.save(os.path.join(out_dir, "pure_upscale_blue.png"))

print("Pure resolution upscale generated successfully! Output size:", final_img.size)
