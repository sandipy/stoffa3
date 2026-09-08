import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Camera,
  Upload,
  RotateCcw,
  Check,
  Search,
  ExternalLink,
  Eye,
  Sliders,
  Layers,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
  Heart,
  Tag,
  Clock,
  Zap,
} from 'lucide-react';
import { useCommerce } from '../../context/CommerceContext';
import {
  ALL_STORE_PAGES,
  PageHeroDefinition,
  loadCustomPageHeroes,
  saveCustomPageHero,
  resetCustomPageHero,
  getEffectivePageHero,
  normalizePageKey,
} from '../../data/pageHeroManager';
import { ALL_MEDIA_IMAGES, MEDIA_CATEGORIES, MediaImageItem } from '../../data/allMediaImages';
import { compressImageFile } from '../../utils/persistentStorage';

export const AdminPageEditor: React.FC<{ initialPageKey?: string }> = ({
  initialPageKey = 'just-in',
}) => {
  const { setViewMode, setSelectedCategory } = useCommerce();

  // Storage state listener
  const [customHeroes, setCustomHeroes] = useState(() => loadCustomPageHeroes());

  useEffect(() => {
    const handleUpdate = () => {
      setCustomHeroes(loadCustomPageHeroes());
    };
    window.addEventListener('stoffa_page_heroes_updated', handleUpdate);
    return () => window.removeEventListener('stoffa_page_heroes_updated', handleUpdate);
  }, []);

  // Selected page state
  const [selectedKey, setSelectedKey] = useState<string>(() => normalizePageKey(initialPageKey));

  // Sync if initialPageKey changes
  useEffect(() => {
    if (initialPageKey) {
      setSelectedKey(normalizePageKey(initialPageKey));
    }
  }, [initialPageKey]);

  // Form states for the selected page
  const currentEffective = getEffectivePageHero(selectedKey);
  const [activeTab, setActiveTab] = useState<'library' | 'presets' | 'upload' | 'url'>('library');
  const [selectedImageUrl, setSelectedImageUrl] = useState(currentEffective.imageUrl);
  const [customTitle, setCustomTitle] = useState(currentEffective.title);
  const [customSubtitle, setCustomSubtitle] = useState(currentEffective.subtitle);
  const [customBadge, setCustomBadge] = useState(currentEffective.badge);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Media Library filter & search
  const [libraryCategory, setLibraryCategory] = useState<string>('All Images');
  const [librarySearch, setLibrarySearch] = useState<string>('');
  const [pageSearch, setPageSearch] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reload form when selected page changes
  useEffect(() => {
    const eff = getEffectivePageHero(selectedKey);
    setSelectedImageUrl(eff.imageUrl);
    setCustomTitle(eff.title);
    setCustomSubtitle(eff.subtitle);
    setCustomBadge(eff.badge);
    setSaveSuccess(false);
    setUploadError(null);
  }, [selectedKey, customHeroes]);

  const currentDef =
    ALL_STORE_PAGES.find((p) => p.key === selectedKey) || currentEffective.pageDefinition;

  // Filtered media images
  const filteredImages = ALL_MEDIA_IMAGES.filter((item) => {
    if (libraryCategory !== 'All Images' && item.category !== libraryCategory) {
      return false;
    }
    if (librarySearch.trim()) {
      const q = librarySearch.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchTag = item.tags?.some((t) => t.toLowerCase().includes(q));
      const matchFilename = item.filename.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchTag && !matchFilename) return false;
    }
    return true;
  });

  // Filtered list of store pages
  const filteredPages = ALL_STORE_PAGES.filter((p) => {
    if (!pageSearch.trim()) return true;
    const q = pageSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.group.toLowerCase().includes(q) ||
      p.defaultTitle.toLowerCase().includes(q)
    );
  });

  // Save handler
  const handleSave = () => {
    saveCustomPageHero(selectedKey, {
      imageUrl: selectedImageUrl,
      customTitle: customTitle.trim(),
      customSubtitle: customSubtitle.trim(),
      customBadge: customBadge.trim(),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2600);
  };

  // Reset handler
  const handleReset = () => {
    if (
      window.confirm(
        `Reset "${currentDef.name}" back to factory default image and copy?`
      )
    ) {
      resetCustomPageHero(selectedKey);
      const def = getEffectivePageHero(selectedKey);
      setSelectedImageUrl(def.pageDefinition.defaultImageUrl);
      setCustomTitle(def.pageDefinition.defaultTitle);
      setCustomSubtitle(def.pageDefinition.defaultSubtitle);
      setCustomBadge(def.pageDefinition.defaultBadge);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  // File upload handler with compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadError(null);
      const compressedDataUrl = await compressImageFile(file, 1600, 1000, 0.85);
      setSelectedImageUrl(compressedDataUrl);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to process and compress uploaded image.');
    }
  };

  // View live storefront page
  const handleViewLive = () => {
    setViewMode('storefront');
    let categoryName = currentDef.name;
    if (selectedKey === 'just-in') categoryName = 'Just In';
    else if (selectedKey === 'ready-to-ship') categoryName = 'Ready to Ship';
    else if (selectedKey === 'sale') categoryName = 'Sale';
    else if (selectedKey === 'bags') categoryName = 'Bags';
    else if (selectedKey === 'shoes') categoryName = 'Shoes';
    else if (selectedKey === 'low-wedges') categoryName = 'Low Wedges - 2.5"';
    else if (selectedKey === 'high-wedges') categoryName = 'High Wedges - 3.5"';
    else if (selectedKey === 'higher-wedges') categoryName = 'Higher Wedge - 4.25"';
    else if (selectedKey === 'block-heels') categoryName = 'Block Heels';
    else if (selectedKey === 'flats') categoryName = 'Flats & Loafers';
    else if (selectedKey === 'date-night') categoryName = 'Date Night';
    else if (selectedKey === 'prom-night') categoryName = 'Prom Night';
    else if (selectedKey === 'home') categoryName = 'all';

    setSelectedCategory(categoryName);
    window.location.hash = `#/${selectedKey}`;
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const isCustomized = !!customHeroes[selectedKey];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner Overview */}
      <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-amber-700 font-semibold mb-1">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>PAGE CONTENT &amp; HERO BANNER CMS</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif text-stone-900 font-medium">
              Edit Page Images, Titles &amp; Subtitles
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-3xl">
              Customize the hero banners, headlines, subtitles, and badges for <strong>Just In</strong>, <strong>Ready to Ship</strong>, <strong>Sale</strong>, <strong>Bags</strong>, <strong>Shoes</strong>, and all 18+ store collection pages. Changes persist locally and reflect across the entire storefront in real time.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleViewLive}
              className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-amber-300" />
              <span>Preview Live Storefront</span>
            </button>
          </div>
        </div>

        {/* Quick Target Tabs (Just In, Ready to Ship, Sale, Bags, Shoes, Occasions) */}
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500 font-bold mb-2 flex items-center justify-between">
            <span>Select Page to Edit:</span>
            <span className="text-stone-400 normal-case font-sans">
              Currently Editing: <strong className="text-stone-800">{currentDef.name}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {/* 1. Just In */}
            <button
              onClick={() => setSelectedKey('just-in')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 cursor-pointer ${
                selectedKey === 'just-in'
                  ? 'bg-purple-900 text-white shadow-md ring-2 ring-purple-400'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>Just In</span>
              {customHeroes['just-in'] && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              )}
            </button>

            {/* 2. Ready to Ship */}
            <button
              onClick={() => setSelectedKey('ready-to-ship')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 cursor-pointer ${
                selectedKey === 'ready-to-ship'
                  ? 'bg-emerald-900 text-white shadow-md ring-2 ring-emerald-400'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-emerald-300" />
              <span>Ready to Ship</span>
              {customHeroes['ready-to-ship'] && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              )}
            </button>

            {/* 3. Sale */}
            <button
              onClick={() => setSelectedKey('sale')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 cursor-pointer ${
                selectedKey === 'sale'
                  ? 'bg-amber-900 text-white shadow-md ring-2 ring-amber-400'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-amber-300" />
              <span>Sale &amp; Archive</span>
              {customHeroes['sale'] && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              )}
            </button>

            {/* 4. Bags */}
            <button
              onClick={() => setSelectedKey('bags')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 cursor-pointer ${
                selectedKey === 'bags'
                  ? 'bg-rose-900 text-white shadow-md ring-2 ring-rose-400'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-rose-300" />
              <span>Bags &amp; Potlis</span>
              {customHeroes['bags'] && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              )}
            </button>

            {/* 5. Shoes */}
            <button
              onClick={() => setSelectedKey('shoes')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 cursor-pointer ${
                selectedKey === 'shoes'
                  ? 'bg-indigo-900 text-white shadow-md ring-2 ring-indigo-400'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-300" />
              <span>Shoes (Master)</span>
              {customHeroes['shoes'] && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              )}
            </button>

            {/* Heel Heights */}
            <button
              onClick={() => setSelectedKey('low-wedges')}
              className={`px-3 py-2 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer ${
                selectedKey === 'low-wedges'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Low Wedges 2.5"
            </button>
            <button
              onClick={() => setSelectedKey('high-wedges')}
              className={`px-3 py-2 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer ${
                selectedKey === 'high-wedges'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              High Wedges 3.5"
            </button>
            <button
              onClick={() => setSelectedKey('higher-wedges')}
              className={`px-3 py-2 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer ${
                selectedKey === 'higher-wedges'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Higher Wedge 4.25"
            </button>
            <button
              onClick={() => setSelectedKey('block-heels')}
              className={`px-3 py-2 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer ${
                selectedKey === 'block-heels'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Block Heels
            </button>
            <button
              onClick={() => setSelectedKey('flats')}
              className={`px-3 py-2 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer ${
                selectedKey === 'flats'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Flats &amp; Loafers
            </button>

            {/* Occasions */}
            <button
              onClick={() => setSelectedKey('date-night')}
              className={`px-3 py-2 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer ${
                selectedKey === 'date-night'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Date Night
            </button>
            <button
              onClick={() => setSelectedKey('prom-night')}
              className={`px-3 py-2 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer ${
                selectedKey === 'prom-night'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Prom Night
            </button>
            <button
              onClick={() => setSelectedKey('collections')}
              className={`px-3 py-2 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer ${
                selectedKey === 'collections'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Collections Directory
            </button>
            <button
              onClick={() => setSelectedKey('home')}
              className={`px-3 py-2 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer ${
                selectedKey === 'home'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Homepage Hero
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Live Banner Preview (Left) & Controls (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Live Banner Mockup & All Pages Selector (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Live Banner Mockup Card */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-stone-100">
              <span className="font-mono font-bold uppercase text-stone-500 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>Live Banner Preview</span>
              </span>
              <div className="flex items-center gap-2">
                {isCustomized ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                    Custom Content Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-mono">
                    Default Content
                  </span>
                )}
              </div>
            </div>

            {/* 16:9 Realistic Banner Preview */}
            <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-xl overflow-hidden shadow-inner bg-stone-950 border border-stone-800 group">
              <img
                src={selectedImageUrl || currentDef.defaultImageUrl}
                alt={customTitle || currentDef.defaultTitle}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top transition-transform duration-500"
              />
              {/* Gradient overlay simulating storefront banner */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

              {/* Text elements */}
              <div className="absolute inset-x-4 bottom-4 text-white z-10 space-y-1">
                {customBadge && (
                  <span className="inline-block px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] font-mono font-bold uppercase tracking-wider mb-1">
                    {customBadge}
                  </span>
                )}
                <div className="text-base sm:text-lg font-serif font-bold italic text-white drop-shadow-[0_2px_10px_rgba(0,0,0,1)] [text-shadow:_0_2px_12px_rgba(0,0,0,0.9)] line-clamp-2">
                  {customSubtitle || currentDef.defaultSubtitle}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-[0_3px_14px_rgba(0,0,0,1)] [text-shadow:_0_2px_14px_rgba(0,0,0,0.9)] leading-tight">
                  {customTitle || currentDef.defaultTitle}
                </h3>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-stone-500 hover:text-rose-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Reset this page to its factory default image & text"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Factory Default</span>
              </button>

              <button
                type="button"
                onClick={handleViewLive}
                className="text-xs text-amber-800 hover:text-amber-900 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>View on Storefront</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Quick Page Selector Card with Search */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <span className="text-xs font-mono font-bold uppercase text-stone-700 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-stone-500" />
                <span>All Store Pages ({ALL_STORE_PAGES.length})</span>
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={pageSearch}
                onChange={(e) => setPageSearch(e.target.value)}
                placeholder="Filter pages (e.g. shoes, date night)..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-stone-200 text-xs bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="max-h-[280px] overflow-y-auto divide-y divide-stone-100 space-y-1 pr-1">
              {filteredPages.map((p) => {
                const isCurrent = p.key === selectedKey;
                const isCustom = !!customHeroes[p.key];
                return (
                  <button
                    key={p.key}
                    onClick={() => setSelectedKey(p.key)}
                    className={`w-full text-left p-2 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-50 text-amber-950 font-bold border border-amber-200'
                        : 'hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-[10px] text-stone-400 font-mono">{p.group}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isCustom && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-mono">
                          Edited
                        </span>
                      )}
                      {isCurrent && <Check className="w-3.5 h-3.5 text-amber-700" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Edit Controls (Image Picker & Text Fields) (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-6">
            
            {/* Header with Save Button */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 flex-wrap gap-2">
              <div>
                <span className="text-[11px] font-mono text-amber-800 font-bold uppercase tracking-wider block">
                  EDITING: {currentDef.name}
                </span>
                <h3 className="text-lg font-serif font-bold text-stone-900">
                  Banner Image &amp; Copy Fields
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save &amp; Publish</span>
                </button>
              </div>
            </div>

            {/* Success Banner */}
            {saveSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Page content successfully updated and published! Changes are active storefront-wide.</span>
              </div>
            )}

            {/* Section 1: Image Selector Tabs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase text-stone-700 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-amber-600" />
                  <span>1. Choose Banner Image</span>
                </label>
                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveTab('library')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                      activeTab === 'library'
                        ? 'bg-white text-stone-900 shadow-xs font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Photoshoot Library (38+)
                  </button>

                  {currentDef.presets && currentDef.presets.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('presets')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                        activeTab === 'presets'
                          ? 'bg-white text-stone-900 shadow-xs font-bold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Presets ({currentDef.presets.length})
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                      activeTab === 'upload'
                        ? 'bg-white text-stone-900 shadow-xs font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Upload File
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('url')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                      activeTab === 'url'
                        ? 'bg-white text-stone-900 shadow-xs font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Custom URL
                  </button>
                </div>
              </div>

              {/* Tab Content 1: Photoshoot Library */}
              {activeTab === 'library' && (
                <div className="space-y-3 p-3.5 rounded-xl border border-stone-200 bg-stone-50/70">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                      {['All Images', ...MEDIA_CATEGORIES.slice(0, 5)].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setLibraryCategory(cat)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                            libraryCategory === cat
                              ? 'bg-stone-900 text-white'
                              : 'bg-white text-stone-600 hover:bg-stone-200 border border-stone-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-48 shrink-0">
                      <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={librarySearch}
                        onChange={(e) => setLibrarySearch(e.target.value)}
                        placeholder="Search photos..."
                        className="w-full pl-7 pr-2 py-1 rounded border border-stone-300 text-xs bg-white"
                      />
                    </div>
                  </div>

                  {/* Thumbnail Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[300px] overflow-y-auto p-1">
                    {filteredImages.map((img) => {
                      const isSelected = selectedImageUrl === img.url;
                      return (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setSelectedImageUrl(img.url)}
                          className={`group relative aspect-[16/10] rounded-lg overflow-hidden border-2 text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-amber-500 shadow-md ring-2 ring-amber-300'
                              : 'border-stone-200 hover:border-stone-400'
                          }`}
                          title={img.title}
                        >
                          <img
                            src={img.url}
                            alt={img.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shadow-md">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-[10px] text-white truncate">
                            {img.title}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab Content 2: Presets (if available) */}
              {activeTab === 'presets' && currentDef.presets && (
                <div className="space-y-2 p-3.5 rounded-xl border border-stone-200 bg-stone-50/70 max-h-[300px] overflow-y-auto">
                  <div className="text-xs text-stone-500 mb-2">
                    Curated shoot angles and lighting presets for {currentDef.name}:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentDef.presets.map((preset) => {
                      const isSelected = selectedImageUrl === preset.imageUrl;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => setSelectedImageUrl(preset.imageUrl)}
                          className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer flex gap-3 ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/60'
                              : 'border-stone-200 bg-white hover:border-stone-400'
                          }`}
                        >
                          <img
                            src={preset.imageUrl}
                            alt={preset.name}
                            referrerPolicy="no-referrer"
                            className="w-20 h-14 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-xs text-stone-900 truncate">
                              {preset.name}
                            </div>
                            <p className="text-[10px] text-stone-500 line-clamp-2 mt-0.5">
                              {preset.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab Content 3: File Upload */}
              {activeTab === 'upload' && (
                <div className="p-4 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50/70 text-center space-y-3">
                  <div className="mx-auto w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-700">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-stone-800">
                      Upload Custom Banner Image from Computer
                    </h5>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Automatically compressed &amp; stored locally (JPG, PNG, WebP up to 10MB).
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    Select File...
                  </button>
                  {uploadError && (
                    <div className="text-xs text-rose-600 font-mono mt-2">{uploadError}</div>
                  )}
                </div>
              )}

              {/* Tab Content 4: Custom URL */}
              {activeTab === 'url' && (
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-2">
                  <label className="text-xs font-medium text-stone-700">Image Web URL (HTTPS):</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={selectedImageUrl}
                      onChange={(e) => setSelectedImageUrl(e.target.value)}
                      placeholder="https://example.com/images/hero.jpg"
                      className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Text Copy Fields */}
            <div className="space-y-4 pt-4 border-t border-stone-100">
              <label className="text-xs font-mono font-bold uppercase text-stone-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>2. Customize Text &amp; Editorial Copy</span>
              </label>

              {/* Page Title */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-stone-800">Headline Title:</label>
                  <span className="text-[10px] text-stone-400 font-mono">
                    Default: {currentDef.defaultTitle}
                  </span>
                </div>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Just In, Ready to Ship, Archive Sale..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-medium bg-white focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Page Subtitle */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-stone-800">Subtitle / Editorial Headline:</label>
                  <span className="text-[10px] text-stone-400 font-mono">
                    Default: {currentDef.defaultSubtitle}
                  </span>
                </div>
                <textarea
                  value={customSubtitle}
                  onChange={(e) => setCustomSubtitle(e.target.value)}
                  rows={2}
                  placeholder="e.g. The Spring-Summer Edit — Handcrafted Architectural Wedges..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs bg-white focus:ring-1 focus:ring-amber-500 leading-relaxed"
                />
              </div>

              {/* Badge Tag */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-stone-800">Category Tag / Badge:</label>
                  <span className="text-[10px] text-stone-400 font-mono">
                    Default: {currentDef.defaultBadge}
                  </span>
                </div>
                <input
                  type="text"
                  value={customBadge}
                  onChange={(e) => setCustomBadge(e.target.value)}
                  placeholder="e.g. NEW ARRIVALS, EXPRESS DISPATCH, EXCLUSIVE ARCHIVE..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono uppercase bg-white focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Bottom Save & Preview Bar */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-between flex-wrap gap-3">
              <div className="text-[11px] text-stone-500">
                Changes persist in browser local storage and update storefront pages instantly.
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save &amp; Apply Changes</span>
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
