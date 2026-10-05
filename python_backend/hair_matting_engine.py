"""
PrintHub Studio - Advanced Hair Matting Engine
State-of-the-Art Portrait Matting using BiRefNet-Portrait + High-Precision Soft Alpha
Specialized for complex hair strands, elderly white/grey beards, caps, and clothing.
"""

import os
import cv2
import numpy as np
from PIL import Image, ImageFilter
from typing import Optional, Tuple, Union

# Optional PyTorch & Transformers
TORCH_AVAILABLE = False
TRANSFORMERS_AVAILABLE = False
PYMATTING_AVAILABLE = False
DEVICE = "cpu"

try:
    import torch
    import torchvision.transforms.functional as F
    TORCH_AVAILABLE = True
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
except (ImportError, OSError, Exception) as e:
    torch = None
    F = None
    TORCH_AVAILABLE = False
    DEVICE = "cpu"
    print(f"[HairMattingEngine] PyTorch note: {e} (Falling back to PyMatting/OpenCV)")

try:
    from transformers import AutoModelForImageSegmentation, AutoProcessor, VitMatteForImageMatting
    TRANSFORMERS_AVAILABLE = True
except (ImportError, OSError, Exception):
    AutoModelForImageSegmentation = None
    AutoProcessor = None
    VitMatteForImageMatting = None
    TRANSFORMERS_AVAILABLE = False

try:
    from pymatting import estimate_foreground_ml, estimate_alpha_cf
    PYMATTING_AVAILABLE = True
except (ImportError, OSError, Exception):
    estimate_foreground_ml = None
    estimate_alpha_cf = None
    PYMATTING_AVAILABLE = False


def letterbox_image(img_pil: Image.Image, target_size: int = 1024) -> Tuple[Image.Image, int, int, int, int]:
    """
    Pads image with aspect ratio strictly preserved to target_size x target_size.
    Prevents geometric distortion, squashing, and edge artifacts.
    """
    orig_w, orig_h = img_pil.size
    scale = target_size / max(orig_w, orig_h)
    new_w = max(1, int(orig_w * scale))
    new_h = max(1, int(orig_h * scale))

    resized = img_pil.resize((new_w, new_h), Image.Resampling.BILINEAR)
    pad_img = Image.new("RGB", (target_size, target_size), (128, 128, 128))
    pad_left = (target_size - new_w) // 2
    pad_top = (target_size - new_h) // 2
    pad_img.paste(resized, (pad_left, pad_top))

    return pad_img, pad_left, pad_top, new_w, new_h


