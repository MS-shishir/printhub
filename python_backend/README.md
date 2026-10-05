# ✂️ PrintHub Studio — Advanced AI Hair Matting & Background Engine

পাসপোর্ট, স্টুডিও পোর্ট্রেট এবং সূক্ষ্ম চুলের জন্য বিশ্বের সেরা **Alpha Matting Pipeline** (BiRefNet-Portrait + ViTMatte + PyMatting + Foreground Decontamination)।

---

## 🌟 কেন সাধারণ ব্যাকগ্রাউন্ড রিমুভারের চেয়ে এটি সেরা?

1. **BiRefNet-Portrait / HR**: সাধারণ সেগমেন্টেশন মডেলের মতো হার্ড কাটিং করে না, বরং পোট্রেট ফটোর চুলের জন্য বিশেষভাবে ট্রেইন্ড।
2. **Resolution-Adaptive Trimap Generator**: প্রতিটি ছবির রেজোলিউশন অনুযায়ী সাবজেক্টের কোর (255), নিশ্চিত ব্যাকগ্রাউন্ড (0) এবং চুলের ট্রানজিশন জোন (128) আলাদা করে।
3. **ViTMatte / PyMatting Alpha Extraction**: ট্রাইম্যাপ ও অরিজিনাল আরজিবি গাইড ইমেজ ব্যবহার করে প্রতিটি চুল ও নরম প্রান্তের সাব-পিক্সেল আলফা ম্যাট (Alpha Matte) বের করে।
4. **Color Decontamination & Despill (`pymatting.estimate_foreground_ml`)**: চুলের খাঁজে খাঁজে থাকা সাদা, সবুজ বা নীল ব্যাকগ্রাউন্ডের কালার স্পিল (Halo) স্বয়ংক্রিয়ভাবে মুছে ফেলে।
5. **PrintHub Native Integration**: কোনো কনফিগারেশন ছাড়াই সরাসরি PrintHub Studio-এর সাথে যুক্ত হয় (`http://localhost:8000`)।

---

## 🚀 দ্রুত শুরু করুন (Quick Start)

### পদ্ধতি ১: 1-Click লঞ্চার (উইন্ডোজ)
ফোল্ডারের ভিতরে থাকা **`start.bat`** ফাইলে ডাবল-ক্লিক করুন। এটি স্বয়ংক্রিয়ভাবে:
1. একটি নিরাপদ `venv` (Virtual Environment) তৈরি করবে।
2. প্রয়োজনীয় সব লাইব্রেরি ইনস্টল করবে।
3. `http://localhost:8000`-এ সার্ভার চালু করবে।

---

### পদ্ধতি ২: ম্যানুয়ালি ইনস্টলেশন (Manual Setup)

```powershell
# ১. python_backend ডিরেক্টরিতে যান
cd python_backend

# ২. ভার্চুয়াল এনভায়রনমেন্ট তৈরি ও সক্রিয় করুন
python -m venv venv
.\venv\Scripts\activate

# ৩. NVIDIA GPU (CUDA) থাকলে ফাস্ট স্পিডের জন্য PyTorch ইনস্টল করুন (সুপার ফাস্ট):
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# ৪. বাকি প্যাকেজ ইনস্টল করুন
pip install -r requirements.txt

# ৫. সার্ভার রান করুন
python server.py
```

সার্ভার চালু হলে ব্রাউজারে `http://localhost:8000/health` ওপেন করলে দেখতে পাবেন:
```json
{
  "status": "ok",
  "healthy": true,
  "device": "cuda",
  "gpu": true
}
```

---

## 🔌 PrintHub Studio-এর সাথে সংযোগ

আপনার PrintHub Studio ফ্রন্টএন্ডে কিছুই পরিবর্তন করতে হবে না!
প্রিন্টহাবের [fastapiBgRemoval.ts](file:///c:/Users/IT/Desktop/printhub/src/services/fastapiBgRemoval.ts) সার্ভিস স্বয়ংক্রিয়ভাবে প্রতি ৫ সেকেন্ড পর পর লোকাল সার্ভারের হেলথ চেক করে এবং সার্ভার চালু থাকলে স্বয়ংক্রিয়ভাবে লোকাল GPU-তে প্রসেস করে।

---

## 🎨 ComfyUI Alternative Workflow

আপনি যদি **ComfyUI** ব্যবহার করতে চান:
1. ComfyUI Manager থেকে কাস্টম নোড ইনস্টল করুন:
   - `ComfyUI-BiRefNet`
   - `ComfyUI-ViTMatte`
   - `ComfyUI_LayerStyle`
2. পাইপলাইন কানেকশন:
   - `Load Image` ➡️ `BiRefNet (Model: BiRefNet-portrait)` ➡️ `Mask`
   - `Mask` ➡️ `Generate Trimap (Erode: 8, Dilate: 14)` ➡️ `Trimap`
   - `(Image + Trimap)` ➡️ `ViTMatte (vitmatte-small)` ➡️ `Alpha Matte`
   - `(Image + Alpha Matte)` ➡️ `LayerMask Despill / Decontaminate` ➡️ `Save Image`
