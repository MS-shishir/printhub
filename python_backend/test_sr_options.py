import os
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

out_dir = r"c:\Users\IT\Desktop\printhub\python_backend\debug_output"
src_path = os.path.join(out_dir, "user_man_test.png")
img_pil = Image.open(src_path).convert("RGB")
orig_w, orig_h = img_pil.size
print(f"Input size: {orig_w}x{orig_h}")

# Method 1: Advanced Multi-Scale Detail Synthesis + Deconvolution + Laplacian High-Pass
# Let's test a dramatic unblur & detail reconstruction pipeline
def advanced_multi_scale_unblur(img_rgb: np.ndarray, scale: float = 2.0):
    h, w = img_rgb.shape[:2]
    new_w, new_h = int(w * scale), int(h * scale)
    
    # 1. High-order Lanczos4 interpolation
    pil_img = Image.fromarray(img_rgb)
    upscaled = pil_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    arr = np.array(upscaled)
    
    # 2. Multi-scale detail extraction (Fine details + Medium contours)
    # Scale 1: Micro texture (pores, iris, hair strands)
    blur_fine = cv2.GaussianBlur(arr, (0, 0), sigmaX=1.0)
    detail_fine = cv2.subtract(arr, blur_fine)
    
    # Scale 2: Structural contours (eyes, lips, beard outlines)
    blur_med = cv2.GaussianBlur(arr, (0, 0), sigmaX=3.0)
    detail_med = cv2.subtract(blur_fine, blur_med)
    
    # 3. Edge-preserving Bilateral Guidance (protects smooth skin from noise)
    bi = cv2.bilateralFilter(arr, d=7, sigmaColor=35, sigmaSpace=35)
    
    # 4. Synthesize enhanced details
    # We boost fine details by 2.2x and medium details by 1.4x on strong edges
    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    sobel_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    edge_strength = np.sqrt(sobel_x**2 + sobel_y**2)
    edge_mask = np.clip(edge_strength / 40.0, 0.15, 1.0)[:, :, np.newaxis]
    
    boosted = arr.astype(np.float32) + (detail_fine.astype(np.float32) * 2.2 + detail_med.astype(np.float32) * 1.5) * edge_mask
    boosted = np.clip(boosted, 0, 255).astype(np.uint8)
    
    # 5. Contrast & Crispness Polish
    pil_boosted = Image.fromarray(boosted)
    # High-definition unsharp mask
    unsharp = pil_boosted.filter(ImageFilter.UnsharpMask(radius=1.5, percent=160, threshold=2))
    
    # Subtle local contrast boost (clarity)
    enhancer = ImageEnhance.Contrast(unsharp)
    clarity = enhancer.enhance(1.08)
    
    return np.array(clarity)

result = advanced_multi_scale_unblur(np.array(img_pil), scale=2.0)
res_pil = Image.fromarray(result)
res_pil.save(os.path.join(out_dir, "test_dramatic_unblur.png"))
print("Saved test_dramatic_unblur.png size:", res_pil.size)
