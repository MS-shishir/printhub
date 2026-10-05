import urllib.request
import json
import os
from PIL import Image
import io

src_path = r"C:\Users\IT\.gemini\antigravity-ide\brain\36286947-cecc-49f0-9cee-a92f6c5abb7e\.user_uploaded\media_1791011479607.png"
out_dir = r"c:\Users\IT\Desktop\printhub\python_backend\debug_output"
os.makedirs(out_dir, exist_ok=True)

print("Original image exists:", os.path.exists(src_path))
img = Image.open(src_path)
print("Image size:", img.size, "Mode:", img.mode)

# Save test copy
img.save(os.path.join(out_dir, "original.png"))

# Call server.py endpoint
with open(src_path, "rb") as f:
    img_bytes = f.read()

boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="portrait.png"\r\n'
    f"Content-Type: image/png\r\n\r\n"
).encode("utf-8") + img_bytes + (
    f"\r\n--{boundary}\r\n"
    f'Content-Disposition: form-data; name="model"\r\n\r\n'
    f"birefnet\r\n"
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="refine"\r\n\r\n'
    f"true\r\n"
    f"--{boundary}--\r\n"
).encode("utf-8")

req = urllib.request.Request(
    "http://127.0.0.1:8000/api/v1/passport/remove-bg",
    data=body,
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
)

try:
    print("Calling FastAPI /remove-bg...")
    with urllib.request.urlopen(req, timeout=120) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        print("Success:", res.get("success"))
        print("Message:", res.get("message"))
        data_url = res.get("data_url", "")
        if data_url.startswith("data:image"):
            import base64
            head, b64 = data_url.split(",", 1)
            raw = base64.b64decode(b64)
            res_img = Image.open(io.BytesIO(raw))
            res_img.save(os.path.join(out_dir, "server_result.png"))
            print("Saved server_result.png size:", res_img.size)
            
            # Composite onto blue background to compare with user's uploaded result
            blue_bg = Image.new("RGBA", res_img.size, (25, 78, 220, 255))
            composite = Image.alpha_composite(blue_bg, res_img.convert("RGBA"))
            composite.save(os.path.join(out_dir, "server_result_blue.png"))
            print("Saved server_result_blue.png")
except Exception as e:
    print("Error calling server:", e)
