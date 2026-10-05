import os
import torch
import torchvision.transforms.functional as F
from transformers import AutoModelForImageSegmentation
from PIL import Image
import numpy as np
import cv2

src_path = r"C:\Users\IT\.gemini\antigravity-ide\brain\36286947-cecc-49f0-9cee-a92f6c5abb7e\.user_uploaded\media_1791011479607.png"
out_dir = r"c:\Users\IT\Desktop\printhub\python_backend\debug_output"
os.makedirs(out_dir, exist_ok=True)

print("Loading original image...")
img_pil = Image.open(src_path).convert("RGB")
orig_w, orig_h = img_pil.size
print(f"Original size: {orig_w}x{orig_h}")

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Device: {device}")

print("Loading BiRefNet-portrait model...")
model = AutoModelForImageSegmentation.from_pretrained(
    "ZhengPeng7/BiRefNet-portrait", trust_remote_code=True
).to(device).eval()

# 1. Test standard direct resize vs Letterbox
target_size = 1024

# Let's do letterbox to preserve exact aspect ratio!
scale = target_size / max(orig_w, orig_h)
new_w = int(orig_w * scale)
new_h = int(orig_h * scale)
resized_img = img_pil.resize((new_w, new_h), Image.Resampling.BILINEAR)

pad_img = Image.new("RGB", (target_size, target_size), (128, 128, 128))
pad_left = (target_size - new_w) // 2
pad_top = (target_size - new_h) // 2
pad_img.paste(resized_img, (pad_left, pad_top))

tensor = F.to_tensor(pad_img)
tensor = F.normalize(tensor, [0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
tensor = tensor.unsqueeze(0).to(device)

print("Running BiRefNet forward pass...")
with torch.no_grad():
    preds = model(tensor)
    if isinstance(preds, (list, tuple)):
        preds = preds[-1]
    prob_1024 = preds.sigmoid().squeeze().cpu().numpy()

# Unpad
cropped_prob = prob_1024[pad_top:pad_top+new_h, pad_left:pad_left+new_w]
prob_orig = cv2.resize(cropped_prob, (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)
prob_orig = np.clip(prob_orig, 0.0, 1.0)

# Save mask visualization
mask_vis = (prob_orig * 255).astype(np.uint8)
Image.fromarray(mask_vis).save(os.path.join(out_dir, "birefnet_letterbox_mask.png"))

# Create transparent RGBA
img_np = np.array(img_pil)
rgba = np.zeros((orig_h, orig_w, 4), dtype=np.uint8)
rgba[:, :, :3] = img_np
rgba[:, :, 3] = (prob_orig * 255).astype(np.uint8)
cutout_pil = Image.fromarray(rgba, mode="RGBA")
cutout_pil.save(os.path.join(out_dir, "birefnet_letterbox_cutout.png"))

# Composite onto passport blue background (RGB: 25, 78, 220)
blue_bg = Image.new("RGBA", (orig_w, orig_h), (25, 78, 220, 255))
blue_composite = Image.alpha_composite(blue_bg, cutout_pil)
blue_composite.save(os.path.join(out_dir, "birefnet_letterbox_blue.png"))

print("Successfully saved letterbox results to debug_output!")
