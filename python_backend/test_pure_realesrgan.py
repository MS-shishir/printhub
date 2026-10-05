import os
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import cv2
from PIL import Image

class ResidualDenseBlock(nn.Module):
    def __init__(self, num_feat=64, num_grow_ch=32):
        super().__init__()
        self.conv1 = nn.Conv2d(num_feat, num_grow_ch, 3, 1, 1)
        self.conv2 = nn.Conv2d(num_feat + num_grow_ch, num_grow_ch, 3, 1, 1)
        self.conv3 = nn.Conv2d(num_feat + 2 * num_grow_ch, num_grow_ch, 3, 1, 1)
        self.conv4 = nn.Conv2d(num_feat + 3 * num_grow_ch, num_grow_ch, 3, 1, 1)
        self.conv5 = nn.Conv2d(num_feat + 4 * num_grow_ch, num_feat, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(negative_slope=0.2, inplace=True)

    def forward(self, x):
        x1 = self.lrelu(self.conv1(x))
        x2 = self.lrelu(self.conv2(torch.cat((x, x1), 1)))
        x3 = self.lrelu(self.conv3(torch.cat((x, x1, x2), 1)))
        x4 = self.lrelu(self.conv4(torch.cat((x, x1, x2, x3), 1)))
        x5 = self.conv5(torch.cat((x, x1, x2, x3, x4), 1))
        return x5 * 0.2 + x

class RRDB(nn.Module):
    def __init__(self, num_feat=64, num_grow_ch=32):
        super().__init__()
        self.rdb1 = ResidualDenseBlock(num_feat, num_grow_ch)
        self.rdb2 = ResidualDenseBlock(num_feat, num_grow_ch)
        self.rdb3 = ResidualDenseBlock(num_feat, num_grow_ch)

    def forward(self, x):
        out = self.rdb1(x)
        out = self.rdb2(out)
        out = self.rdb3(out)
        return out * 0.2 + x

class RRDBNet(nn.Module):
    def __init__(self, num_in_ch=3, num_out_ch=3, scale=4, num_feat=64, num_block=23, num_grow_ch=32):
        super().__init__()
        self.scale = scale
        self.conv_first = nn.Conv2d(num_in_ch, num_feat, 3, 1, 1)
        self.body = nn.Sequential(*[RRDB(num_feat, num_grow_ch) for _ in range(num_block)])
        self.conv_body = nn.Conv2d(num_feat, num_feat, 3, 1, 1)
        self.conv_up1 = nn.Conv2d(num_feat, num_feat, 3, 1, 1)
        self.conv_up2 = nn.Conv2d(num_feat, num_feat, 3, 1, 1)
        self.conv_hr = nn.Conv2d(num_feat, num_feat, 3, 1, 1)
        self.conv_last = nn.Conv2d(num_feat, num_out_ch, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(negative_slope=0.2, inplace=True)

    def forward(self, x):
        feat = self.conv_first(x)
        body_feat = self.conv_body(self.body(feat))
        feat = feat + body_feat
        feat = self.lrelu(self.conv_up1(F.interpolate(feat, scale_factor=2, mode='nearest')))
        feat = self.lrelu(self.conv_up2(F.interpolate(feat, scale_factor=2, mode='nearest')))
        out = self.conv_last(self.lrelu(self.conv_hr(feat)))
        return out

out_dir = r"c:\Users\IT\Desktop\printhub\python_backend\debug_output"
src_path = os.path.join(out_dir, "user_man_test.png")
weights_path = os.path.join(out_dir, "RealESRGAN_x4plus.pth")

if not os.path.exists(weights_path):
    print("Downloading RealESRGAN_x4plus.pth...")
    import urllib.request
    url = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth"
    urllib.request.urlretrieve(url, weights_path)
    print("Download complete!")

print("Loading RealESRGAN model into PyTorch CPU...")
model = RRDBNet(num_in_ch=3, num_out_ch=3, scale=4, num_feat=64, num_block=23, num_grow_ch=32)
loadnet = torch.load(weights_path, map_location="cpu", weights_only=True)
if "params_ema" in loadnet:
    keyname = "params_ema"
elif "params" in loadnet:
    keyname = "params"
else:
    keyname = None

state_dict = loadnet[keyname] if keyname else loadnet
model.load_state_dict(state_dict, strict=True)
model.eval()
print("Model loaded successfully!")

# Load image
img = Image.open(src_path).convert("RGB")
# Scale down slightly if needed for fast CPU test
img_np = np.array(img).astype(np.float32) / 255.0
img_t = torch.from_numpy(img_np).permute(2, 0, 1).unsqueeze(0).float()

print("Running RealESRGAN forward pass on CPU...")
with torch.no_grad():
    output_t = model(img_t)
    output_t = output_t.clamp(0.0, 1.0).squeeze(0).permute(1, 2, 0).numpy()

output_np = (output_t * 255.0).astype(np.uint8)
res_pil = Image.fromarray(output_np)
save_dest = os.path.join(out_dir, "pure_realesrgan_result.png")
res_pil.save(save_dest)
print(f"SUCCESS! Output saved to {save_dest}, size: {res_pil.size}")
