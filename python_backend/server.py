"""
PrintHub Studio - High-Precision Hair Matting & AI Server (FastAPI)
Directly connects to PrintHub's React/Electron Studio (fastapiBgRemoval.ts)
Default URL: http://localhost:8000
"""

import os
import sys
import subprocess

# Auto-relaunch into Python 3.11 virtual environment if run with external/global python
venv_python = os.path.abspath(os.path.join(os.path.dirname(__file__), "venv", "Scripts", "python.exe"))
current_python = os.path.abspath(sys.executable)
if os.path.exists(venv_python) and current_python.lower() != venv_python.lower():
    print(f"[*] Re-launching with Python 3.11 AI Environment ({venv_python})...")
    res = subprocess.run([venv_python] + sys.argv)
    sys.exit(res.returncode)

import io
import base64
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image

from hair_matting_engine import HairMattingEngine, TORCH_AVAILABLE, DEVICE
from enhancement_engine import EnhancementEngine

app = FastAPI(
    title="PrintHub Studio AI Microservice",
    description="BiRefNet-Portrait + ViTMatte + PyMatting High-Precision Hair Matting & Photo Retouching",
    version="2.0.0"
)

# Enable CORS for PrintHub web client and Electron IPC
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = HairMattingEngine.get_instance()


def pil_to_data_url(img: Image.Image, format: str = "PNG") -> str:
    buffered = io.BytesIO()
    save_format = format
    if img.mode == "RGBA" and format.upper() in ["JPEG", "JPG"]:
        save_format = "PNG"
    img.save(buffered, format=save_format)
    encoded = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/{save_format.lower()};base64,{encoded}"


@app.get("/")
def root():
    return {
        "service": "PrintHub Studio AI Hair Matting Engine",
        "status": "online",
        "device": DEVICE,
        "torch_available": TORCH_AVAILABLE,
        "endpoints": [
            "/health",
            "/api/v1/passport/remove-bg",
            "/api/v1/passport/enhance",
            "/api/v1/passport/retouch"
        ]
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "healthy": True,
        "device": DEVICE,
        "gpu": (DEVICE == "cuda"),
        "birefnet_loaded": engine.birefnet_model is not None,
        "vitmatte_loaded": engine.vitmatte_model is not None,
    }


@app.post("/api/v1/passport/remove-bg")
async def remove_background(
    file: UploadFile = File(...),
    model: str = Form("birefnet"),
    refine: bool = Form(True),
    enhance: bool = Form(True)
):
    """
    Remove background with Hair Matting Pipeline:
    BiRefNet-Portrait + Trimap + ViTMatte / PyMatting + Edge Decontamination
    """
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        input_img = Image.open(io.BytesIO(contents)).convert("RGB")

        # Map model name
        variant = "portrait"
        if "hr" in model.lower():
            variant = "hr"
        elif "general" in model.lower():
            variant = "general"

        # Execute high-quality hair matting
        result_img = engine.remove_background(
            image_input=input_img,
            model_variant=variant,
            refine_hair=refine,
            high_res=(variant == "hr"),
            decontaminate=True
        )

        data_url = pil_to_data_url(result_img, format="PNG")
        return {
            "success": True,
            "data_url": data_url,
            "message": "Processed successfully via BiRefNet + ViTMatte Matting Pipeline"
        }
    except Exception as e:
        print(f"[API Error /remove-bg] {e}", file=sys.stderr)
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": str(e)}
        )


@app.post("/api/v1/passport/enhance")
async def enhance_image(
    file: UploadFile = File(...),
    scale_factor: float = Form(2.0)
):
    """
    4K Super-Resolution & Feature Sharpening
    """
    try:
        contents = await file.read()
        input_img = Image.open(io.BytesIO(contents))
        enhanced = EnhancementEngine.enhance_resolution(input_img, scale_factor=scale_factor)
        data_url = pil_to_data_url(enhanced, format="PNG")
        return {
            "success": True,
            "data_url": data_url,
            "message": f"Enhanced resolution by {scale_factor}x"
        }
    except Exception as e:
        print(f"[API Error /enhance] {e}", file=sys.stderr)
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": str(e)}
        )


