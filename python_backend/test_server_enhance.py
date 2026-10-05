import urllib.request
import json
import base64
import os
import io
from PIL import Image

src_path = r"c:\Users\IT\Desktop\printhub\python_backend\debug_output\new_engine_result.png"
if not os.path.exists(src_path):
    src_path = r"C:\Users\IT\.gemini\antigravity-ide\brain\36286947-cecc-49f0-9cee-a92f6c5abb7e\.user_uploaded\media_1791011479607.png"

with open(src_path, "rb") as f:
    img_bytes = f.read()

boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="photo.png"\r\n'
    f"Content-Type: image/png\r\n\r\n"
).encode("utf-8") + img_bytes + (
    f"\r\n--{boundary}\r\n"
    f'Content-Disposition: form-data; name="scale_factor"\r\n\r\n'
    f"2.0\r\n"
    f"--{boundary}--\r\n"
).encode("utf-8")

req = urllib.request.Request(
    "http://127.0.0.1:8000/api/v1/passport/enhance",
    data=body,
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
)

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        print("Success:", res.get("success"))
        print("Message:", res.get("message"))
        data_url = res.get("data_url", "")
        print("Data URL length:", len(data_url))
        head, b64 = data_url.split(",", 1)
        raw = base64.b64decode(b64)
        out_img = Image.open(io.BytesIO(raw))
        print("Enhanced output size:", out_img.size, "Mode:", out_img.mode)
        out_img.save(r"c:\Users\IT\Desktop\printhub\python_backend\debug_output\server_enhanced_result.png")
        print("Saved server_enhanced_result.png successfully!")
except Exception as e:
    print("Error calling /enhance:", e)