def unpad_alpha(prob_padded: np.ndarray, orig_w: int, orig_h: int, pad_left: int, pad_top: int, new_w: int, new_h: int) -> np.ndarray:
    """
    Crops out padding and resizes continuous alpha back to original image dimensions.
    """
    cropped = prob_padded[pad_top:pad_top + new_h, pad_left:pad_left + new_w]
    unpadded = cv2.resize(cropped, (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)
    return np.clip(unpadded, 0.0, 1.0)


class HairMattingEngine:
    _instance = None

    def __init__(self):
        self.device = DEVICE
        self.birefnet_model = None
        self.vitmatte_processor = None
        self.vitmatte_model = None
        self.current_model_name = "portrait"
        print(f"[HairMattingEngine] Initialized on device: {self.device}")

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = HairMattingEngine()
        return cls._instance

    def load_birefnet(self, variant: str = "portrait") -> bool:
        """
        Loads BiRefNet model:
        - 'portrait': ZhengPeng7/BiRefNet-portrait (Optimal for hair, beard, passport)
        - 'hr': ZhengPeng7/BiRefNet_HR (2048x2048 high-res)
        - 'general': ZhengPeng7/BiRefNet (General purpose)
        """
        if not TORCH_AVAILABLE or not TRANSFORMERS_AVAILABLE:
            print("[HairMattingEngine] Torch or Transformers not installed. Skipping BiRefNet load.")
            return False

        if self.birefnet_model is not None and self.current_model_name == variant:
            return True

        repo_map = {
            "portrait": "ZhengPeng7/BiRefNet-portrait",
            "hr": "ZhengPeng7/BiRefNet_HR",
            "general": "ZhengPeng7/BiRefNet",
        }
        repo_id = repo_map.get(variant, repo_map["portrait"])

        try:
            print(f"[HairMattingEngine] Loading BiRefNet ({repo_id}) on {self.device}...")
            self.birefnet_model = AutoModelForImageSegmentation.from_pretrained(
                repo_id, trust_remote_code=True
            ).to(self.device).eval()
            self.current_model_name = variant
            print(f"[HairMattingEngine] Successfully loaded BiRefNet: {repo_id}")
            return True
        except Exception as e:
            print(f"[HairMattingEngine] Error loading BiRefNet ({repo_id}): {e}")
            self.birefnet_model = None
            return False

    def predict_birefnet_soft_alpha(self, img_rgb: Image.Image, target_res: int = 1024) -> np.ndarray:
        """
        Runs BiRefNet with aspect-ratio preserving letterboxing.
        Extracts continuous sub-pixel soft alpha (0.0 to 1.0) with strand fidelity.
        """
        orig_w, orig_h = img_rgb.size
        pad_img, pad_left, pad_top, new_w, new_h = letterbox_image(img_rgb, target_size=target_res)

        tensor = F.to_tensor(pad_img)
        tensor = F.normalize(tensor, [0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        tensor = tensor.unsqueeze(0).to(self.device)

        with torch.no_grad():
            preds = self.birefnet_model(tensor)
            if isinstance(preds, (list, tuple)):
                preds = preds[-1]
            prob_padded = preds.sigmoid().squeeze().cpu().numpy()

        alpha = unpad_alpha(prob_padded, orig_w, orig_h, pad_left, pad_top, new_w, new_h)
        return alpha

    def refine_alpha_edge(self, alpha: np.ndarray) -> np.ndarray:
        """
        Subtle edge cleanup without shrinking or eroding fine hair strands.
        Preserves natural hair flyaways while smoothing any quantization noise.
        """
        # We preserve pure foreground (>0.98) and pure background (<0.02)
        # and gently smooth only the fractional transition boundary
        edge_zone = (alpha > 0.02) & (alpha < 0.98)
        if not np.any(edge_zone):
            return alpha

        # Gentle bilateral filter to preserve edges while smoothing hair boundary noise
        alpha_f32 = alpha.astype(np.float32)
        smoothed = cv2.bilateralFilter(alpha_f32, d=3, sigmaColor=0.1, sigmaSpace=3)
        
        refined = alpha.copy()
        refined[edge_zone] = smoothed[edge_zone]
        return np.clip(refined, 0.0, 1.0)

    def remove_background(
        self,
        image_input: Union[Image.Image, np.ndarray, str],
        model_variant: str = "portrait",
        refine_hair: bool = True,
        high_res: bool = False,
        decontaminate: bool = True
    ) -> Image.Image:
        """
        High-Quality Hair & Portrait Background Removal:
        1. Ingest image with RGB normalization
        2. BiRefNet-Portrait with Aspect-Ratio Preserving Letterbox
        3. Continuous Sub-Pixel Soft Alpha Extraction (0.0 to 1.0)
        4. Natural Edge Anti-Aliasing (preserves white beards, topi, hair curls)
        5. Return transparent RGBA PNG
        """
        # 1. Normalize input to PIL Image RGB
        if isinstance(image_input, str):
            img_pil = Image.open(image_input).convert("RGB")
        elif isinstance(image_input, np.ndarray):
            img_pil = Image.fromarray(image_input).convert("RGB")
        else:
            img_pil = image_input.convert("RGB")

        orig_w, orig_h = img_pil.size
        print(f"[HairMattingEngine] Processing image ({orig_w}x{orig_h}) with model: {model_variant}...")

        # ── Pipeline Path A: Deep Learning (BiRefNet-Portrait Soft Alpha) ──
        if TORCH_AVAILABLE and TRANSFORMERS_AVAILABLE:
            if self.birefnet_model is None:
                self.load_birefnet(variant="hr" if high_res else model_variant)

            if self.birefnet_model is not None:
                target_res = 2048 if high_res else 1024
                # Extract aspect-ratio-preserved continuous soft alpha
                alpha = self.predict_birefnet_soft_alpha(img_pil, target_res=target_res)

                if refine_hair:
                    alpha = self.refine_alpha_edge(alpha)

                img_np = np.array(img_pil)
                rgba = np.zeros((orig_h, orig_w, 4), dtype=np.uint8)
                rgba[:, :, :3] = img_np
                rgba[:, :, 3] = (np.clip(alpha, 0.0, 1.0) * 255).astype(np.uint8)

                result_pil = Image.fromarray(rgba, mode="RGBA")
                print("[HairMattingEngine] Successfully processed via BiRefNet Soft Alpha Pipeline.")
                return result_pil

        # ── Pipeline Path B: PyMatting Closed-Form Saliency Matting Fallback ──
        print("[HairMattingEngine] Executing PyMatting Fallback...")
        img_np = np.array(img_pil)
        h, w = img_np.shape[:2]

        # Use Otsu + morphological gradient to create an adaptive trimap without geometric distortion
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        _, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Conservative trimap
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        fg = cv2.erode(thresh, kernel, iterations=2)
        bg = cv2.dilate(thresh, kernel, iterations=3)

        trimap = np.zeros((h, w), dtype=np.float64)
        trimap[bg > 128] = 0.5
        trimap[fg > 128] = 1.0

        alpha = None
        if PYMATTING_AVAILABLE and estimate_alpha_cf is not None:
            try:
                img_norm = img_np.astype(np.float64) / 255.0
                alpha = estimate_alpha_cf(img_norm, trimap)
                alpha = np.clip(alpha, 0.0, 1.0)
            except Exception as e:
                print(f"[HairMattingEngine] PyMatting CF fallback error: {e}")

        if alpha is None:
            alpha = (thresh.astype(np.float32) / 255.0)
            alpha = cv2.GaussianBlur(alpha, (5, 5), 0)
            alpha = np.clip(alpha, 0.0, 1.0)

        rgba = np.zeros((h, w, 4), dtype=np.uint8)
        rgba[:, :, :3] = img_np
        rgba[:, :, 3] = (alpha * 255).astype(np.uint8)
        return Image.fromarray(rgba, mode="RGBA")
