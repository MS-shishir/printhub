import os
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

out_dir = r"c:\Users\IT\Desktop\printhub\python_backend\debug_output"
os.makedirs(out_dir, exist_ok=True)

# Test with the transparent cutout generated in previous step
cutout_path = os.path.join(out_dir, "new_engine_result.png")
if not os.path.exists(cutout_path):
    cutout_path = r"C:\Users\IT\.gemini\antigravity-ide\brain\36286947-cecc-49f0-9cee-a92f6c5abb7e\.user_uploaded\media_1791011479607.png"

print("Loading test image:", cutout_path)
img_pil = Image.open(cutout_path)
print("Input size:", img_pil.size, "Mode:", img_pil.mode)

# ── Function: Split Alpha ──
def split_alpha(img: Image.Image):
    arr = np.array(img)
    if len(arr.shape) == 3 and arr.shape[2] == 4:
        return arr[:, :, :3], arr[:, :, 3]
    return arr[:, :, :3], None

rgb, alpha = split_alpha(img_pil)
print("RGB shape:", rgb.shape, "Alpha shape:", alpha.shape if alpha is not None else None)

# ── Step 1: Restore & 4x Upscale ──
# Alpha-safe resize
scale_factor = 2.0  # Or 4.0 for full 4K
h, w = rgb.shape[:2]
target_w = int(w * scale_factor)
target_h = int(h * scale_factor)

# High-order Lanczos / Bicubic detail synthesis for RGB
rgb_pil = Image.fromarray(rgb)
rgb_upscaled = rgb_pil.resize((target_w, target_h), Image.Resampling.LANCZOS)
rgb_arr = np.array(rgb_upscaled)

# Face detail recovery (CodeFormer style)
# Bilateral edge-preserving smoothing + unsharp detail reconstruction
smoothed = cv2.bilateralFilter(rgb_arr, d=5, sigmaColor=35, sigmaSpace=35)
detail = cv2.subtract(rgb_arr, smoothed)
rgb_restored = cv2.addWeighted(rgb_arr, 0.85, smoothed, 0.15, 0)
rgb_restored = cv2.addWeighted(rgb_restored, 1.0, detail, 0.5, 0)

# Upscale Alpha separately with INTER_CUBIC to protect hair & beard edges
if alpha is not None:
    alpha_upscaled = cv2.resize(alpha, (target_w, target_h), interpolation=cv2.INTER_CUBIC)
    alpha_upscaled = np.clip(alpha_upscaled, 0, 255).astype(np.uint8)
else:
    alpha_upscaled = None

# ── Step 2: Basic Light Fix ──
def light_fix(img_rgb, gamma=1.15):
    # Convert RGB to LAB
    lab = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    
    # CLAHE on L channel
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_clahe = clahe.apply(l)
    
    # Merge and convert back to RGB
    lab_fixed = cv2.merge((l_clahe, a, b))
    fixed_rgb = cv2.cvtColor(lab_fixed, cv2.COLOR_LAB2RGB)
    
    # Gamma correction LUT
    table = np.array([(i / 255.0) ** (1 / gamma) * 255 for i in range(256)]).astype("uint8")
    return cv2.LUT(fixed_rgb, table)

rgb_lit = light_fix(rgb_restored, gamma=1.12)

# ── Step 3: Studio Relight (Soft Key Light + Fill) ──
def studio_relight(img_rgb, key_strength=0.18, fill_strength=0.10):
    """
    Photometric Studio Relighting:
    1. Key light: Soft directional light from upper-left (45°)
    2. Fill light: Diffuse ambient fill to soften harsh facial shadows
    """
    h, w = img_rgb.shape[:2]
    # Key light gradient (center at upper-left)
    y, x = np.ogrid[:h, :w]
    cx, cy = int(w * 0.30), int(h * 0.25)
    dist_sq = (x - cx)**2 + (y - cy)**2
    max_dist_sq = (w**2 + h**2)
    key_mask = 1.0 - (dist_sq / max_dist_sq) * 0.65
    key_mask = cv2.GaussianBlur(key_mask.astype(np.float32), (int(w * 0.15) | 1, int(h * 0.15) | 1), 0)
    key_mask = np.clip(key_mask, 0.7, 1.2)
    
    img_f = img_rgb.astype(np.float32)
    # Apply Key Light
    lit = img_f * (1.0 + (key_mask[:, :, np.newaxis] - 1.0) * key_strength)
    
    # Apply Soft Fill Light (lift deep shadows < 60)
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    shadow_mask = np.clip((80.0 - gray) / 80.0, 0.0, 1.0)[:, :, np.newaxis]
    lit += shadow_mask * (255.0 * fill_strength)
    
    return np.clip(lit, 0, 255).astype(np.uint8)

rgb_relit = studio_relight(rgb_lit, key_strength=0.15, fill_strength=0.08)

# ── Step 4: Final Polish (Sharpen, Skin-Tone Check, Color Grade) ──
def final_polish(img_rgb):
    pil_img = Image.fromarray(img_rgb)
    
    # Subtle facial feature unsharp mask
    polished = pil_img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=80, threshold=2))
    
    # Warm skin tone enhancement
    enhancer = ImageEnhance.Color(polished)
    polished = enhancer.enhance(1.05)
    
    # Subtle studio contrast
    contrast = ImageEnhance.Contrast(polished)
    polished = contrast.enhance(1.04)
    
    return np.array(polished)

rgb_final = final_polish(rgb_relit)

# ── Step 5: Alpha Merge ──
if alpha_upscaled is not None:
    final_rgba = np.dstack([rgb_final, alpha_upscaled])
else:
    final_rgba = rgb_final

final_pil = Image.fromarray(final_rgba)
final_pil.save(os.path.join(out_dir, "enhanced_cutout.png"))

# Composite with blue background to preview
if final_rgba.shape[2] == 4:
    blue_bg = Image.new("RGBA", final_pil.size, (25, 78, 220, 255))
    blue_comp = Image.alpha_composite(blue_bg, final_pil)
    blue_comp.save(os.path.join(out_dir, "enhanced_blue_composite.png"))

print("Successfully generated enhanced outputs in debug_output!")
