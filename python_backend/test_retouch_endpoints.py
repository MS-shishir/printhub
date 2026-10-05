import urllib.request
import json
import os

src_path = r"c:\Users\IT\Desktop\printhub\python_backend\debug_output\new_engine_result.png"
with open(src_path, "rb") as f:
    img_bytes = f.read()

boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="photo.png"\r\n'
    f"Content-Type: image/png\r\n\r\n"
).encode("utf-8") + img_bytes + (
    f"\r\n--{boundary}--\r\n"
).encode("utf-8")

for endpoint in ["/api/v1/passport/retouch-previews", "/api/v1/passport/retouch-pipeline-steps"]:
    req = urllib.request.Request(
        f"http://127.0.0.1:8000{endpoint}",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            print(f"Endpoint {endpoint}: Success={res.get('success')}")
    except Exception as e:
        print(f"Endpoint {endpoint} Error: {e}")
