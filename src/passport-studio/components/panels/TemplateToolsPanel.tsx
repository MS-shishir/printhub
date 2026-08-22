import React, { useState } from 'react';
import { Settings, Info, ShieldCheck, Eye, Grid, Sparkles, Check, Shirt, UserCheck } from 'lucide-react';
import { usePassportStore } from '../../store';
import { getTemplate } from '../../services/template.service';

// Built-in vector SVG Suit Overlays for Men and Women
const MEN_SUITS = [
  {
    id: 'men_suit_black',
    name: 'Executive Black Suit & Tie',
    gender: 'men',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><path d="M140 180 Q200 130 260 180 L310 300 L90 300 Z" fill="%231e293b"/><path d="M165 170 Q200 145 235 170 L260 300 L140 300 Z" fill="%230f172a"/><path d="M185 150 L215 150 L220 300 L180 300 Z" fill="%23ffffff"/><polygon points="200,165 208,210 200,290 192,210" fill="%23be123c"/><path d="M170 150 L185 165 L200 160 L185 145 Z" fill="%23e2e8f0"/><path d="M230 150 L215 165 L200 160 L215 145 Z" fill="%23e2e8f0"/><path d="M135 180 L180 230 L165 300 L90 300 Z" fill="%23020617"/><path d="M265 180 L220 230 L235 300 L310 300 Z" fill="%23020617"/></svg>`,
  },
  {
    id: 'men_suit_navy',
    name: 'Navy Blue Corporate Suit',
    gender: 'men',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><path d="M140 180 Q200 130 260 180 L310 300 L90 300 Z" fill="%231e3a8a"/><path d="M165 170 Q200 145 235 170 L260 300 L140 300 Z" fill="%23172554"/><path d="M185 150 L215 150 L220 300 L180 300 Z" fill="%23ffffff"/><polygon points="200,165 208,210 200,290 192,210" fill="%231e293b"/><path d="M170 150 L185 165 L200 160 L185 145 Z" fill="%23e2e8f0"/><path d="M230 150 L215 165 L200 160 L215 145 Z" fill="%23e2e8f0"/><path d="M135 180 L180 230 L165 300 L90 300 Z" fill="%230f172a"/><path d="M265 180 L220 230 L235 300 L310 300 Z" fill="%230f172a"/></svg>`,
  },
  {
    id: 'men_tuxedo',
    name: 'Classic Black Bowtie Tuxedo',
    gender: 'men',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><path d="M135 180 Q200 125 265 180 L315 300 L85 300 Z" fill="%2309090b"/><path d="M160 165 Q200 140 240 165 L265 300 L135 300 Z" fill="%2318181b"/><path d="M180 145 L220 145 L225 300 L175 300 Z" fill="%23ffffff"/><polygon points="188,160 200,168 212,160 200,178" fill="%2309090b"/><path d="M168 145 L182 160 L200 155 L182 140 Z" fill="%23f4f4f5"/><path d="M232 145 L218 160 L200 155 L218 140 Z" fill="%23f4f4f5"/><path d="M130 180 L175 235 L160 300 L85 300 Z" fill="%23020617"/><path d="M270 180 L225 235 L240 300 L315 300 Z" fill="%23020617"/></svg>`,
  },
  {
    id: 'men_charcoal',
    name: 'Charcoal Grey Blazer',
    gender: 'men',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><path d="M140 180 Q200 130 260 180 L310 300 L90 300 Z" fill="%23334155"/><path d="M165 170 Q200 145 235 170 L260 300 L140 300 Z" fill="%231e293b"/><path d="M185 150 L215 150 L220 300 L180 300 Z" fill="%23f8fafc"/><polygon points="200,165 208,210 200,290 192,210" fill="%230369a1"/><path d="M170 150 L185 165 L200 160 L185 145 Z" fill="%23cbd5e1"/><path d="M230 150 L215 165 L200 160 L215 145 Z" fill="%23cbd5e1"/></svg>`,
  },
];

