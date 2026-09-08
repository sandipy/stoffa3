import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRight,
  Camera,
  Edit3,
  Save,
  RotateCcw,
  Check,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Sparkles,
  Lock,
  Unlock,
  Cloud,
} from 'lucide-react';
import {
  CuratedCollectionItem,
  loadCuratedCollections,
  saveCuratedCollections,
  resetCuratedCollections,
  CURATED_COLLECTIONS_DATA,
} from '../data/collectionsData';
import { useCommerce } from '../context/CommerceContext';
import { useCms } from '../context/CmsContext';
import {
  getEffectivePageHero,
  saveCustomPageHero,
  resetCustomPageHero,
} from '../data/pageHeroManager';
import { CollectionImagePickerModal } from './admin/CollectionImagePickerModal';
import { CloudBackupModal } from './admin/CloudBackupModal';
import { loadSavedHeroPairings } from '../data/heroPairingsData';
import { navigateTo } from '../utils/navigationRouter';
import { splitProductNameTwoLines, renderWithAmpersandNextLine } from '../utils/textSplitter';
import { guessIsLightBackground } from '../utils/imageLuminance';

interface CollectionsDirectoryViewProps {
  onSelectCollection: (title: string) => void;
}

export const CollectionsDirectoryView: React.FC<CollectionsDirectoryViewProps> = ({
  onSelectCollection,
}) => {
  const {
    isAdminLoggedIn,
    openPageHeroManager,
    t,
    setIsAdminLoginModalOpen,
    products,
    setSelectedProductModal,
  } = useCommerce();
  const { isCmsInPlaceMode, setIsCmsInPlaceMode } = useCms();

  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [collections, setCollections] = useState<CuratedCollectionItem[]>(() =>
    loadCuratedCollections()
  );
  const [isCmsEditActive, setIsCmsEditActive] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<{ message: string; type: 'success' | 'info' } | null>(
    null
  );

  // Per-card dirty tracking
  const [dirtyCardIds, setDirtyCardIds] = useState<Set<string>>(new Set());

  // Image Picker Modal State
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imagePickerTarget, setImagePickerTarget] = useState<
    { type: 'card'; id: string; title: string; currentUrl: string } | { type: 'hero'; currentUrl: string } | null
  >(null);
  const [cloudBackupOpen, setCloudBackupOpen] = useState(false);

  // Hero custom text editing state
  const effectiveHero = getEffectivePageHero('collections');
  const isLightBg = guessIsLightBackground(effectiveHero.imageUrl);
  const [heroBadge, setHeroBadge] = useState(effectiveHero.badge || 'CURATED OCCASION EDITS');
  const [heroSubtitle, setHeroSubtitle] = useState(
    effectiveHero.subtitle || 'Curated by Occasion & Venue'
  );
  const [heroTitle, setHeroTitle] = useState(effectiveHero.title || 'Find Your Pair');
  const [isHeroDirty, setIsHeroDirty] = useState(false);

  // Sync CMS mode with global state
  useEffect(() => {
    if (isAdminLoggedIn && isCmsInPlaceMode) {
      setIsCmsEditActive(true);
    }
  }, [isAdminLoggedIn, isCmsInPlaceMode]);

  // Listen for storage events across tabs or components
  useEffect(() => {
    const handleCollectionsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<CuratedCollectionItem[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setCollections(customEvent.detail);
        setIsDirty(false);
        setDirtyCardIds(new Set());
      } else {
        setCollections(loadCuratedCollections());
      }
    };

    const handleHeroUpdated = () => {
      const freshHero = getEffectivePageHero('collections');
      setHeroBadge(freshHero.badge || 'CURATED OCCASION EDITS');
      setHeroSubtitle(freshHero.subtitle || 'Curated by Occasion & Venue');
      setHeroTitle(freshHero.title || 'Find Your Pair');
      setIsHeroDirty(false);
    };

    window.addEventListener('stoffa_curated_collections_updated', handleCollectionsUpdated);
    window.addEventListener('stoffa_page_heroes_updated', handleHeroUpdated);

    return () => {
      window.removeEventListener('stoffa_curated_collections_updated', handleCollectionsUpdated);
      window.removeEventListener('stoffa_page_heroes_updated', handleHeroUpdated);
    };
  }, []);

  const triggerToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setSaveToast({ message: msg, type });
    setTimeout(() => {
      setSaveToast(null);
    }, 3200);
  };

  // =========================================================================
  // CARD EDITING HANDLERS
  // =========================================================================

  const handleUpdateCardField = (
    id: string,
    field: keyof CuratedCollectionItem,
    value: string
  ) => {
    setCollections((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
    setIsDirty(true);
    setDirtyCardIds((prev) => new Set(prev).add(id));
  };

  const handleOpenImagePickerForCard = (col: CuratedCollectionItem) => {
    setImagePickerTarget({
      type: 'card',
      id: col.id,
      title: col.title,
      currentUrl: col.image,
    });
    setImagePickerOpen(true);
  };

  const handleOpenImagePickerForHero = () => {
    setImagePickerTarget({
      type: 'hero',
      currentUrl: effectiveHero.imageUrl,
    });
    setImagePickerOpen(true);
  };

  const handleImagePickerSelect = (newUrl: string) => {
    if (!imagePickerTarget) return;

    if (imagePickerTarget.type === 'card') {
      const cardId = imagePickerTarget.id;
      // Immediately update state and persist to storage so refresh never loses the image!
      setCollections((prev) => {
        const updated = prev.map((item) =>
          item.id === cardId ? { ...item, image: newUrl } : item
        );
        saveCuratedCollections(updated);
        return updated;
      });
      setDirtyCardIds((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
      setIsDirty(false);
      triggerToast(`Image updated and saved for "${imagePickerTarget.title}"!`);
    } else if (imagePickerTarget.type === 'hero') {
      saveCustomPageHero('collections', { imageUrl: newUrl });
      triggerToast('Collections hero banner image updated successfully!');
    }

    setImagePickerOpen(false);
    setImagePickerTarget(null);
  };

  const handleSaveSingleCard = (col: CuratedCollectionItem) => {
    // Save state guaranteed with functional updater including any latest field changes
    setCollections((prev) => {
      const updated = prev.map((item) => (item.id === col.id ? { ...item, ...col } : item));
      saveCuratedCollections(updated);
      return updated;
    });
    setDirtyCardIds((prev) => {
      const next = new Set(prev);
      next.delete(col.id);
      return next;
    });
    setIsDirty(false);
    triggerToast(`Collection "${col.title}" saved successfully!`);
  };

  const handleMoveCard = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= collections.length) return;

    const next = [...collections];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;

    setCollections(next);
    setIsDirty(true);
    triggerToast(`Reordered "${temp.title}". Remember to Save All.`);
  };

  const handleDeleteCard = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to remove the collection "${title}"?`)) {
      const next = collections.filter((c) => c.id !== id);
      setCollections(next);
      saveCuratedCollections(next);
      triggerToast(`Removed collection "${title}".`);
    }
  };

  const handleAddNewCollection = () => {
    const newId = `custom-collection-${Date.now()}`;
    const newTheme: CuratedCollectionItem['theme'] =
      selectedTheme !== 'all' ? (selectedTheme as any) : 'Wedding & Ceremonies';

    const newItem: CuratedCollectionItem = {
      id: newId,
      title: 'New Curated Edit',
      tagline: 'Handcrafted luxury footwear and styling designed for unforgettable moments.',
      theme: newTheme,
      shoeNote: 'Higher Wedges (3.5" - 4.25") & Crystals',
      image: '/hero_images/24_Higher_Wedge_Couture.jpg',
    };

    const next = [newItem, ...collections];
    setCollections(next);
    setIsDirty(true);
    setDirtyCardIds((prev) => new Set(prev).add(newId));
    triggerToast('Added new collection card. Edit text and image below, then save.');
  };

  const handleSaveAll = () => {
    setCollections((prev) => {
      saveCuratedCollections(prev);
      return prev;
    });
    setIsDirty(false);
    setDirtyCardIds(new Set());
    triggerToast('All curated collections saved successfully!');
  };

  const handleDiscardAll = () => {
    setCollections(loadCuratedCollections());
    setIsDirty(false);
    setDirtyCardIds(new Set());
    triggerToast('Discarded unsaved modifications.', 'info');
  };

  const handleResetToDefaults = () => {
    if (
      window.confirm(
        'Reset all curated collections back to factory defaults? This will overwrite your custom changes.'
      )
    ) {
      const defaults = resetCuratedCollections();
      setCollections(defaults);
      setIsDirty(false);
      setDirtyCardIds(new Set());
      triggerToast('Reset all collections to factory defaults.');
    }
  };

  // Hero save handler
  const handleSaveHeroBanner = () => {
    saveCustomPageHero('collections', {
      customBadge: heroBadge.trim(),
      customSubtitle: heroSubtitle.trim(),
      customTitle: heroTitle.trim(),
    });
    setIsHeroDirty(false);
    triggerToast('Collections hero banner typography saved successfully!');
  };

  const handleResetHeroBanner = () => {
    if (window.confirm('Reset hero banner artwork and typography back to default?')) {
      resetCustomPageHero('collections');
      const freshHero = getEffectivePageHero('collections');
      setHeroBadge(freshHero.badge || 'CURATED OCCASION EDITS');
      setHeroSubtitle(freshHero.subtitle || 'Curated by Occasion & Venue');
      setHeroTitle(freshHero.title || 'Find Your Pair');
      setIsHeroDirty(false);
      triggerToast('Hero banner reset to default.');
    }
  };

  // Themes list
  const themes = [
    { id: 'all', label: t('All Collections', 'All Collections') },
    { id: 'Wedding & Ceremonies', label: t('Wedding & Bridal', 'Wedding & Bridal') },
    { id: 'Galas & Celebrations', label: t('Galas & Celebrations', 'Galas & Celebrations') },
    { id: 'Resort & Evenings', label: t('Resort & Evenings', 'Resort & Evenings') },
  ];

  const filteredCollections =
    selectedTheme === 'all'
      ? collections
      : collections.filter((c) => c.theme === selectedTheme);

  // Resolve paired shoe for the current collections hero image
  const pairedInfo = useMemo(() => {
    const pairings = loadSavedHeroPairings();
    const match = pairings.find((p) => {
      const fn = p.cleanFilename || p.rawFilename || p.imageFilename || '';
      const urlLast = effectiveHero.imageUrl?.split('/').pop() || '';
      return (
        fn &&
        effectiveHero.imageUrl &&
        (effectiveHero.imageUrl.includes(fn) || fn.includes(urlLast) || p.imageSrc === effectiveHero.imageUrl)
      );
    });
    const shoeName = match?.suggestedShoes || match?.pairedShoes;
    const shoeImgUrl = match?.shoesUrl || match?.pairedShoesUrl;
    if (match && shoeName) {
      const found = products.find(
        (p) =>
          p.title.toLowerCase().includes(shoeName.toLowerCase()) ||
          shoeName.toLowerCase().includes(p.title.toLowerCase())
      );
      if (found) {
        return {
          title: found.title,
          image: found.images[0] || shoeImgUrl,
          product: found,
        };
      }
      return {
        title: shoeName,
        image: shoeImgUrl,
        product: null,
      };
    }
    // Fallback: highlight premier footwear product from catalog
    const premierShoe = products.find(
      (p) =>
        p.images &&
        p.images.length > 0 &&
        (p.category === 'Shoes' ||
          p.category?.toLowerCase().includes('wedge') ||
          p.category?.toLowerCase().includes('heel') ||
          p.category?.toLowerCase().includes('flat'))
    );
    if (premierShoe) {
      return {
        title: premierShoe.title,
        image: premierShoe.images[0],
        product: premierShoe,
      };
    }
    return null;
  }, [effectiveHero.imageUrl, products]);

  const handleOpenPairedShoe = (info: { title: string; product: any }) => {
    if (info.product) {
      setSelectedProductModal(info.product);
      navigateTo(`product/${info.product.id}`);
    } else {
      const match = products.find(
        (p) =>
          p.title.toLowerCase().includes(info.title.toLowerCase()) ||
          info.title.toLowerCase().includes(p.title.toLowerCase())
      );
      if (match) {
        setSelectedProductModal(match);
        navigateTo(`product/${match.id}`);
      } else {
        navigateTo('shoes');
      }
    }
  };

  return (
    <section id="collections-directory" className="w-full bg-[#faf9f6] py-6 sm:py-10">
      {/* Toast Notification */}
      {saveToast && (
        <div
          id="collections-cms-toast"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-stone-900/95 text-white border border-amber-400/40 shadow-2xl backdrop-blur-md animate-bounce text-xs font-semibold"
        >
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{saveToast.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ================================================================= */}
        {/* MASTER CMS TOOLBAR FOR COLLECTIONS DIRECTORY                     */}
        {/* ================================================================= */}
        <div className="mb-6 p-3 sm:p-4 rounded-2xl bg-stone-900 border border-stone-800 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-sm sm:text-base font-bold text-white tracking-wide">
                  Collections Directory CMS
                </span>
                <span className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 text-[10px] font-mono">
                  {collections.length} Curated Cards
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Directly edit images, headlines, shoe notes, and taglines for every curated collection.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {!isAdminLoggedIn ? (
              <button
                type="button"
                onClick={() => setIsAdminLoginModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Admin Login to Edit</span>
              </button>
            ) : (
              <>
                {/* CMS Edit Mode Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !isCmsEditActive;
                    setIsCmsEditActive(next);
                    setIsCmsInPlaceMode(next);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isCmsEditActive
                      ? 'bg-amber-400 text-stone-950 border-amber-500 shadow-md scale-105'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border-stone-700'
                  }`}
                >
                  {isCmsEditActive ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>{isCmsEditActive ? 'In-Place CMS: ACTIVE' : 'Enable In-Place CMS'}</span>
                </button>

                {/* Status Indicator */}
                {isDirty ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold">
                    {dirtyCardIds.size} Draft Edits Pending
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-semibold">
                    <Check className="w-3 h-3 text-emerald-400" />
                    All Saved
                  </span>
                )}

                {/* Add Collection Card */}
                {isCmsEditActive && (
                  <button
                    type="button"
                    onClick={handleAddNewCollection}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold border border-stone-700 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Add Collection</span>
                  </button>
                )}

                {/* Discard Changes */}
                {isDirty && (
                  <button
                    type="button"
                    onClick={handleDiscardAll}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold cursor-pointer border border-stone-700"
                    title="Discard pending changes"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Discard</span>
                  </button>
                )}

                {/* Master Save Button */}
                <button
                  type="button"
                  onClick={handleSaveAll}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
                    isDirty
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>SAVE ALL COLLECTIONS</span>
                </button>

                {/* Reset to Defaults */}
                {isCmsEditActive && (
                  <button
                    type="button"
                    onClick={handleResetToDefaults}
                    className="px-2.5 py-1.5 rounded-xl text-[11px] text-stone-400 hover:text-rose-400 hover:bg-stone-800/80 transition-all cursor-pointer"
                    title="Reset all collections back to factory defaults"
                  >
                    Reset Defaults
                  </button>
                )}

                {/* Cloud Sync & Safety Backups */}
                {isCmsEditActive && (
                  <button
                    type="button"
                    onClick={() => setCloudBackupOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-600/50 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    title="Open Cloud Database Sync, Safety Snapshots & GitHub Export"
                  >
                    <Cloud className="w-3.5 h-3.5 text-amber-300" />
                    <span>Cloud & Snapshots</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* DEDICATED COLLECTIONS EDITORIAL HERO BANNER                       */}
        {/* ================================================================= */}
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] lg:aspect-[16/9] max-h-[calc(100vh-120px)] min-h-[380px] sm:min-h-[440px] md:min-h-[500px] overflow-hidden rounded-2xl border border-stone-200/90 shadow-xl group bg-stone-900 mb-10 sm:mb-14">
          <img
            src={effectiveHero.imageUrl}
            alt={effectiveHero.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-[center_60%] transition-all duration-700 ease-out"
          />

          {/* Hero Admin Controls (moved to top-left to avoid colliding with right panel) */}
          {isAdminLoggedIn && (
            <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenImagePickerForHero}
                className="px-3.5 py-1.5 rounded-full bg-black/80 hover:bg-black text-white text-xs font-bold border border-amber-400/40 backdrop-blur-md shadow-xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer group/btn"
                title="Change Collections Hero Image"
              >
                <Camera className="w-3.5 h-3.5 text-amber-300 group-hover/btn:rotate-12 transition-transform" />
                <span>Change Hero Image</span>
              </button>

              {isHeroDirty && (
                <button
                  type="button"
                  onClick={handleSaveHeroBanner}
                  className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold border border-emerald-400 backdrop-blur-md shadow-xl flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Hero Text</span>
                </button>
              )}
            </div>
          )}

          {/* 
            RIGHT PANEL HERO EDITORIAL TEXT & FOOTWEAR SHOWCASE:
            - Positioned at right side: sizing top to bottom (1/5 width of hero)
            - Very transparent, hardly visible container so image behind is clearly visible
            - 1 single integrated container, no nested boxes
            - Top line: subtitle in font-normal italic (unbolded), wrapping naturally
            - Title: bold tracking-tight, wrapping naturally
            - Bottom: "Model is wearing..." button with shoe image on a new line, sized to fit
          */}
          <div
            className={`absolute top-3 sm:top-4 md:top-5 right-3 sm:right-4 md:right-5 bottom-4 sm:bottom-6 md:bottom-8 z-20 flex flex-col justify-between items-end text-right w-[75vw] sm:w-1/5 min-w-0 max-w-[260px] sm:max-w-none p-3 sm:p-3.5 md:p-4 lg:p-5 rounded-2xl sm:rounded-3xl transition-all duration-300 pointer-events-auto ${
              isLightBg
                ? 'bg-white/25 hover:bg-white/35 border border-black/10 shadow-sm backdrop-blur-[2px]'
                : 'bg-black/25 hover:bg-black/35 border border-white/20 shadow-sm backdrop-blur-[2px]'
            }`}
          >
            {isCmsEditActive ? (
              <div className="w-full space-y-2 p-2.5 sm:p-3 rounded-xl bg-black/75 backdrop-blur-md border border-amber-400/40 shadow-2xl text-left overflow-y-auto max-h-full">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-amber-300 font-bold uppercase">
                    In-Page Hero Text Editor
                  </span>
                  <div className="flex items-center gap-2">
                    {isHeroDirty && (
                      <button
                        type="button"
                        onClick={handleSaveHeroBanner}
                        className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Save className="w-3 h-3" />
                        <span>Save</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleResetHeroBanner}
                      className="text-[10px] text-stone-400 hover:text-stone-200 underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Badge input */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-amber-200/80 mb-0.5">
                    Hero Badge
                  </label>
                  <input
                    type="text"
                    value={heroBadge}
                    onChange={(e) => {
                      setHeroBadge(e.target.value);
                      setIsHeroDirty(true);
                    }}
                    className="w-full bg-stone-900/90 border border-stone-700 focus:border-amber-400 rounded-lg px-2 py-1 text-xs text-amber-200 font-mono focus:outline-hidden"
                  />
                </div>

                {/* Subtitle input */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-amber-200/80 mb-0.5">
                    Hero Subtitle
                  </label>
                  <input
                    type="text"
                    value={heroSubtitle}
                    onChange={(e) => {
                      setHeroSubtitle(e.target.value);
                      setIsHeroDirty(true);
                    }}
                    className="w-full bg-stone-900/90 border border-stone-700 focus:border-amber-400 rounded-lg px-2 py-1 text-xs text-amber-100 italic focus:outline-hidden"
                  />
                </div>

                {/* Title input */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-amber-200/80 mb-0.5">
                    Hero Title
                  </label>
                  <input
                    type="text"
                    value={heroTitle}
                    onChange={(e) => {
                      setHeroTitle(e.target.value);
                      setIsHeroDirty(true);
                    }}
                    className="w-full bg-stone-900/90 border border-stone-700 focus:border-amber-400 rounded-lg px-2 py-1 text-sm font-bold text-white focus:outline-hidden"
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Top Section: Badge, Subtitle (unbolded italic), and Title wrapped within 1/5 box */}
                <div className="w-full flex flex-col items-end text-right">
                  {effectiveHero.badge && (
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30 text-[10px] font-mono font-bold uppercase tracking-wider mb-2 backdrop-blur-xs">
                      {t(heroBadge, heroBadge)}
                    </span>
                  )}

                  {/* 1st Line: Subtitle - Italic Serif unbolded with high-contrast shadow, wrapping naturally */}
                  <div
                    style={{ color: isLightBg ? '#09090b' : '#ffffff' }}
                    className={`text-sm sm:text-base md:text-lg lg:text-xl font-serif font-normal italic mb-1 sm:mb-1.5 text-right tracking-normal break-words [word-break:break-word] whitespace-normal leading-snug transition-colors duration-300 ${
                      isLightBg
                        ? 'text-stone-950 !text-stone-950 drop-shadow-[0_2px_10px_rgba(255,255,255,1)] [text-shadow:_0_2px_14px_rgb(255_255_255_/_100%),_0_1px_4px_rgb(255_255_255_/_90%)]'
                        : 'text-white !text-white drop-shadow-[0_3px_16px_rgba(0,0,0,1)] [text-shadow:_0_2px_16px_rgb(0_0_0_/_100%),_0_1px_6px_rgb(0_0_0_/_95%),_0_0_3px_rgb(0_0_0_/_90%)]'
                    }`}
                  >
                    <span>{renderWithAmpersandNextLine(t(heroSubtitle, heroSubtitle))}</span>
                  </div>

                  {/* Title: Bold tracking-tight, wrapping naturally, made bigger */}
                  <h2
                    style={{ color: isLightBg ? '#000000' : '#ffffff' }}
                    className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-right break-words [word-break:break-word] whitespace-normal leading-tight transition-colors duration-300 ${
                      isLightBg
                        ? 'text-black !text-black drop-shadow-[0_2px_10px_rgba(255,255,255,1)] [text-shadow:_0_2px_14px_rgb(255_255_255_/_100%),_0_1px_4px_rgb(255_255_255_/_90%)]'
                        : 'text-white !text-white drop-shadow-[0_4px_18px_rgba(0,0,0,1)] [text-shadow:_0_3px_18px_rgb(0_0_0_/_100%),_0_1px_6px_rgb(0_0_0_/_95%)]'
                    }`}
                  >
                    {renderWithAmpersandNextLine(t(heroTitle, heroTitle))}
                  </h2>
                </div>

                {/* Bottom Section: Model is wearing footwear integrated seamlessly into the right panel */}
                {pairedInfo && (
                  <div className="mt-auto pt-2.5 sm:pt-3.5 w-full flex flex-col items-end">
                    <button
                      id="collections-hero-paired-shoe-btn"
                      onClick={() => handleOpenPairedShoe(pairedInfo)}
                      className="w-full flex flex-col items-end text-right transition-all cursor-pointer group p-0 bg-transparent border-0 shadow-none focus:outline-none"
                      title={`View footwear: ${pairedInfo.title}`}
                    >
                      <span
                        className={`font-bold uppercase tracking-wider text-xs sm:text-sm leading-tight transition-colors duration-300 break-words whitespace-normal text-right ${
                          isLightBg
                            ? 'text-amber-900 drop-shadow-[0_1px_3px_rgba(255,255,255,0.9)]'
                            : 'text-amber-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]'
                        }`}
                      >
                        {t('Model is wearing...', 'Model is wearing...')}
                      </span>
                      {(() => {
                        const { line1, line2 } = splitProductNameTwoLines(t(pairedInfo.title, pairedInfo.title));
                        return (
                          <span
                            className={`font-bold text-sm sm:text-base md:text-lg leading-tight mt-1 group-hover:underline transition-colors duration-300 text-right w-full block break-words [word-break:break-word] whitespace-normal ${
                              isLightBg
                                ? 'text-stone-950 drop-shadow-[0_1px_4px_rgba(255,255,255,1)]'
                                : 'text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]'
                            }`}
                          >
                            <span className="block break-words [word-break:break-word] whitespace-normal max-w-full leading-tight">{line1}</span>
                            <span className="block break-words [word-break:break-word] whitespace-normal max-w-full leading-tight">{line2 || '\u00A0'}</span>
                          </span>
                        );
                      })()}
                      {pairedInfo.image && (
                        <div className="mt-2 sm:mt-2.5 w-full flex justify-end">
                          <img
                            src={pairedInfo.image}
                            alt={pairedInfo.title}
                            referrerPolicy="no-referrer"
                            className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 max-w-full aspect-square rounded-xl sm:rounded-2xl object-cover shadow-lg transition-transform duration-300 group-hover:scale-105 ${
                              isLightBg ? 'bg-stone-50 border border-stone-300/80' : 'bg-white/95 border border-white/40'
                            }`}
                          />
                        </div>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Quick Theme Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-stone-200 pb-6 mb-8 sm:mb-12">
          <div className="text-sm font-bold uppercase tracking-wider text-stone-900">
            <span>{t('Filter by Occasion Theme', 'Filter by Occasion Theme')}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {themes.map((th) => (
              <button
                key={th.id}
                id={`theme-tab-${th.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => setSelectedTheme(th.id)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all cursor-pointer ${
                  selectedTheme === th.id
                    ? 'btn-champagne-pill-active shadow-md'
                    : 'btn-champagne-pill'
                }`}
              >
                {th.label}
              </button>
            ))}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3 COLUMNS GRID OF ALL COLLECTIONS (WITH IN-PLACE CMS EDITING)    */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredCollections.map((col: CuratedCollectionItem, index: number) => {
            const isCardDirty = dirtyCardIds.has(col.id);

            return (
              <div
                key={col.id}
                id={`collection-card-${col.id}`}
                onClick={(e) => {
                  // If in CMS mode and user clicked an input/button, don't navigate
                  if (isCmsEditActive) return;
                  onSelectCollection(col.title);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`group relative h-[480px] sm:h-[520px] lg:h-[540px] w-full rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 border flex flex-col justify-between ${
                  isCmsEditActive
                    ? isCardDirty
                      ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)] ring-2 ring-amber-400/50'
                      : 'border-stone-700/80 hover:border-amber-400/60'
                    : 'border-stone-800/30 cursor-pointer'
                }`}
              >
                {/* Background Image with gentle zoom on hover - exact same height & width across all 15 cards */}
                <img
                  src={col.image}
                  alt={col.title}
                  className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />

                {/* Subtle ambient lighting vignette for legibility while keeping photo luminous and transparent */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent pointer-events-none transition-opacity duration-300 group-hover:opacity-95" />

                {/* ========================================================= */}
                {/* TOP CMS ACTION BAR FOR THIS SPECIFIC CARD                 */}
                {/* ========================================================= */}
                {isCmsEditActive ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="relative z-20 m-3 p-2 rounded-xl bg-stone-950/85 backdrop-blur-md border border-stone-700/90 shadow-xl flex items-center justify-between gap-1.5"
                  >
                    {/* Left: Change Image & Reorder */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenImagePickerForCard(col)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                        title="Change collection photo"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Change Image</span>
                      </button>

                      {/* Move Left / Right in grid */}
                      <button
                        type="button"
                        onClick={() => handleMoveCard(index, 'left')}
                        disabled={index === 0}
                        className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        title="Move Up/Left"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCard(index, 'right')}
                        disabled={index === collections.length - 1}
                        className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        title="Move Down/Right"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Right: Save Card & Delete Card */}
                    <div className="flex items-center gap-1.5">
                      {isCardDirty ? (
                        <button
                          type="button"
                          onClick={() => handleSaveSingleCard(col)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all cursor-pointer animate-pulse"
                          title="Save this card changes"
                        >
                          <Save className="w-3 h-3" />
                          <span>Save Card</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                          <Check className="w-2.5 h-2.5" />
                          Saved
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteCard(col.id, col.title)}
                        className="p-1 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Remove collection card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div />
                )}

                {/* ========================================================= */}
                {/* BOTTOM TEXT OVERLAY: 1/3 HEIGHT OF BOX, LESS TRANSPARENT, BIGGER TEXT */}
                {/* ========================================================= */}
                <div
                  onClick={(e) => {
                    if (isCmsEditActive) e.stopPropagation();
                  }}
                  className={`relative z-10 m-2.5 sm:m-3 rounded-xl border transition-all duration-300 shadow-md ${
                    isCmsEditActive
                      ? 'h-auto max-h-[90%] overflow-y-auto bg-stone-950/90 backdrop-blur-md border-amber-400/40 p-3 sm:p-4 space-y-2.5'
                      : 'min-h-[35%] max-h-[55%] overflow-y-auto bg-black/40 hover:bg-black/55 backdrop-blur-[3px] border-white/25 hover:border-white/40 p-3 sm:p-4 flex flex-col justify-between gap-1.5'
                  }`}
                >
                  {isCmsEditActive ? (
                    /* IN-PLACE EDITABLE INPUTS */
                    <div className="space-y-2.5 text-left">
                      {/* Theme Selector & Shoe Note */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[10px] font-mono uppercase text-stone-400">
                            Occasion Theme
                          </label>
                          <select
                            value={col.theme}
                            onChange={(e) =>
                              handleUpdateCardField(
                                col.id,
                                'theme',
                                e.target.value as CuratedCollectionItem['theme']
                              )
                            }
                            className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-0.5 text-[11px] font-mono text-amber-300 focus:outline-hidden focus:border-amber-400"
                          >
                            <option value="Wedding & Ceremonies">Wedding & Ceremonies</option>
                            <option value="Galas & Celebrations">Galas & Celebrations</option>
                            <option value="Resort & Evenings">Resort & Evenings</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-mono uppercase text-amber-400/90 block mb-0.5">
                            Shoe Note / Style Tag
                          </label>
                          <input
                            type="text"
                            value={col.shoeNote}
                            onChange={(e) =>
                              handleUpdateCardField(col.id, 'shoeNote', e.target.value)
                            }
                            placeholder='e.g. Higher Wedges (3.5" - 4.25") & Bridal Crystals'
                            className="w-full bg-stone-900/90 border border-stone-700 focus:border-amber-400 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-300 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Collection Image Preview & Direct Control */}
                      <div className="p-2 bg-stone-900/90 rounded-lg border border-stone-800 flex items-center gap-3">
                        <img
                          src={col.image}
                          alt={col.title}
                          referrerPolicy="no-referrer"
                          className="w-12 h-14 object-cover rounded-md border border-amber-400/40 shrink-0 bg-stone-950"
                        />
                        <div className="flex-1 min-w-0">
                          <label className="text-[10px] font-mono uppercase text-stone-400 block mb-1">
                            Collection Photo
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenImagePickerForCard(col)}
                              className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                              title="Choose or upload photo"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Change Photo</span>
                            </button>
                            <input
                              type="text"
                              value={col.image}
                              onChange={(e) => handleUpdateCardField(col.id, 'image', e.target.value)}
                              placeholder="Image URL or path..."
                              className="flex-1 min-w-0 bg-stone-950 border border-stone-700 focus:border-amber-400 rounded px-2 py-1 text-[11px] font-mono text-stone-300 focus:outline-hidden truncate"
                              title={col.image}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Collection Title */}
                      <div>
                        <label className="text-[10px] font-mono uppercase text-stone-300 block mb-0.5">
                          Collection Title
                        </label>
                        <input
                          type="text"
                          value={col.title}
                          onChange={(e) => handleUpdateCardField(col.id, 'title', e.target.value)}
                          placeholder="e.g. Bride on Her Feet"
                          className="w-full bg-stone-900/90 border border-stone-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 font-serif text-lg font-bold text-white focus:outline-hidden"
                        />
                      </div>

                      {/* Tagline / Description */}
                      <div>
                        <label className="text-[10px] font-mono uppercase text-stone-400 block mb-0.5">
                          Tagline & Story
                        </label>
                        <textarea
                          rows={2}
                          value={col.tagline}
                          onChange={(e) => handleUpdateCardField(col.id, 'tagline', e.target.value)}
                          placeholder="Short description of occasion and styling..."
                          className="w-full bg-stone-900/90 border border-stone-700 focus:border-amber-400 rounded-lg px-2.5 py-1 text-xs text-stone-200 focus:outline-hidden resize-none"
                        />
                      </div>

                      {/* Card Save & Navigate Test */}
                      <div className="pt-1 flex items-center justify-between gap-2 border-t border-stone-800">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectCollection(col.title);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="text-[11px] text-stone-400 hover:text-white underline cursor-pointer"
                        >
                          Preview Collection Page &rarr;
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSaveSingleCard(col)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isCardDirty
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                              : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                          }`}
                        >
                          <Save className="w-3 h-3" />
                          <span>{isCardDirty ? 'Save Card' : 'Saved'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* NORMAL LUXURY DISPLAY VIEW: 1/3 HEIGHT COMPACT, LESS TRANSPARENT, ALWAYS WRAPPING */
                    <div className="flex flex-col justify-between h-full w-full gap-1.5">
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <span className="text-xs sm:text-sm font-black uppercase tracking-[0.16em] text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] break-words [word-break:break-word] whitespace-normal leading-tight">
                          {renderWithAmpersandNextLine(t(col.shoeNote, col.shoeNote))}
                        </span>
                        <ArrowRight className="w-4 h-4 text-amber-300 opacity-90 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 shrink-0 mt-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]" />
                      </div>

                      {/* Collection Title & Tagline with bigger text, always wrapping to next line */}
                      <div className="my-auto py-0.5">
                        <h2 className="font-serif text-xl sm:text-2xl lg:text-[26px] font-bold text-white tracking-tight leading-tight break-words [word-break:break-word] whitespace-normal drop-shadow-[0_2px_6px_rgba(0,0,0,1)]">
                          {renderWithAmpersandNextLine(t(col.title, col.title))}
                        </h2>
                        <p className="text-xs sm:text-sm md:text-[15px] text-stone-100 font-medium leading-snug break-words [word-break:break-word] whitespace-normal mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                          {renderWithAmpersandNextLine(t(col.tagline, col.tagline))}
                        </p>
                      </div>

                      {/* explore.... link replacing Explore Edit - bigger text, wrapping naturally */}
                      <div className="pt-1 flex items-center justify-between text-sm sm:text-base font-bold text-white tracking-wide group-hover:text-amber-300 transition-colors drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                        <span className="underline underline-offset-4 decoration-amber-400/80 group-hover:decoration-amber-300 break-words [word-break:break-word] whitespace-normal">
                          {t('explore....', 'explore....')}
                        </span>
                        <span className="text-amber-300 text-sm sm:text-base group-hover:translate-x-1.5 transition-transform font-bold shrink-0">&rarr;</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* IMAGE PICKER MODAL (Browse Assets, Upload Local File, Paste URL)    */}
      {/* =================================================================== */}
      {imagePickerOpen && imagePickerTarget && (
        <CollectionImagePickerModal
          isOpen={imagePickerOpen}
          onClose={() => {
            setImagePickerOpen(false);
            setImagePickerTarget(null);
          }}
          currentImageUrl={imagePickerTarget.currentUrl}
          collectionTitle={
            imagePickerTarget.type === 'card'
              ? imagePickerTarget.title
              : 'Collections Hero Banner'
          }
          onSelectImage={handleImagePickerSelect}
        />
      )}
      {/* =================================================================== */}
      {/* CLOUD BACKUP & SNAPSHOTS MODAL                                     */}
      {/* =================================================================== */}
      {cloudBackupOpen && (
        <CloudBackupModal
          isOpen={cloudBackupOpen}
          onClose={() => setCloudBackupOpen(false)}
          onCollectionsRestored={(restored) => {
            setCollections(restored);
            setIsDirty(false);
            setDirtyCardIds(new Set());
          }}
        />
      )}
    </section>
  );
};