@app.post("/api/v1/passport/retouch")
async def retouch_photo(
    file: UploadFile = File(...),
    preset: str = Form("natural"),
    smoothing_strength: float = Form(0.5),
    shine_reduction: float = Form(0.6),
    shadow_softening: float = Form(0.4),
    tone_balance: float = Form(0.5),
    sharpen_features: float = Form(0.35)
):
    """
    Portrait Retouching: Skin Smoothing, Tone Balancing, Shine Reduction
    """
    try:
        contents = await file.read()
        input_img = Image.open(io.BytesIO(contents))
        if preset == "upscale_4k":
            retouched = EnhancementEngine.enhance_resolution(input_img, scale_factor=2.0)
        else:
            retouched = EnhancementEngine.retouch_portrait(
                img=input_img,
                preset=preset,
                smoothing_strength=smoothing_strength,
                shine_reduction=shine_reduction,
                shadow_softening=shadow_softening,
                tone_balance=tone_balance,
                sharpen_features=sharpen_features
            )
        data_url = pil_to_data_url(retouched, format="JPEG")
        return {
            "success": True,
            "data_url": data_url,
            "message": f"Applied {preset} retouch filter"
        }
    except Exception as e:
        print(f"[API Error /retouch] {e}", file=sys.stderr)
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": str(e)}
        )


@app.post("/api/v1/passport/retouch-previews")
async def retouch_previews(file: UploadFile = File(...)):
    """
    Returns thumbnail previews for presets
    """
    try:
        contents = await file.read()
        input_img = Image.open(io.BytesIO(contents))
        # Small thumbnail for speed
        thumb = input_img.copy()
        thumb.thumbnail((160, 200), Image.Resampling.LANCZOS)

        presets = [
            {"id": "upscale_4k", "name": "4K Ultra HD", "icon": "⚡", "desc": "Pure Resolution Upscale & Unblur"},
            {"id": "natural", "name": "Natural", "icon": "✨", "desc": "Clean, authentic skin tone", "smooth": 0.4, "shine": 0.5},
            {"id": "soft_skin", "name": "Soft Skin", "icon": "🌸", "desc": "Gentle skin softening", "smooth": 0.7, "shine": 0.7},
            {"id": "studio", "name": "Studio Pro", "icon": "📸", "desc": "Crisp studio lighting", "smooth": 0.5, "shine": 0.6},
            {"id": "glamour", "name": "Glamour", "icon": "💎", "desc": "Porcelain studio finish", "smooth": 0.85, "shine": 0.8},
        ]

        previews = {}
        for p in presets:
            if p["id"] == "upscale_4k":
                preview_img = EnhancementEngine.enhance_resolution(thumb, scale_factor=2.0)
            else:
                preview_img = EnhancementEngine.retouch_portrait(
                    thumb, preset=p["id"], smoothing_strength=p.get("smooth", 0.5), shine_reduction=p.get("shine", 0.5)
                )
            previews[p["id"]] = {
                "id": p["id"],
                "name": p["name"],
                "icon": p["icon"],
                "description": p["desc"],
                "data_url": pil_to_data_url(preview_img, format="JPEG")
            }

        return {"success": True, "previews": previews}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


@app.post("/api/v1/passport/retouch-pipeline-steps")
async def retouch_pipeline_steps(file: UploadFile = File(...)):
    """
    Returns pipeline step thumbnails (original, smoothed, polished)
    """
    try:
        contents = await file.read()
        input_img = Image.open(io.BytesIO(contents))
        thumb = input_img.copy()
        thumb.thumbnail((160, 200), Image.Resampling.LANCZOS)

        orig_url = pil_to_data_url(thumb, format="JPEG")
        smoothed_img = EnhancementEngine.retouch_portrait(thumb, smoothing_strength=0.6, shine_reduction=0.2)
        polished_img = EnhancementEngine.retouch_portrait(thumb, smoothing_strength=0.6, shine_reduction=0.6, sharpen_features=0.4)

        return {
            "success": True,
            "steps": {
                "original": {"name": "Original Capture", "data_url": orig_url},
                "smoothed": {"name": "Skin Smoothing", "data_url": pil_to_data_url(smoothed_img, format="JPEG")},
                "polished": {"name": "Studio Polished", "data_url": pil_to_data_url(polished_img, format="JPEG")},
            }
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


if __name__ == "__main__":
    import uvicorn
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    print("\n=======================================================")
    print("[*] Starting PrintHub Studio AI Hair Matting Server")
    print(f"[*] Running on: http://localhost:8000")
    print(f"[*] Hardware Acceleration (CUDA/GPU): {'Enabled' if DEVICE == 'cuda' else 'CPU Mode'}")
    print("=======================================================\n")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)
