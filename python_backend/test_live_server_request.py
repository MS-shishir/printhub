import urllib.request
import json
import base64
import io
from PIL import Image, ImageDraw

# Create a test portrait
img = Image.new("RGB", (400, 500), (200, 100, 50))
draw = ImageDraw.Draw(img)
# Head
draw.ellipse([120, 80, 280, 280], fill=(210, 160, 120))
# Beard
draw.ellipse([140, 200, 260, 340], fill=(230, 230, 230))
# Body / shirt
draw.rectangle([60, 300, 340, 500], fill=(50, 80, 180))

buf = io.BytesIO()
img.save(buf, format="PNG")
buf.seek(0)

# Send multipart request to http://localhost:8000/api/v1/passport/remove-bg
boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="test.png"\r\n'
    f"Content-Type: image/png\r\n\r\n"
).encode("utf-8") + buf.getvalue() + (
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
    with urllib.request.urlopen(req, timeout=30) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        print("Success:", res.get("success"))
        print("Message:", res.get("message"))
        data_url = res.get("data_url", "")
        print("Data URL length:", len(data_url))
except Exception as e:
    print("Request failed:", e)
