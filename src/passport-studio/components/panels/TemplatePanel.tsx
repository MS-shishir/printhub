import React, { useState, useEffect } from 'react';
import { Check, Flag, Globe, Settings, Search, Scissors, Sparkles, ArrowRight } from 'lucide-react';
import { usePassportStore } from '../../store';
import { getAllTemplates, getTemplate } from '../../services/template.service';
import { fillBackground } from '../../services/image-processing.service';

interface TemplatePanelProps {
  onGetCroppedUrl?: () => string | null;
}

type TabType = 'bangladesh' | 'international' | 'album' | 'custom';

// High-resolution, cross-platform SVG Country Flags
const COUNTRY_FLAGS: Record<string, React.ReactNode> = {
  bd: (
    <svg className="w-5 h-3.5 rounded-[2px] shadow-sm shrink-0" viewBox="0 0 600 360">
      <rect width="600" height="360" fill="#006a4e" />
      <circle cx="270" cy="180" r="110" fill="#f42a41" />
    </svg>
  ),
  sa: (
    <svg className="w-5 h-3.5 rounded-[2px] shadow-sm shrink-0" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="#138808" />
      <path d="M150 240 H450 M220 180 H380" stroke="#ffffff" strokeWidth="16" strokeLinecap="round" />
    </svg>
  ),
  ae: (
    <svg className="w-5 h-3.5 rounded-[2px] shadow-sm shrink-0" viewBox="0 0 600 300">
      <rect width="600" height="100" fill="#00732f" />
      <rect y="100" width="600" height="100" fill="#ffffff" />
      <rect y="200" width="600" height="100" fill="#000000" />
      <rect width="150" height="300" fill="#ff0000" />
    </svg>
  ),
  us: (
    <svg className="w-5 h-3.5 rounded-[2px] shadow-sm shrink-0" viewBox="0 0 740 390">
      <rect width="740" height="390" fill="#b22234" />
      <path d="M0 30H740M0 90H740M0 150H740M0 210H740M0 270H740M0 330H740" stroke="#ffffff" strokeWidth="30" />
      <rect width="296" height="210" fill="#3c3b6e" />
      <circle cx="148" cy="105" r="35" fill="#ffffff" />
    </svg>
  ),
  uk: (
    <svg className="w-5 h-3.5 rounded-[2px] shadow-sm shrink-0" viewBox="0 0 600 300">
      <rect width="600" height="300" fill="#012169" />
      <path d="M0 0 L600 300 M600 0 L0 300" stroke="#ffffff" strokeWidth="55" />
      <path d="M0 0 L600 300 M600 0 L0 300" stroke="#C8102E" strokeWidth="25" />
      <path d="M300 0 V300 M0 150 H600" stroke="#ffffff" strokeWidth="85" />
      <path d="M300 0 V300 M0 150 H600" stroke="#C8102E" strokeWidth="45" />
    </svg>
  ),
  eu: (
    <svg className="w-5 h-3.5 rounded-[2px] shadow-sm shrink-0" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="#003399" />
      <circle cx="300" cy="200" r="100" fill="none" stroke="#ffcc00" strokeWidth="12" strokeDasharray="1 30" />
    </svg>
  ),
  ca: (
    <svg className="w-5 h-3.5 rounded-[2px] shadow-sm shrink-0" viewBox="0 0 600 300">
      <rect width="150" height="300" fill="#ff0000" />
      <rect x="150" width="300" height="300" fill="#ffffff" />
      <rect x="450" width="150" height="300" fill="#ff0000" />
      <polygon points="300,70 320,120 360,120 330,150 340,190 300,170 260,190 270,150 240,120 280,120" fill="#ff0000" />
    </svg>
  ),
  in: (
    <svg className="w-5 h-3.5 rounded-[2px] shadow-sm shrink-0" viewBox="0 0 600 390">
      <rect width="600" height="130" fill="#ff9933" />
      <rect y="130" width="600" height="130" fill="#ffffff" />
      <rect y="260" width="600" height="130" fill="#138808" />
      <circle cx="300" cy="195" r="42" fill="none" stroke="#000080" strokeWidth="7" />
    </svg>
  ),
  sg: (
    <svg className="w-5 h-3.5 rounded-[2px] shadow-sm shrink-0" viewBox="0 0 600 360">
      <rect width="600" height="180" fill="#ed2939" />
      <rect y="180" width="600" height="180" fill="#ffffff" />
      <circle cx="150" cy="90" r="50" fill="#ffffff" />
    </svg>
  ),
  my: (
    <svg className="w-5 h-3.5 rounded-[2px] shadow-sm shrink-0" viewBox="0 0 600 300">
      <rect width="600" height="300" fill="#cc0000" />
      <path d="M0 30H600M0 90H600M0 150H600M0 210H600M0 270H600" stroke="#ffffff" strokeWidth="25" />
      <rect width="300" height="170" fill="#000066" />
    </svg>
  ),
  au: (
    <svg className="w-5 h-3.5 rounded-[2px] shadow-sm shrink-0" viewBox="0 0 600 300">
      <rect width="600" height="300" fill="#00008b" />
      <rect width="300" height="150" fill="#012169" />
      <path d="M0 0 L300 150 M300 0 L0 150" stroke="#ffffff" strokeWidth="30" />
      <path d="M150 0 V150 M0 75 H300" stroke="#ffffff" strokeWidth="45" />
      <path d="M150 0 V150 M0 75 H300" stroke="#e4002b" strokeWidth="25" />
    </svg>
  ),
};

