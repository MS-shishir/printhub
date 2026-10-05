import os
import cv2
import torch
from realesrgan import RealESRGANer
from basicsr.archs.rrdbnet_arch import RRDBNet
from PIL import Image
import numpy as np

out_dir = r"c:\Users\IT\Desktop\printhub\python_backend\debug_output"
src_path = os.path.join(out_dir, "user_man_test.png")

print("Checking PyTorch device...")
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Device: {device}")

# We use the official RealESRGAN_x4plus or realesr-general-x4v3
# realesr-general-x4v3 is compact and ultra-fast on CPU
model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
model_path = os.path.join(out_dir, "RealESRGAN_x4plus.pth")

# Download weights if not present
if not os.path.exists(model_path):
    print("Downloading official RealESRGAN_x4plus.pth weights...")
    import urllib.request
    url = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth"
    urllib.request.urlretrieve(url, model_path)
    print("Weights downloaded successfully!")

upscaler = RealESRGANer(
    scale=4,
    model_path=model_path,
    model=model,
    tile=256,  # Tiling ensures low RAM and fast CPU inference
    tile_pad=10,
    pre_pad=0,
    half=False,
    device=device
)

img = cv2.imread(src_path, cv2.IMREAD_COLOR)
print("Running Real-ESRGAN inference...")
output, _ = upscaler.enhance(img, outscale=2)  # 2x or 4x
res_path = os.path.join(out_dir, "realesrgan_output.png")
cv2.imwrite(res_path, output)
print(f"Real-ESRGAN finished! Saved to {res_path}, size: {output.shape}")