const WOMEN_SUITS = [
  {
    id: 'women_blazer_black',
    name: 'Women Black Blazer & Collar',
    gender: 'women',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><path d="M145 185 Q200 135 255 185 L305 300 L95 300 Z" fill="%2318181b"/><path d="M170 175 Q200 150 230 175 L255 300 L145 300 Z" fill="%2309090b"/><path d="M180 155 Q200 140 220 155 L225 300 L175 300 Z" fill="%23ffffff"/><path d="M160 155 Q180 175 200 165 Q180 145 160 155 Z" fill="%23f4f4f5"/><path d="M240 155 Q220 175 200 165 Q220 145 240 155 Z" fill="%23f4f4f5"/><path d="M140 185 L185 240 L165 300 L95 300 Z" fill="%23020617"/><path d="M260 185 L215 240 L235 300 L305 300 Z" fill="%23020617"/></svg>`,
  },
  {
    id: 'women_suit_navy',
    name: 'Women Navy Executive Suit',
    gender: 'women',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><path d="M145 185 Q200 135 255 185 L305 300 L95 300 Z" fill="%231e3a8a"/><path d="M170 175 Q200 150 230 175 L255 300 L145 300 Z" fill="%23172554"/><path d="M180 155 Q200 140 220 155 L225 300 L175 300 Z" fill="%23f8fafc"/><path d="M160 155 Q180 175 200 165 Q180 145 160 155 Z" fill="%23e2e8f0"/><path d="M240 155 Q220 175 200 165 Q220 145 240 155 Z" fill="%23e2e8f0"/><path d="M140 185 L185 240 L165 300 L95 300 Z" fill="%230f172a"/><path d="M260 185 L215 240 L235 300 L305 300 Z" fill="%230f172a"/></svg>`,
  },
  {
    id: 'women_formal_jacket',
    name: 'Women White Collar & Coat',
    gender: 'women',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><path d="M145 185 Q200 135 255 185 L305 300 L95 300 Z" fill="%23334155"/><path d="M170 175 Q200 150 230 175 L255 300 L145 300 Z" fill="%231e293b"/><path d="M180 150 Q200 135 220 150 L225 300 L175 300 Z" fill="%23ffffff"/><path d="M160 150 Q180 170 200 160 Q180 140 160 150 Z" fill="%23cbd5e1"/><path d="M240 150 Q220 170 200 160 Q220 140 240 150 Z" fill="%23cbd5e1"/></svg>`,
  },
];

export default function TemplateToolsPanel() {
  const { state, dispatch } = usePassportStore();
  const template = getTemplate(state.selectedTemplateId, state.customWidth, state.customHeight);

  const [suitGender, setSuitGender] = useState<'men' | 'women'>('men');
  const [selectedSuitId, setSelectedSuitId] = useState<string | null>(null);

  const suitsList = suitGender === 'men' ? MEN_SUITS : WOMEN_SUITS;

  const toggleGuide = (key: 'showFaceGuide' | 'showSafeArea' | 'showGrid' | 'showEyeLine' | 'showShoulderGuide') => {
    dispatch({
      type: 'SET_GUIDE_VISIBILITY',
      payload: { [key]: !state[key] },
    });
  };

  const handleApplySuit = (suit: typeof MEN_SUITS[0]) => {
    if (selectedSuitId === suit.id) {
      setSelectedSuitId(null);
      dispatch({
        type: 'ADD_TOAST',
        payload: { id: 'suit_rem', message: 'Suit overlay removed', type: 'info', duration: 2000 },
      });
    } else {
      setSelectedSuitId(suit.id);
      dispatch({
        type: 'ADD_TOAST',
        payload: {
          id: 'suit_add',
          message: `👔 Applied ${suit.name}! Use canvas controls to adjust.`,
          type: 'success',
          duration: 3000,
        },
      });
    }
  };

  return (
    <div className="p-4 space-y-4 select-none">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
        <span>Template Tools & Specs</span>
        <span className="text-[10px] font-mono text-cyan-400">{template.dpi} DPI</span>
      </div>

      {/* ── Active Template Card ── */}
      <div className="p-3.5 rounded-xl bg-gradient-to-b from-slate-800/80 to-slate-900 border border-slate-700/60 space-y-2.5 shadow-lg">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl drop-shadow">{template.flag}</span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black text-slate-100 truncate">{template.name}</div>
            <div className="text-[10px] text-cyan-300 font-mono font-bold mt-0.5">
              {template.widthMm}×{template.heightMm}mm · ({Math.round((template.widthMm / 25.4) * 300)}×{Math.round((template.heightMm / 25.4) * 300)}px)
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 leading-relaxed bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
          <span className="font-bold text-slate-300 block mb-0.5">Official Guideline:</span>
          {template.rules}
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono">
          <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[9px] uppercase">Face Fill</span>
            <span className="font-bold text-slate-200">{Math.round(template.faceHeightRatio * 100)}%</span>
          </div>
          <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[9px] uppercase">Background</span>
            <span className="font-bold text-slate-200 truncate block">{template.bgColorName}</span>
          </div>
        </div>
      </div>

      {/* ── Visual Guide Toggles ── */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Canvas Guides</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'showFaceGuide' as const, label: 'Face Oval Guide', icon: Eye, active: state.showFaceGuide },
            { key: 'showEyeLine' as const, label: 'Eye Level Line', icon: Eye, active: state.showEyeLine },
            { key: 'showSafeArea' as const, label: 'Safe Margin', icon: ShieldCheck, active: state.showSafeArea },
            { key: 'showGrid' as const, label: 'Alignment Grid', icon: Grid, active: state.showGrid },
          ].map(({ key, label, icon: Icon, active }) => (
            <button
              key={key}
              onClick={() => toggleGuide(key)}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[10px] font-bold transition-all border ${
                active
                  ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-200'
                  : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── AI Suit & Formal Attire Overlay Gallery ── */}
      <div className="border-t border-slate-800 pt-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Shirt className="w-3.5 h-3.5 text-indigo-400" />
            <span>Formal Suit Overlays</span>
          </div>
          <span className="text-[9px] font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-500/30">
            AI Smart Attire
          </span>
        </div>

        {/* Gender Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
          <button
            onClick={() => setSuitGender('men')}
            className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              suitGender === 'men'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            👨 Men's Formal Suits
          </button>
          <button
            onClick={() => setSuitGender('women')}
            className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              suitGender === 'women'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            👩 Women's Attire
          </button>
        </div>

        {/* Suit Overlay Grid */}
        <div className="grid grid-cols-2 gap-2">
          {suitsList.map((suit) => {
            const isSelected = selectedSuitId === suit.id;
            return (
              <div
                key={suit.id}
                onClick={() => handleApplySuit(suit)}
                className={`group relative flex flex-col p-2 rounded-xl transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-slate-900 border-2 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.4)] ring-1 ring-indigo-400/50'
                    : 'bg-slate-950/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* SVG Suit Preview */}
                <div className="relative aspect-[4/3] w-full rounded-lg bg-slate-900 overflow-hidden border border-slate-800/80 flex items-center justify-center p-1">
                  <img src={suit.svg} alt={suit.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div className="pt-1.5 text-center">
                  <div className={`text-[9.5px] font-medium truncate ${isSelected ? 'text-indigo-200 font-bold' : 'text-slate-400 group-hover:text-slate-200'}`}>
                    {suit.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