export default function TemplatePanel({ onGetCroppedUrl }: TemplatePanelProps) {
  const { state, dispatch } = usePassportStore();
  const templates = getAllTemplates();
  const selected = state.selectedTemplateId;

  const currentTemplate = getTemplate(selected, state.customWidth, state.customHeight);

  // Default active tab based on selected template category
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (selected === 'custom') return 'custom';
    if (currentTemplate.category === 'album') return 'album';
    if (currentTemplate.category === 'international') return 'international';
    return 'bangladesh';
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Local string state for smooth typing, deleting, and backspacing
  const [widthInput, setWidthInput] = useState<string>(() => String(state.customWidth || 40));
  const [heightInput, setHeightInput] = useState<string>(() => String(state.customHeight || 50));

  // Sync from store when custom dimensions change from outside
  useEffect(() => {
    if (state.customWidth != null && String(state.customWidth) !== widthInput && parseFloat(widthInput) !== state.customWidth) {
      setWidthInput(String(state.customWidth));
    }
  }, [state.customWidth]);

  useEffect(() => {
    if (state.customHeight != null && String(state.customHeight) !== heightInput && parseFloat(heightInput) !== state.customHeight) {
      setHeightInput(String(state.customHeight));
    }
  }, [state.customHeight]);

  const handleWidthChange = (valStr: string) => {
    setWidthInput(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && parsed > 0) {
      dispatch({
        type: 'SET_TEMPLATE',
        payload: { templateId: 'custom', customWidth: parsed },
      });
    }
  };

  const handleWidthBlur = () => {
    const parsed = parseFloat(widthInput);
    const valid = isNaN(parsed) || parsed < 5 ? 40 : Math.min(500, parsed);
    setWidthInput(String(valid));
    dispatch({
      type: 'SET_TEMPLATE',
      payload: { templateId: 'custom', customWidth: valid },
    });
  };

  const handleHeightChange = (valStr: string) => {
    setHeightInput(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && parsed > 0) {
      dispatch({
        type: 'SET_TEMPLATE',
        payload: { templateId: 'custom', customHeight: parsed },
      });
    }
  };

  const handleHeightBlur = () => {
    const parsed = parseFloat(heightInput);
    const valid = isNaN(parsed) || parsed < 5 ? 50 : Math.min(500, parsed);
    setHeightInput(String(valid));
    dispatch({
      type: 'SET_TEMPLATE',
      payload: { templateId: 'custom', customHeight: valid },
    });
  };

  const applyCustomPreset = (w: number, h: number) => {
    setWidthInput(String(w));
    setHeightInput(String(h));
    dispatch({
      type: 'SET_TEMPLATE',
      payload: { templateId: 'custom', customWidth: w, customHeight: h },
    });
    const currentCrop = onGetCroppedUrl?.() || state.croppedImage || state.processedImage || state.originalImage;
    if (currentCrop) {
      dispatch({
        type: 'UPSERT_TRAY_ITEM',
        payload: {
          name: state.photoName || 'Processed Photo',
          croppedUrl: currentCrop,
          templateId: 'custom',
          widthMm: w,
          heightMm: h,
          defaultCopies: 4,
        },
      });
    }
  };

  const handleCutToTemplate = async () => {
    const cutUrl = onGetCroppedUrl?.() || state.croppedImage;
    if (!cutUrl) {
      dispatch({ type: 'SET_ACTIVE_PANEL', payload: 'compliance' });
      return;
    }

    let finalUrl = cutUrl;
    try {
      const bgColor = state.bgConfig.color || '#ffffff';
      finalUrl = await fillBackground(cutUrl, bgColor);
    } catch {
      finalUrl = cutUrl;
    }

    dispatch({ type: 'SET_PROCESSED_IMAGE', payload: finalUrl });
    dispatch({ type: 'SET_CROPPED_IMAGE', payload: finalUrl });
    dispatch({
      type: 'SET_TRANSFORM',
      payload: { zoom: 1, pan: { x: 0, y: 0 }, rotation: 0, flipX: false, flipY: false },
    });

    const activeW = selected === 'custom' ? state.customWidth : currentTemplate.widthMm;
    const activeH = selected === 'custom' ? state.customHeight : currentTemplate.heightMm;

    dispatch({
      type: 'UPSERT_TRAY_ITEM',
      payload: {
        name: state.photoName || 'Processed Photo',
        croppedUrl: finalUrl,
        templateId: selected,
        widthMm: activeW,
        heightMm: activeH,
        defaultCopies: 4,
      },
    });

    dispatch({
      type: 'ADD_TOAST',
      payload: {
        id: 'tpl_cut',
        message: `✂️ Size set to ${currentTemplate.name}!`,
        type: 'success',
        duration: 3000,
      },
    });
    dispatch({ type: 'SET_ACTIVE_PANEL', payload: 'compliance' });
  };

  // Filter templates by active tab and search query
  let displayedTemplates = templates.filter((t) => t.category === activeTab);
  if ((activeTab === 'international' || activeTab === 'album') && searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase().trim();
    displayedTemplates = displayedTemplates.filter(
      (t) =>
        t.country.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.rules.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
    );
  }

  const getFlagComponent = (tpl: typeof templates[0]) => {
    if (tpl.category === 'album') {
      return <span className="text-base shrink-0">{tpl.flag || '🖼️'}</span>;
    }
    const idKey = tpl.id.split('_')[0].toLowerCase();
    if (COUNTRY_FLAGS[idKey]) return COUNTRY_FLAGS[idKey];
    if (tpl.category === 'bangladesh') return COUNTRY_FLAGS.bd;
    return COUNTRY_FLAGS.us;
  };

  return (
    <div className="flex flex-col h-full p-3.5 space-y-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Templates & Presets
        </div>
        <span className="text-[10px] text-indigo-400 font-mono font-bold bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-500/30">
          {currentTemplate.name}
        </span>
      </div>

      {/* Category Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl shrink-0">
        {[
          { id: 'bangladesh' as TabType, label: 'BD Sizes', flagKey: 'bd' },
          { id: 'international' as TabType, label: 'Global', flagKey: 'us' },
          { id: 'album' as TabType, label: 'Album', icon: '🖼️' },
          { id: 'custom' as TabType, label: 'Custom', icon: '⚙️' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9.5px] font-bold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {tab.flagKey ? COUNTRY_FLAGS[tab.flagKey] : <span>{tab.icon}</span>}
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search Input (Shown on International & Album tab) */}
      {(activeTab === 'international' || activeTab === 'album') && (
        <div className="relative shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'album' ? "Filter size (4R, 5R, 8R, 12x18, 12x24)..." : "Filter country (US, UK, Schengen, Visa)..."}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-0.5">
        {activeTab === 'custom' ? (
          <div className="space-y-3">
            <button
              onClick={() => dispatch({ type: 'SET_TEMPLATE', payload: { templateId: 'custom' } })}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${
                selected === 'custom'
                  ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-950'
                  : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-900'
              }`}
            >
              <span className="text-xl">⚙️</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold">Custom Dimensions</div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {state.customWidth}×{state.customHeight}mm
                </div>
              </div>
              {selected === 'custom' && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
            </button>

            {/* Custom Inputs */}
            <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-3">
              <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Enter Custom Size (mm)</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-medium">Width (mm)</label>
                  <input
                    type="number"
                    min={5}
                    max={500}
                    value={widthInput}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    onBlur={handleWidthBlur}
                    placeholder="40"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-indigo-200 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-medium">Height (mm)</label>
                  <input
                    type="number"
                    min={5}
                    max={500}
                    value={heightInput}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    onBlur={handleHeightBlur}
                    placeholder="50"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-indigo-200 focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              {/* Quick Custom Dimension Presets */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">Quick Presets</span>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { label: '40×50mm', w: 40, h: 50 },
                    { label: '35×45mm', w: 35, h: 45 },
                    { label: '50×50mm', w: 50, h: 50 },
                    { label: '25×30mm', w: 25, h: 30 },
                    { label: '70×120mm', w: 70, h: 120 },
                    { label: '100×150mm', w: 100, h: 150 },
                  ].map((p) => {
                    const isCurrent = state.customWidth === p.w && state.customHeight === p.h;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => applyCustomPreset(p.w, p.h)}
                        className={`py-1 px-1 rounded text-[9.5px] font-mono font-semibold transition border ${
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          displayedTemplates.map((tpl) => {
            const isActive = tpl.id === selected;
            return (
              <button
                key={tpl.id}
                onClick={() => {
                  dispatch({ type: 'SET_TEMPLATE', payload: { templateId: tpl.id } });
                  const currentCrop = onGetCroppedUrl?.() || state.croppedImage || state.processedImage || state.originalImage;
                  if (currentCrop) {
                    dispatch({
                      type: 'UPSERT_TRAY_ITEM',
                      payload: {
                        name: state.photoName || 'Processed Photo',
                        croppedUrl: currentCrop,
                        templateId: tpl.id,
                        widthMm: tpl.widthMm,
                        heightMm: tpl.heightMm,
                        defaultCopies: 4,
                      },
                    });
                  }
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all border ${
                  isActive
                    ? 'bg-indigo-950/40 border-indigo-500/80 text-indigo-200 shadow-md shadow-indigo-950/50 ring-1 ring-indigo-500/30'
                    : 'bg-slate-950/50 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                {getFlagComponent(tpl)}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{tpl.name}</div>
                  <div className="text-[9.5px] text-slate-500 font-mono mt-0.5">
                    {tpl.widthMm}×{tpl.heightMm}mm · {tpl.dpi} DPI
                  </div>
                </div>
                {isActive && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
              </button>
            );
          })
        )}
      </div>

      {/* ── Professional Action Button at BOTTOM (No Truncated Text) ── */}
      <div className="pt-2 border-t border-slate-800/80 shrink-0 space-y-1">
        <button
          onClick={handleCutToTemplate}
          disabled={!state.originalImage}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Scissors className="w-4 h-4 shrink-0 text-emerald-100" />
            <div className="text-left min-w-0">
              <div className="text-xs font-black leading-tight">Apply & Lock Size</div>
              <div className="text-[9px] text-emerald-100/80 font-mono truncate font-medium">
                {currentTemplate.name}
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 shrink-0 text-white/90" />
        </button>
      </div>
    </div>
  );
}
