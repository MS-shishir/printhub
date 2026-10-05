import numpy as np
from PIL import Image

src_path = r"C:\Users\IT\.gemini\antigravity-ide\brain\36286947-cecc-49f0-9cee-a92f6c5abb7e\.user_uploaded\media_1791011479607.png"
img = Image.open(src_path)
arr = np.array(img)
print("Image shape:", arr.shape)
print("Is RGBA?", arr.shape[2] == 4 if len(arr.shape) > 2 else False)

# Check alpha channel if present
if arr.shape[2] == 4:
    alpha_slice = arr[:, :, 3]
    print("Min alpha:", alpha_slice.min(), "Max alpha:", alpha_slice.max())
    print("Alpha column 0-25 summary:")
    print("Zero alpha pixels on left:", (alpha_slice[:, :30] == 0).sum())

# Also check RGB around (y=300..400, x=0..30)
print("Left side RGB sample around y=350, x=0..10:")
print(arr[350, :10])
