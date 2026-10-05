import torch
import torchvision.transforms.functional as F
from transformers import AutoModelForImageSegmentation
from PIL import Image
import numpy as np
import cv2

print("Loading BiRefNet-portrait...")
model = AutoModelForImageSegmentation.from_pretrained(
    "ZhengPeng7/BiRefNet-portrait", trust_remote_code=True
).eval()

def letterbox_image(img_pil: Image.Image, target_size: int = 1024):
    """
    Pads image with aspect ratio preserved to target_size x target_size
    """
    w, h = img_pil.size
    scale = target_size / max(w, h)
    new_w = int(w * scale)
    new_h = int(h * scale)
    
    resized = img_pil.resize((new_w, new_h), Image.Resampling.BILINEAR)
    pad_img = Image.new("RGB", (target_size, target_size), (128, 128, 128))
    pad_left = (target_size - new_w) // 2
    pad_top = (target_size - new_h) // 2
    pad_img.paste(resized, (pad_left, pad_top))
    
    return pad_img, scale, pad_left, pad_top, (new_w, new_h)

def unpad_mask(prob_1024: np.ndarray, orig_w: int, orig_h: int, pad_left: int, pad_top: int, new_w: int, new_h: int):
    """
    Crops out padding and resizes back to original dimensions
    """
    cropped = prob_1024[pad_top:pad_top+new_h, pad_left:pad_left+new_w]
    unpadded = cv2.resize(cropped, (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)
    return np.clip(unpadded, 0.0, 1.0)

print("Letterbox and unpad utilities compiled successfully!")
