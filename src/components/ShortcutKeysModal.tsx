import React from 'react';
import { Keyboard, X, Printer, Save, Search, RefreshCw, FileText, Camera, Scan, Layers, Globe } from 'lucide-react';

interface ShortcutKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutKeysModal({ isOpen, onClose }: ShortcutKeysModalProps) {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: '⚡ সাধারণ সফটওয়্যার অ্যাকশন ও মডিউল সুইচ',
      items: [
        { key: 'Alt + 1', desc: 'পাসপোর্ট স্টুডিওতে যান (Passport Studio)', icon: Camera },
        { key: 'Alt + 2', desc: 'ফটো ল্যাব এডিটরে যান (Photo Lab Editor)', icon: Layers },
        { key: 'Alt + 3', desc: 'ডকুমেন্ট স্ক্যানারে যান (Doc Scanner Studio)', icon: Scan },
        { key: 'Alt + 4', desc: 'ইমেজ অপ্টিমাইজারে যান (Smart Optimizer)', icon: FileText },
        { key: 'Alt + 5', desc: 'প্রয়োজনীয় ওয়েবসাইট ও লিংকে যান (Links Hub)', icon: Globe },
        { key: 'Ctrl + P', desc: 'সরাসরি প্রিন্ট প্রিভিউ উইন্ডো খুলুন', icon: Printer },
        { key: 'Ctrl + S', desc: 'চলতি প্রজেক্ট ফাইল সেভ করুন', icon: Save },
        { key: 'F11', desc: 'ফুল স্ক্রিন মোড অন/অফ করুন', icon: Keyboard },
        { key: 'Esc', desc: 'চলমান পপআপ বা মোডাল বন্ধ করুন', icon: X },
      ]
    },
    {
      title: '📸 ফটো ও স্টুডিও শর্টকাট',
      items: [
        { key: 'Ctrl + B', desc: 'এক ক্লিকে ছবির ব্যাকগ্রাউন্ড পরিবর্তন', icon: Camera },
        { key: 'Ctrl + Shift + R', desc: 'ছবি ৯০ ডিগ্রি ডান দিকে ঘোরান', icon: RefreshCw },
        { key: 'Ctrl + Shift + P', desc: 'পাসপোর্ট ফটো ৪ কপি / ৮ কপি পেজে সাজান', icon: Camera },
        { key: 'Right Click', desc: 'কাস্টম অপশন মেনু খুলুন (ক্রপ, রোটেট, ডুপ্লিকেট)', icon: Layers },
      ]
    },
    {
      title: '📑 স্ক্যানার ও অপ্টিমাইজার শর্টকাট',
      items: [
        { key: 'Ctrl + Shift + S', desc: 'NID / ডকুমেন্ট স্ক্যানার মোড শুরু করুন', icon: Scan },
        { key: 'Ctrl + Shift + M', desc: 'PDF একাধিক ফাইল জোড়া দিন (Merge)', icon: FileText },
        { key: '?', desc: 'কীবোর্ড শর্টকাট তালিকা দেখুন', icon: Keyboard },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <Keyboard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">কিবোর্ড শর্টকাট কী গাইড (Shortcut Keys)</h2>
              <p className="text-xs text-slate-400 mt-0.5">দ্রুত দোকান সামলাতে এই শর্টকাটগুলো ব্যবহার করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {shortcutGroups.map((group, idx) => (
            <div key={idx} className="space-y-3">
              <h3 className="text-sm font-bold text-indigo-400 tracking-wide uppercase flex items-center gap-2">
                {group.title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {group.items.map((sc, i) => {
                  const Icon = sc.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-300 truncate">{sc.desc}</span>
                      </div>
                      <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-amber-300 font-mono text-[11px] font-semibold shrink-0 shadow-inner">
                        {sc.key}
                      </kbd>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>💡 কিবোর্ডের <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono">?</kbd> কী চেপে যেকোনো সময় এটি আবার দেখতে পারবেন।</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            ঠিক আছে
          </button>
        </div>

      </div>
    </div>
  );
}
