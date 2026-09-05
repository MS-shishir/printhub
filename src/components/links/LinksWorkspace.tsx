import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ExternalLink, Plus, Search, Star, Trash2, Edit3, Copy, Check,
  Camera, FileText, Landmark, Wrench, Globe, Download,
  Upload, RotateCcw, Tag, ShieldCheck, Sparkles, Filter,
  ArrowUpDown, X, AlertCircle, Bookmark, Layers, GraduationCap,
  Briefcase, CreditCard, Car, UserCheck, Plane
} from 'lucide-react';
import { LinkItem, LinkCategory, LinkCategoryMeta } from '../../types/links';
import { linkService, DEFAULT_CATEGORIES } from '../../services/linkService';
import { AppLanguage } from '../../types';

interface LinksWorkspaceProps {
  language?: AppLanguage;
  onAddRecentFile?: (name: string, type: 'PDF' | 'Photo' | 'Passport' | 'CV' | 'Doc' | 'Design' | 'Scan') => void;
}

type SortOption = 'recent' | 'popular' | 'alpha' | 'favorite';

export default function LinksWorkspace({ language = 'bn' }: LinksWorkspaceProps) {
  // State
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [deletingLink, setDeletingLink] = useState<LinkItem | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState<string>('nid');
  const [formBadge, setFormBadge] = useState<string>('FREE');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formIsFavorite, setFormIsFavorite] = useState(false);
  const [formError, setFormError] = useState('');

  // File import ref
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load links on mount
  useEffect(() => {
    loadLinks();

    const handleLinksUpdated = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail) {
        setLinks(customEvt.detail);
      }
    };

    window.addEventListener('printhub:links-updated', handleLinksUpdated);
    return () => {
      window.removeEventListener('printhub:links-updated', handleLinksUpdated);
    };
  }, []);

  const loadLinks = () => {
    const loaded = linkService.getAllLinks();
    setLinks(loaded);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Discover all unique categories (built-in + any custom categories)
  const allCategories = useMemo(() => {
    const defaultIds = new Set(DEFAULT_CATEGORIES.map(c => c.id));
    const extraCategories: LinkCategoryMeta[] = [];

    links.forEach(l => {
      if (!defaultIds.has(l.category)) {
        defaultIds.add(l.category);
        extraCategories.push({
          id: l.category,
          nameBn: l.category,
          nameEn: l.category,
          icon: 'Bookmark',
          color: 'from-purple-500 to-indigo-600',
          description: 'কাস্টম ক্যাটাগরি'
        });
      }
    });

    return [...DEFAULT_CATEGORIES, ...extraCategories];
  }, [links]);

  // Filter and sort links
  const filteredLinks = useMemo(() => {
    let result = [...links];

    // Category filter
    if (selectedCategory === 'favorites') {
      result = result.filter(l => l.isFavorite);
    } else if (selectedCategory !== 'all') {
      result = result.filter(l => l.category === selectedCategory);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(l => 
        l.title.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q) ||
        (l.description && l.description.toLowerCase().includes(q)) ||
        (l.tags && l.tags.some(t => t.toLowerCase().includes(q))) ||
        l.category.toLowerCase().includes(q) ||
        (l.badge && l.badge.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'favorite') {
        if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      }
      if (sortBy === 'popular') {
        const clicksA = a.clicksCount || 0;
        const clicksB = b.clicksCount || 0;
        if (clicksB !== clicksA) return clicksB - clicksA;
        return b.updatedAt - a.updatedAt;
      }
      if (sortBy === 'alpha') {
        return a.title.localeCompare(b.title);
      }
      // 'recent'
      return b.updatedAt - a.updatedAt;
    });

    return result;
  }, [links, selectedCategory, searchQuery, sortBy]);

  // Quick stats
  const totalCount = links.length;
  const favCount = links.filter(l => l.isFavorite).length;

  // Actions
  const handleOpenLink = (link: LinkItem) => {
    linkService.openLink(link.url, link.id);
    loadLinks();
  };

  const handleCopyUrl = (link: LinkItem) => {
    navigator.clipboard.writeText(link.url);
    setCopiedId(link.id);
    showToast(language === 'bn' ? 'লিংক ক্লিপবোর্ডে কপি করা হয়েছে!' : 'Link copied to clipboard!');
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleToggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    linkService.toggleFavorite(id);
    loadLinks();
  };

  const handleOpenAddModal = () => {
    setEditingLink(null);
    setFormTitle('');
    setFormUrl('');
    setFormCategory(selectedCategory !== 'all' && selectedCategory !== 'favorites' ? selectedCategory : 'nid');
    setFormBadge('FREE');
    setCustomCategoryInput('');
    setFormDescription('');
    setFormTags('');
    setFormIsFavorite(false);
    setFormError('');
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (e: React.MouseEvent, link: LinkItem) => {
    e.stopPropagation();
    setEditingLink(link);
    setFormTitle(link.title);
    setFormUrl(link.url);
    setFormCategory(link.category);
    setFormBadge(link.badge || 'FREE');
    setCustomCategoryInput('');
    setFormDescription(link.description || '');
    setFormTags(link.tags ? link.tags.join(', ') : '');
    setFormIsFavorite(link.isFavorite || false);
    setFormError('');
    setIsAddEditModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError(language === 'bn' ? 'দয়া করে লিংকের নাম লিখুন' : 'Please enter a title');
      return;
    }
    if (!formUrl.trim()) {
      setFormError(language === 'bn' ? 'দয়া করে ওয়েবসাইটের URL লিখুন' : 'Please enter website URL');
      return;
    }

    const finalCategory = formCategory === '__custom__' 
      ? (customCategoryInput.trim() || 'tools') 
      : formCategory;

    const parsedTags = formTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    if (editingLink) {
      linkService.updateLink(editingLink.id, {
        title: formTitle.trim(),
        url: formUrl.trim(),
        category: finalCategory,
        badge: formBadge,
        description: formDescription.trim(),
        tags: parsedTags,
        isFavorite: formIsFavorite,
      });
      showToast(language === 'bn' ? 'লিংক সফলভাবে আপডেট করা হয়েছে!' : 'Link updated successfully!');
    } else {
      linkService.addLink({
        title: formTitle.trim(),
        url: formUrl.trim(),
        category: finalCategory,
        badge: formBadge,
        description: formDescription.trim(),
        tags: parsedTags,
        isFavorite: formIsFavorite,
      });
      showToast(language === 'bn' ? 'নতুন লিংক সফলভাবে যোগ করা হয়েছে!' : 'New link added successfully!');
    }

    loadLinks();
    setIsAddEditModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (!deletingLink) return;
    linkService.deleteLink(deletingLink.id);
    loadLinks();
    setDeletingLink(null);
    showToast(language === 'bn' ? 'লিংক সফলভাবে মুছে ফেলা হয়েছে' : 'Link deleted successfully');
  };

  const handleExport = () => {
    linkService.exportLinksJSON();
    showToast(language === 'bn' ? 'লিংক ব্যাকআপ ফাইল ডাউনলোড হয়েছে' : 'Backup downloaded');
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = linkService.importLinksJSON(content, 'merge');
        if (res.success) {
          loadLinks();
          showToast(
            language === 'bn' 
              ? `${res.count}টি নতুন লিংক সফলভাবে ইম্পোর্ট করা হয়েছে!` 
              : `Successfully imported ${res.count} links!`
          );
        } else {
          alert(res.error || 'Import failed');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetToDefault = () => {
    linkService.resetToDefault();
    loadLinks();
    setIsResetConfirmOpen(false);
    showToast(language === 'bn' ? 'লিংক লিস্ট মূল ডিফল্ট প্রিসেটে রিস্টোর করা হয়েছে' : 'Reset to default links completed');
  };

  // Helper to render category icon
  const renderCategoryIcon = (catId: string, className = 'w-4 h-4') => {
    switch (catId) {
      case 'nid': return <UserCheck className={className} />;
      case 'birth': return <FileText className={className} />;
      case 'passport': return <Plane className={className} />;
      case 'land': return <Landmark className={className} />;
      case 'education': return <GraduationCap className={className} />;
      case 'jobs': return <Briefcase className={className} />;
      case 'challan': return <CreditCard className={className} />;
      case 'travel': return <Car className={className} />;
      case 'photo': return <Camera className={className} />;
      case 'tools': return <Wrench className={className} />;
      default: return <Bookmark className={className} />;
    }
  };

  // Helper for badge pill colors
  const renderBadge = (badge?: string) => {
    if (!badge) return null;
    const b = badge.toUpperCase();
    let badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

    if (b === 'VIP') {
      badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10';
    } else if (b === 'GOVT') {
      badgeStyle = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    } else if (b === 'FAST') {
      badgeStyle = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    } else if (b === 'POPULAR') {
      badgeStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    } else if (b === 'NEW') {
      badgeStyle = 'bg-teal-500/20 text-teal-300 border-teal-500/30';
    }

    return (
      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider uppercase border ${badgeStyle}`}>
        {b}
      </span>
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      
      {/* ── Top Header Toolbar ─────────────────────────────────────────── */}
      <div className="h-14 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 gap-3 z-20">
        
        {/* Left: Title & Total Count Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-600/30 border border-emerald-400/30">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm text-white tracking-tight font-mono">
                  {language === 'bn' ? 'সাইবার ও স্টুডিও লিংক ডিরেক্টরি' : 'Cyber & Studio Links Hub'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {totalCount} {language === 'bn' ? 'টি সেবা' : 'Services'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {language === 'bn' ? 'এনআইডি, পাসপোর্ট, জন্ম নিবন্ধন, জমি, ভর্তি ও সরকারি অনলাইন সেবা' : 'NID, Passport, BDRIS, Land, Admission & Govt e-Services'}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Search input */}
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'bn' ? 'সার্ভিস, ওয়েবসাইট বা কীওয়ার্ড খুঁজুন (যেমন: nid, passport, চালান)...' : 'Search services, websites or tags...'}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Add Link Button */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition active:scale-95 border border-emerald-400/30 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'নতুন লিংক যোগ' : 'Add Link'}</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          {/* Backup / Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
            title={language === 'bn' ? 'লিংক ব্যাকআপ ডাউনলোড করুন' : 'Export Links Backup'}
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">{language === 'bn' ? 'ব্যাকআপ' : 'Export'}</span>
          </button>

          {/* Restore / Import */}
          <button
            onClick={() => importFileRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
            title={language === 'bn' ? 'ব্যাকআপ ফাইল থেকে রিস্টোর করুন' : 'Import Links from Backup'}
          >
            <Upload className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">{language === 'bn' ? 'ইম্পোর্ট' : 'Import'}</span>
          </button>
          <input
            type="file"
            ref={importFileRef}
            onChange={handleImportFileChange}
            accept=".json,application/json"
            className="hidden"
          />

          {/* Reset Defaults */}
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
            title={language === 'bn' ? 'ডিফল্ট প্রিসেটে রিসেট করুন' : 'Reset to Default Links'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Offline Persistence & Status Banner ────────────────────────── */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            {language === 'bn' ? '১০০% অফলাইন সিঙ্ক একটিভ' : '100% Offline Persistence Active'}
          </span>
          <span className="text-slate-600">•</span>
          <span>
            {language === 'bn' 
              ? 'লিংক যোগ, এডিট ও ডিলিট সম্পূর্ণ অফলাইনে সংরক্ষিত থাকে। ওয়েবসাইট ওপেন করতে ইন্টারনেট লাগবে।'
              : 'Link management is 100% offline persistent. Visiting websites requires internet.'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300">
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <span>{language === 'bn' ? 'সর্টিং:' : 'Sort:'}</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="recent">{language === 'bn' ? 'সর্বশেষ আপডেট' : 'Recently Updated'}</option>
              <option value="popular">{language === 'bn' ? 'জনপ্রিয় (ক্লিক সংখ্যা)' : 'Most Clicked'}</option>
              <option value="favorite">{language === 'bn' ? 'পছন্দের লিংক আগে' : 'Favorites First'}</option>
              <option value="alpha">{language === 'bn' ? 'বর্ণানুক্রমিক (A-Z)' : 'Alphabetical (A-Z)'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Main Workspace Body: Categories Sidebar + Links Grid ────────── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Categories Navigation */}
        <aside className="w-72 bg-slate-900/50 border-r border-slate-800/80 flex flex-col shrink-0 overflow-y-auto p-2.5 gap-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 py-1 flex items-center justify-between">
            <span>{language === 'bn' ? 'ক্যাটাগরি সমূহ' : 'Categories'}</span>
            <Filter className="w-3 h-3 text-slate-500" />
          </div>

          {/* All Links Tab */}
          <button
            onClick={() => setSelectedCategory('all')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4" />
              <span>{language === 'bn' ? 'সকল সেবা ও লিংক (All)' : 'All Services & Links'}</span>
            </div>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
              selectedCategory === 'all' ? 'bg-indigo-700/80 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {totalCount}
            </span>
          </button>

          {/* Favorites Tab */}
          <button
            onClick={() => setSelectedCategory('favorites')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === 'favorites'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>{language === 'bn' ? 'পছন্দের লিংক (Favorites)' : 'Favorite Links'}</span>
            </div>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
              selectedCategory === 'favorites' ? 'bg-amber-700/80 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {favCount}
            </span>
          </button>

          <div className="my-1.5 border-t border-slate-800/80" />

          {/* Categorized List */}
          {allCategories.map((cat) => {
            const count = links.filter(l => l.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-1">
                  <div className={`p-1 rounded-lg ${isSelected ? 'text-white' : 'text-indigo-400'}`}>
                    {renderCategoryIcon(cat.id, 'w-3.5 h-3.5')}
                  </div>
                  <span className="truncate">{language === 'bn' ? cat.nameBn : cat.nameEn}</span>
                </div>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                  isSelected ? 'bg-indigo-700/80 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Right Content Area: Links Grid */}
        <main className="flex-1 overflow-y-auto p-4 bg-slate-950">
          {filteredLinks.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center text-slate-400 p-8">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
                <Globe className="w-8 h-8 opacity-40" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-200">
                  {language === 'bn' ? 'কোনো লিংক পাওয়া যায়নি' : 'No links found'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  {searchQuery 
                    ? (language === 'bn' ? `"${searchQuery}" এর সাথে কোনো লিংক মেলেনি। অন্য কিওয়ার্ড দিয়ে খুঁজুন।` : `No matches found for "${searchQuery}".`)
                    : (language === 'bn' ? 'এই ক্যাটাগরিতে কোনো লিংক নেই। নতুন লিংক যোগ করতে উপরের বাটনে ক্লিক করুন।' : 'No links in this category. Click Add Link to create one.')}
                </p>
              </div>
              <button
                onClick={handleOpenAddModal}
                className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'bn' ? 'নতুন লিংক যোগ করুন' : 'Add First Link'}</span>
              </button>
            </div>
          ) : (
            /* Cards Grid (Senior UI/UX 4-column compact layout with large logos and full card clickability) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-2.5">
              {filteredLinks.map((link) => {
                const domain = linkService.getDomain(link.url);
                const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

                return (
                  <div
                    key={link.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenLink(link)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenLink(link);
                      }
                    }}
                    className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40 rounded-xl p-2.5 flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:shadow-indigo-950/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] cursor-pointer overflow-hidden select-none"
                    title={language === 'bn' ? `${link.title} - ওপেন করতে ক্লিক করুন` : `${link.title} - Click to open`}
                  >
                    {/* Top ambient hover glow highlight */}
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/0 to-transparent group-hover:via-indigo-500/70 transition-all duration-300 pointer-events-none" />

                    <div>
                      {/* Top Header Row: Big Logo + Title/Domain + Badge/Fav */}
                      <div className="flex items-start gap-2.5">
                        
                        {/* 🌟 Big Prominent Brand Logo / Favicon */}
                        <div className="w-11 h-11 rounded-xl bg-slate-950/90 border border-slate-800 group-hover:border-indigo-500/40 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group-hover:shadow-md group-hover:shadow-indigo-500/10 transition-all duration-200 p-1.5 relative">
                          <img
                            src={faviconUrl}
                            alt=""
                            className="w-7 h-7 object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-200"
                            onError={(e) => {
                              const target = e.target as HTMLElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          {/* Fallback Icon if favicon fails */}
                          <div className="hidden absolute inset-0 items-center justify-center text-indigo-400 bg-indigo-950/40">
                            {renderCategoryIcon(link.category, 'w-5 h-5')}
                          </div>
                        </div>

                        {/* Title & Domain/Meta */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className="font-bold text-xs text-slate-100 group-hover:text-indigo-200 transition-colors truncate tracking-tight">
                              {link.title}
                            </h3>
                            
                            {/* Favorite Button */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleFavorite(e, link.id)}
                              className="p-1 -mr-1 -mt-0.5 rounded-md text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition cursor-pointer shrink-0"
                              title={link.isFavorite ? 'Remove from favorites' : 'Pin to favorites'}
                            >
                              <Star className={`w-3.5 h-3.5 transition-colors ${link.isFavorite ? 'text-amber-400 fill-amber-400' : ''}`} />
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                              {domain}
                            </span>
                            {renderBadge(link.badge)}
                          </div>
                        </div>
                      </div>

                      {/* Compact Description (1 line clamp to keep card compact) */}
                      {link.description && (
                        <p className="text-[11px] text-slate-400/90 mt-1.5 line-clamp-1 leading-snug">
                          {link.description}
                        </p>
                      )}
                    </div>

                    {/* Bottom Action Footer (Tight & Elegant) */}
                    <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between gap-1">
                      
                      {/* Left: Quick Actions (Copy, Edit, Delete) with stopPropagation */}
                      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        {/* Copy URL */}
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(link)}
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-300 hover:bg-slate-800/80 transition cursor-pointer"
                          title={language === 'bn' ? 'লিংক কপি করুন' : 'Copy URL'}
                        >
                          {copiedId === link.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditModal(e, link)}
                          className="p-1 rounded-md text-slate-400 hover:text-amber-300 hover:bg-slate-800/80 transition cursor-pointer"
                          title={language === 'bn' ? 'এডিট করুন' : 'Edit'}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingLink(link);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition cursor-pointer"
                          title={language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Right: Sleek Interactive Open Indicator Pill */}
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-600/10 group-hover:bg-indigo-600 text-indigo-300 group-hover:text-white border border-indigo-500/20 group-hover:border-indigo-400/40 text-[10px] font-bold transition-all duration-200">
                        <span>{language === 'bn' ? 'ওপেন' : 'Open'}</span>
                        <ExternalLink className="w-2.5 h-2.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* ── Toast Notification ─────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-indigo-500/40 text-slate-100 text-xs font-bold shadow-2xl animate-fade-in">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Add / Edit Link Modal ───────────────────────────────────────── */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  {editingLink ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {editingLink 
                      ? (language === 'bn' ? 'লিংক আপডেট করুন' : 'Edit Link') 
                      : (language === 'bn' ? 'নতুন প্রয়োজনীয় সেবা লিংক যোগ' : 'Add New Service Link')}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {language === 'bn' ? 'দোকানের কাজের জন্য দ্রুত ব্রাউজারে খোলার লিংক' : 'Save useful websites for quick shop operations'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveForm} className="p-6 space-y-4">
              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {language === 'bn' ? 'সেবা বা ওয়েবসাইটের নাম *' : 'Service Title *'}
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: জাতীয় পরিচয়পত্র তথ্য সংশোধন' : 'e.g. NID Information Correction'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {language === 'bn' ? 'ওয়েবসাইট URL / লিংক *' : 'Website URL *'}
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://services.nidw.gov.bd অথবা www.epassport.gov.bd"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition"
                    required
                  />
                </div>
              </div>

              {/* Category & Badge Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                  >
                    {DEFAULT_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {language === 'bn' ? c.nameBn : c.nameEn}
                      </option>
                    ))}
                    <option value="__custom__">{language === 'bn' ? '+ কাস্টম ক্যাটাগরি...' : '+ Custom Category...'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {language === 'bn' ? 'স্ট্যাটাস ব্যাজ (Badge)' : 'Status Badge'}
                  </label>
                  <select
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="FREE">FREE (সবুজ)</option>
                    <option value="VIP">VIP (গোল্ডেন)</option>
                    <option value="GOVT">GOVT (নীল)</option>
                    <option value="FAST">FAST (পার্পল)</option>
                    <option value="POPULAR">POPULAR (লাল)</option>
                    <option value="NEW">NEW (টিয়াল)</option>
                  </select>
                </div>
              </div>

              {formCategory === '__custom__' && (
                <input
                  type="text"
                  value={customCategoryInput}
                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                  placeholder={language === 'bn' ? 'কাস্টম ক্যাটাগরির নাম লিখুন...' : 'Enter custom category name...'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  autoFocus
                />
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {language === 'bn' ? 'ছোট বিবরণ / নোট (ঐচ্ছিক)' : 'Short Description (Optional)'}
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder={language === 'bn' ? 'এই সেবায় কী কাজ হয় তার বিবরণ...' : 'Details about this service...'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none transition"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {language === 'bn' ? 'ট্যাগ / সার্চ কীওয়ার্ড' : 'Tags (Comma separated)'}
                </label>
                <div className="relative">
                  <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="nid, voter, passport, correction"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Favorite Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formIsFavorite}
                  onChange={(e) => setFormIsFavorite(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  {language === 'bn' ? 'পছন্দের লিংক হিসেবে পিন করুন (Favorite)' : 'Pin to Favorite Links'}
                </span>
              </label>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
                >
                  {editingLink 
                    ? (language === 'bn' ? 'আপডেট সম্পন্ন করুন' : 'Save Changes') 
                    : (language === 'bn' ? 'লিংক সেভ করুন' : 'Add Link')}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────────────── */}
      {deletingLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {language === 'bn' ? 'লিংকটি মুছে ফেলতে চান?' : 'Delete this link?'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'bn' ? 'এটি তালিকা থেকে চিরতরে মুছে যাবে।' : 'This action will permanently remove this bookmark.'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs font-bold text-slate-200">{deletingLink.title}</p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">{deletingLink.url}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingLink(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition cursor-pointer"
              >
                {language === 'bn' ? 'হ্যাঁ, মুছে ফেলুন' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Factory Reset Confirmation Modal ──────────────────────────── */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {language === 'bn' ? 'ডিফল্ট সকল লিংক প্রিসেট রিস্টোর করতে চান?' : 'Reset to Default Links?'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'bn' ? 'সকল ৯২+ সাইবার ও স্টুডিও সেবা লিংক মূল ডিফল্ট তালিকায় রিস্টোর হবে।' : 'This will restore all default curated studio & cyber service links.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={handleResetToDefault}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30 transition cursor-pointer"
              >
                {language === 'bn' ? 'রিসেট করুন' : 'Reset Defaults'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
