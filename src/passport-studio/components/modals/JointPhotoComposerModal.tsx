/**
 * JointPhotoComposerModal.tsx
 * Interactive 2-person Joint Passport Photo Composer & Processing Studio.
 * Allows independent uploading, scaling, panning, brightness/contrast tuning,
 * background unification, and positioning for Husband & Wife / Joint Bank Loan applicants.
 */

import React, { useState, useRef, useEffect } from 'react';
import Modal from '../../../components/ui/Modal';
import { Users, Upload, Sliders, Sun, Wand2, Check, RefreshCw, Move, ZoomIn, ZoomOut, ArrowRightLeft } from 'lucide-react';
import { removeBackgroundViaFastAPI } from '../../../services/fastapiBgRemoval';

interface JointPhotoComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmJointPhoto: (jointDataUrl: string, name: string) => void;
  language?: 'en' | 'bn';
}

export default function JointPhotoComposerModal({
  isOpen,
  onClose,
  onConfirmJointPhoto,
  language = 'bn'
}: JointPhotoComposerModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Person 1 (Left Person - e.g. Husband)
  const [person1, setPerson1] = useState<{
    src: string | null;
    name: string;
    scale: number;
    panX: number;
    panY: number;
    brightness: number;
    contrast: number;
    isBgRemoving: boolean;
  }>({
    src: null,
    name: 'Person 1 (Husband / Applicant 1)',
    scale: 1,
    panX: 0,
    panY: 0,
    brightness: 0,
    contrast: 0,
    isBgRemoving: false,
  });

  // Person 2 (Right Person - e.g. Wife)
  const [person2, setPerson2] = useState<{
    src: string | null;
    name: string;
    scale: number;
    panX: number;
    panY: number;
    brightness: number;
    contrast: number;
    isBgRemoving: boolean;
  }>({
    src: null,
    name: 'Person 2 (Wife / Applicant 2)',
    scale: 1,
    panX: 0,
    panY: 0,
    brightness: 0,
    contrast: 0,
    isBgRemoving: false,
  });

  // Joint Frame Background & Gap
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [personGap, setPersonGap] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'person1' | 'person2' | 'frame'>('person1');

  // Loaded HTML Image objects
  const img1Ref = useRef<HTMLImageElement | null>(null);
  const img2Ref = useRef<HTMLImageElement | null>(null);

  // Re-render joint composite canvas whenever parameters change
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Joint Passport Standard 55mm x 45mm @ 300 DPI -> 650px x 531px
    canvas.width = 650;
    canvas.height = 531;

    // Fill Unified Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const halfWidth = (canvas.width - personGap) / 2;

    // Draw Person 1 (Left Half)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, halfWidth, canvas.height);
    ctx.clip();
    if (img1Ref.current && person1.src) {
      ctx.filter = `brightness(${100 + person1.brightness}%) contrast(${100 + person1.contrast}%)`;
      const w = halfWidth * person1.scale;
      const h = canvas.height * person1.scale;
      const x = (halfWidth - w) / 2 + person1.panX;
      const y = (canvas.height - h) / 2 + person1.panY;
      ctx.drawImage(img1Ref.current, x, y, w, h);
    } else {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, halfWidth, canvas.height);
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Person 1 (Left)', halfWidth / 2, canvas.height / 2);
    }
    ctx.restore();

    // Draw Person 2 (Right Half)
    ctx.save();
    ctx.beginPath();
    ctx.rect(halfWidth + personGap, 0, halfWidth, canvas.height);
    ctx.clip();
    if (img2Ref.current && person2.src) {
      ctx.filter = `brightness(${100 + person2.brightness}%) contrast(${100 + person2.contrast}%)`;
      const w = halfWidth * person2.scale;
      const h = canvas.height * person2.scale;
      const x = halfWidth + personGap + (halfWidth - w) / 2 + person2.panX;
      const y = (canvas.height - h) / 2 + person2.panY;
      ctx.drawImage(img2Ref.current, x, y, w, h);
    } else {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(halfWidth + personGap, 0, halfWidth, canvas.height);
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Person 2 (Right)', halfWidth + personGap + halfWidth / 2, canvas.height / 2);
    }
    ctx.restore();

    // Draw thin center division line if gap exists
    if (personGap > 0) {
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(halfWidth, 0, personGap, canvas.height);
    }

  }, [isOpen, person1, person2, bgColor, personGap]);

  // Upload Handlers
  const handleUploadPerson1 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      img1Ref.current = img;
      setPerson1((prev) => ({ ...prev, src: url, name: file.name }));
    };
  };

  const handleUploadPerson2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      img2Ref.current = img;
      setPerson2((prev) => ({ ...prev, src: url, name: file.name }));
    };
  };

  // Remove BG Handler for Person 1
  const handleRemoveBgPerson1 = async () => {
    if (!person1.src) return;
    setPerson1((prev) => ({ ...prev, isBgRemoving: true }));
    try {
      const bgRemovedUrl = await removeBackgroundViaFastAPI(person1.src);
      const img = new Image();
      img.src = bgRemovedUrl;
      img.onload = () => {
        img1Ref.current = img;
        setPerson1((prev) => ({ ...prev, src: bgRemovedUrl, isBgRemoving: false }));
      };
    } catch {
      setPerson1((prev) => ({ ...prev, isBgRemoving: false }));
      alert('Person 1 BG remove failed.');
    }
  };

  // Remove BG Handler for Person 2
  const handleRemoveBgPerson2 = async () => {
    if (!person2.src) return;
    setPerson2((prev) => ({ ...prev, isBgRemoving: true }));
    try {
      const bgRemovedUrl = await removeBackgroundViaFastAPI(person2.src);
      const img = new Image();
      img.src = bgRemovedUrl;
      img.onload = () => {
        img2Ref.current = img;
        setPerson2((prev) => ({ ...prev, src: bgRemovedUrl, isBgRemoving: false }));
      };
    } catch {
      setPerson2((prev) => ({ ...prev, isBgRemoving: false }));
      alert('Person 2 BG remove failed.');
    }
  };

  // Swap Left and Right Persons
  const handleSwapPersons = () => {
    const tempImg = img1Ref.current;
    img1Ref.current = img2Ref.current;
    img2Ref.current = tempImg;

    const tempP1 = { ...person1 };
    setPerson1({ ...person2 });
    setPerson2(tempP1);
  };

  // Confirm and Send to Passport Studio
  const handleConfirm = () => {
    if (!canvasRef.current) return;
    if (!person1.src && !person2.src) {
      alert('কমপক্ষে ১টি ছবি আপলোড করুন!');
      return;
    }
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
    onConfirmJointPhoto(dataUrl, `Joint_Passport_${Date.now()}.jpg`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'bn' ? 'যৌথ পাসপোর্ট ছবি এডিটিং ও প্রসেসিং স্টুডিও (Joint Photo Studio)' : 'Joint Passport Photo Composer Studio'}
      maxWidth="4xl"
    >
      <div className="space-y-4 text-xs select-none">
        
        {/* Top Control Tabs */}
        <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('person1')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'person1' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
              }`}
            >
              👤 Person 1 (Left / Husband)
            </button>

            <button
              onClick={() => setActiveTab('person2')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'person2' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
              }`}
            >
              👤 Person 2 (Right / Wife)
            </button>

            <button
              onClick={() => setActiveTab('frame')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'frame' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
              }`}
            >
              🖼️ Frame & Background
            </button>
          </div>

          <button
            onClick={handleSwapPersons}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold transition"
            title="Swap Left and Right Persons"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Swap Left/Right</span>
          </button>
        </div>

        {/* Studio Body: Left Controls, Right Composite Viewport */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Left Controls Area (5 Cols) */}
          <div className="md:col-span-5 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
            
            {/* Active Tab: Person 1 Controls */}
            {activeTab === 'person1' && (
              <div className="space-y-3">
                <h4 className="font-bold text-indigo-400 uppercase text-[11px] flex items-center justify-between">
                  <span>Person 1 Controls</span>
                  <span className="text-[10px] text-slate-500 font-normal">{person1.name}</span>
                </h4>

                <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer transition">
                  <Upload className="w-4 h-4" />
                  <span>Upload Person 1 Photo</span>
                  <input type="file" accept="image/*" onChange={handleUploadPerson1} className="hidden" />
                </label>

                {person1.src && (
                  <>
                    <button
                      onClick={handleRemoveBgPerson1}
                      disabled={person1.isBgRemoving}
                      className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition disabled:opacity-50"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>{person1.isBgRemoving ? 'Removing BG...' : 'Remove Background (Person 1)'}</span>
                    </button>

                    {/* Zoom / Scale */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Face Zoom / Scale</span>
                        <span className="font-mono text-indigo-400">{Math.round(person1.scale * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0.5" max="2.5" step="0.05"
                        value={person1.scale}
                        onChange={(e) => setPerson1((p) => ({ ...p, scale: parseFloat(e.target.value) }))}
                        className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Position Offset X/Y */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400">Position X</span>
                        <input 
                          type="range" min="-150" max="150"
                          value={person1.panX}
                          onChange={(e) => setPerson1((p) => ({ ...p, panX: parseInt(e.target.value) }))}
                          className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400">Position Y</span>
                        <input 
                          type="range" min="-150" max="150"
                          value={person1.panY}
                          onChange={(e) => setPerson1((p) => ({ ...p, panY: parseInt(e.target.value) }))}
                          className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Brightness & Contrast */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Brightness</span>
                        <span className="font-mono text-amber-400">{person1.brightness}</span>
                      </div>
                      <input 
                        type="range" min="-100" max="100"
                        value={person1.brightness}
                        onChange={(e) => setPerson1((p) => ({ ...p, brightness: parseInt(e.target.value) }))}
                        className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Active Tab: Person 2 Controls */}
            {activeTab === 'person2' && (
              <div className="space-y-3">
                <h4 className="font-bold text-indigo-400 uppercase text-[11px] flex items-center justify-between">
                  <span>Person 2 Controls</span>
                  <span className="text-[10px] text-slate-500 font-normal">{person2.name}</span>
                </h4>

                <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer transition">
                  <Upload className="w-4 h-4" />
                  <span>Upload Person 2 Photo</span>
                  <input type="file" accept="image/*" onChange={handleUploadPerson2} className="hidden" />
                </label>

                {person2.src && (
                  <>
                    <button
                      onClick={handleRemoveBgPerson2}
                      disabled={person2.isBgRemoving}
                      className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition disabled:opacity-50"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>{person2.isBgRemoving ? 'Removing BG...' : 'Remove Background (Person 2)'}</span>
                    </button>

                    {/* Zoom / Scale */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Face Zoom / Scale</span>
                        <span className="font-mono text-indigo-400">{Math.round(person2.scale * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0.5" max="2.5" step="0.05"
                        value={person2.scale}
                        onChange={(e) => setPerson2((p) => ({ ...p, scale: parseFloat(e.target.value) }))}
                        className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Position Offset X/Y */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400">Position X</span>
                        <input 
                          type="range" min="-150" max="150"
                          value={person2.panX}
                          onChange={(e) => setPerson2((p) => ({ ...p, panX: parseInt(e.target.value) }))}
                          className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400">Position Y</span>
                        <input 
                          type="range" min="-150" max="150"
                          value={person2.panY}
                          onChange={(e) => setPerson2((p) => ({ ...p, panY: parseInt(e.target.value) }))}
                          className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Brightness & Contrast */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Brightness</span>
                        <span className="font-mono text-amber-400">{person2.brightness}</span>
                      </div>
                      <input 
                        type="range" min="-100" max="100"
                        value={person2.brightness}
                        onChange={(e) => setPerson2((p) => ({ ...p, brightness: parseInt(e.target.value) }))}
                        className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Active Tab: Frame & Background */}
            {activeTab === 'frame' && (
              <div className="space-y-3">
                <h4 className="font-bold text-indigo-400 uppercase text-[11px]">Unified Frame & Background</h4>
                
                <div className="space-y-1">
                  <span className="text-slate-400 block">Unified Background Color</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={bgColor} 
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-10 h-8 rounded bg-slate-900 border border-slate-700 cursor-pointer"
                    />
                    <div className="flex gap-1.5">
                      {['#ffffff', '#38bdf8', '#1e3a8a', '#e2e8f0'].map((c) => (
                        <button
                          key={c}
                          onClick={() => setBgColor(c)}
                          style={{ backgroundColor: c }}
                          className="w-6 h-6 rounded-full border border-slate-700 hover:scale-110 transition"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-800">
                  <div className="flex justify-between text-slate-400">
                    <span>Center Division Line / Gap</span>
                    <span className="font-mono text-indigo-400">{personGap}px</span>
                  </div>
                  <input 
                    type="range" min="0" max="20"
                    value={personGap}
                    onChange={(e) => setPersonGap(parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

          </div>

          {/* Right Live Composite Preview (7 Cols) */}
          <div className="md:col-span-7 flex flex-col items-center justify-center p-4 bg-slate-950 rounded-xl border border-slate-800 relative">
            <div className="text-[10px] text-slate-400 font-mono mb-2 uppercase tracking-wider">
              Joint Passport 55×45mm Frame Preview (300 DPI)
            </div>
            
            <div className="relative border-2 border-slate-700 shadow-2xl rounded bg-white overflow-hidden">
              <canvas ref={canvasRef} />
            </div>

            <p className="text-[10px] text-slate-500 italic mt-3 text-center">
              {language === 'bn' ? 'স্বামী ও স্ত্রীর মুখের সাইজ ও উচ্চতা মেলানোর জন্য লেফট/রাইট ট্যাবে গিয়ে Zoom ও Pan Y নিয়ন্ত্রণ করুন।' : 'Use Person 1 & Person 2 tabs to align face heights and lighting.'}
            </p>
          </div>

        </div>

        {/* Modal Action Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
          >
            {language === 'bn' ? 'বাতিল' : 'Cancel'}
          </button>
          
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition shadow-lg shadow-emerald-900/40"
          >
            <Check className="w-4 h-4" />
            <span>{language === 'bn' ? 'যৌথ পাসপোর্ট ফটো স্টুডিওতে আনুন' : 'Apply Joint Photo to Studio →'}</span>
          </button>
        </div>

      </div>
    </Modal>
  );
}
