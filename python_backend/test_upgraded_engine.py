import os
from PIL import Image
from hair_matting_engine import HairMattingEngine, TORCH_AVAILABLE, DEVICE

print(f"TORCH_AVAILABLE: {TORCH_AVAILABLE}, DEVICE: {DEVICE}")
engine = HairMattingEngine.get_instance()

src_path = r"C:\Users\IT\.gemini\antigravity-ide\brain\36286947-cecc-49f0-9cee-a92f6c5abb7e\.user_uploaded\media_1791011479607.png"
out_dir = r"c:\Users\IT\Desktop\printhub\python_backend\debug_output"

img = Image.open(src_path)
res = engine.remove_background(img, model_variant="portrait", refine_hair=True)

res.save(os.path.join(out_dir, "new_engine_result.png"))

# Composite with blue
blue_bg = Image.new("RGBA", res.size, (25, 78, 220, 255))
blue_comp = Image.alpha_composite(blue_bg, res)
blue_comp.save(os.path.join(out_dir, "new_engine_blue.png"))

print("Successfully executed and saved new_engine_blue.png!")
