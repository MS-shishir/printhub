import torch
import torchvision.transforms.functional as F
from transformers import AutoModelForImageSegmentation
from PIL import Image
import numpy as np

# Create a test synthetic portrait
img = Image.new("RGB", (600, 800), color=(180, 100, 50))
# Load model
model = AutoModelForImageSegmentation.from_pretrained(
    "ZhengPeng7/BiRefNet-portrait", trust_remote_code=True
).eval()

# Check inference
target_res = 1024
resized_img = img.resize((target_res, target_res), Image.Resampling.BILINEAR)
tensor = F.to_tensor(resized_img)
tensor = F.normalize(tensor, [0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
tensor = tensor.unsqueeze(0)

with torch.no_grad():
    preds = model(tensor)
    print("Preds type:", type(preds))
    if isinstance(preds, (list, tuple)):
        print("Preds len:", len(preds), "Item shapes:", [p.shape for p in preds])
        prob = preds[-1].sigmoid().squeeze().cpu().numpy()
    else:
        print("Preds shape:", preds.shape)
        prob = preds.sigmoid().squeeze().cpu().numpy()

print("Prob min:", prob.min(), "max:", prob.max(), "mean:", prob.mean(), "shape:", prob.shape)
