import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCommerce } from '../context/CommerceContext';
import { STOFFA_STYLE_OFFICIAL_PRODUCTS } from '../data/stoffaStyleProducts';
import { HeroSlideConfig, loadHeroSlides } from '../data/heroSlidesManager';
import { getEffectivePageHero } from '../data/pageHeroManager';
import {
  analyzeImageTopRightLuminance,
  splitWords6040,
  guessIsLightBackground,
} from '../utils/imageLuminance';
import { splitProductNameTwoLines, renderWithAmpersandNextLine } from '../utils/textSplitter';

export const Hero: React.FC = () => {
  const {
    setSelectedCategory,
    clearFilters,
    setSelectedProductModal,
    heroSlides,
    isAdminLoggedIn,
    openPageHeroManager,
    openAdminPageEditor,
    t,
  } = useCommerce();

  // Listen for real-time page hero customizations
  const [, setHeroUpdateVersion] = useState(0);
  useEffect(() => {
    const handleUpdate = () => setHeroUpdateVersion((v) => v + 1);
    window.addEventListener('stoffa_page_heroes_updated', handleUpdate);
    return () => window.removeEventListener('stoffa_page_heroes_updated', handleUpdate);
  }, []);

  const effectiveHomeHero = getEffectivePageHero('home');
  const isCustomHomeHero = effectiveHomeHero.isCustom;

  // Filter active slides excluding unavailable ("not using right now") and deleted slides
  const allSlides: HeroSlideConfig[] =
    heroSlides && heroSlides.length > 0 ? heroSlides : loadHeroSlides();
  const availableSlides = allSlides.filter((s) => !s.isUnavailable && !s.isDeleted);
  // Fallback if all slides are marked unavailable or deleted so the storefront never breaks
  const activeSlides: HeroSlideConfig[] =
    availableSlides.length > 0
      ? availableSlides
      : allSlides.filter((s) => !s.isDeleted).length > 0
      ? allSlides.filter((s) => !s.isDeleted)
      : allSlides;

  // Start on a random image among all hero images on initial mount
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(() => {
    return Math.floor(Math.random() * (allSlides.length || 38));
  });

  const [isPaused, setIsPaused] = useState(false);
  const [isRandomMode] = useState(true);
  const [, setSlideHistory] = useState<number[]>([]);

  // Shuffled queue of slide indices ensuring every image of the slides is shown before repeating
  const shuffleQueueRef = useRef<number[]>([]);

  const getNextRandomSlideIndex = useCallback((): number => {
    if (activeSlides.length <= 1) return 0;

    // If queue is empty, refill with a freshly shuffled permutation of all indices
    if (!shuffleQueueRef.current || shuffleQueueRef.current.length === 0) {
      const pool = Array.from({ length: activeSlides.length }, (_, i) => i);
      // Fisher-Yates shuffle
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      // Avoid immediately showing the same slide that is currently visible
      if (pool[0] === currentSlideIndex && pool.length > 1) {
        [pool[0], pool[1]] = [pool[1], pool[0]];
      }
      shuffleQueueRef.current = pool;
    }

    return shuffleQueueRef.current.shift() ?? 0;
  }, [activeSlides.length, currentSlideIndex]);

  const currentSlide: HeroSlideConfig = activeSlides[currentSlideIndex] || activeSlides[0];
  const activeImageUrl = isCustomHomeHero ? effectiveHomeHero.imageUrl : currentSlide.imageUrl;

  // Dynamically analyze top-right region of hero image to select black or white text
  const [isLightBg, setIsLightBg] = useState<boolean>(() => guessIsLightBackground(activeImageUrl));

  useEffect(() => {
    const cancel = analyzeImageTopRightLuminance(activeImageUrl, (light) => {
      setIsLightBg(light);
    });
    return cancel;
  }, [activeImageUrl]);

  // Translate and split subtitle & title: 60% on 1st line, 40% on 2nd line
  const rawSubtitle = t(
    isCustomHomeHero ? effectiveHomeHero.subtitle : currentSlide.subtitle,
    isCustomHomeHero ? effectiveHomeHero.subtitle : currentSlide.subtitle
  );
  const subtitleLines = splitWords6040(rawSubtitle);

  const rawTitle = t(
    isCustomHomeHero ? effectiveHomeHero.title : currentSlide.title,
    isCustomHomeHero ? effectiveHomeHero.title : currentSlide.title
  );
  const titleLines = splitWords6040(rawTitle);

  // Resolve matching hero pairing & product with multiple robust strategies
  const resolvePairedShoe = (): { product: (typeof STOFFA_STYLE_OFFICIAL_PRODUCTS)[0] | null; title: string; image?: string } | null => {
    const rawShoe = currentSlide?.pairedShoes || (currentSlide as any)?.suggestedShoes;
    if (!rawShoe || rawShoe === '__none___') return null;

    const query = rawShoe.trim();
    const queryLower = query.toLowerCase();

    // 1. Direct title match
    let match = STOFFA_STYLE_OFFICIAL_PRODUCTS.find(
      (p) => p.title.toLowerCase() === queryLower
    );
    if (match) return { product: match, title: match.title, image: match.images?.[0] };

    // 2. URL handle match
    if (currentSlide.pairedShoesUrl) {
      const handle = currentSlide.pairedShoesUrl.split('/products/')[1]?.split(/[?#]/)[0];
      if (handle) {
        match = STOFFA_STYLE_OFFICIAL_PRODUCTS.find(
          (p) => p.handle?.toLowerCase() === handle.toLowerCase()
        );
        if (match) return { product: match, title: match.title, image: match.images?.[0] };
      }
    }

    // 3. Substring match
    match = STOFFA_STYLE_OFFICIAL_PRODUCTS.find((p) => {
      const pTitle = p.title.toLowerCase();
      return pTitle.includes(queryLower) || queryLower.includes(pTitle);
    });
    if (match) return { product: match, title: match.title, image: match.images?.[0] };

    // 4. Word overlap match
    const words = queryLower.split(/\s+/).filter((w) => w.length > 3);
    if (words.length > 0) {
      let maxScore = 0;
      let bestMatch: (typeof STOFFA_STYLE_OFFICIAL_PRODUCTS)[0] | null = null;
      for (const p of STOFFA_STYLE_OFFICIAL_PRODUCTS) {
        const pTitle = p.title.toLowerCase();
        let score = 0;
        for (const w of words) {
          if (pTitle.includes(w)) score++;
        }
        if (score > maxScore && score >= 2) {
          maxScore = score;
          bestMatch = p;
        }
      }
      if (bestMatch) return { product: bestMatch, title: bestMatch.title, image: bestMatch.images?.[0] };
    }

    // 5. Fallback shoe image from catalog if no exact product match
    const fallbackShoe = STOFFA_STYLE_OFFICIAL_PRODUCTS.find((p) => p.category === 'Shoes' || p.category === 'Bridal' || p.category === 'Wedges');
    return { product: null, title: query, image: fallbackShoe?.images?.[0] };
  };

  const pairedInfo = resolvePairedShoe();

  const handleOpenPairedShoe = (pairing: { product: any; title: string }) => {
    if (pairing.product) {
      setSelectedProductModal(pairing.product);
      window.location.hash = `#/product/${pairing.product.handle || pairing.product.id}`;
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      setSelectedProductModal(null);
      clearFilters();
      setSelectedCategory('Shoes');
      window.location.hash = `#/shoes`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextSlide = useCallback(() => {
    if (isRandomMode) {
      const nextIdx = getNextRandomSlideIndex();
      setSlideHistory((prev) => [...prev.slice(-27), currentSlideIndex]);
      setCurrentSlideIndex(nextIdx);
    } else {
      setSlideHistory((prev) => [...prev.slice(-27), currentSlideIndex]);
      setCurrentSlideIndex((prev) => (prev + 1) % activeSlides.length);
    }
  }, [isRandomMode, getNextRandomSlideIndex, currentSlideIndex, activeSlides.length]);

  // Auto-rotate hero slide every 5 seconds (random or sequential rotation) if not hovered/paused
  useEffect(() => {
    if (isPaused) return;
    const slideTimer = setInterval(() => {
      handleNextSlide();
    }, 5000);
    return () => clearInterval(slideTimer);
  }, [isPaused, handleNextSlide]);

  return (
    <section
      id="hero-15-collections-showcase"
      className="w-full bg-[#faf9f6] pt-1 sm:pt-2 pb-2 sm:pb-3"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Full-Width Wide Editorial Hero Container */}
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] lg:aspect-[16/9] max-h-[calc(100vh-120px)] min-h-[380px] sm:min-h-[440px] md:min-h-[500px] overflow-hidden rounded-2xl border border-stone-200/90 shadow-xl group bg-stone-900">
          
          {/* High-Fashion Editorial Image */}
          <img
            key={isCustomHomeHero ? effectiveHomeHero.imageUrl : currentSlide.imageUrl}
            src={isCustomHomeHero ? effectiveHomeHero.imageUrl : currentSlide.imageUrl}
            alt={currentSlide.altText || (isCustomHomeHero ? effectiveHomeHero.title : 'Stoffa Hero')}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-[center_60%] transition-all duration-700 ease-out"
          />

          {/* In-place Admin controls to edit Homepage hero (positioned at top-left to avoid colliding with top-right editorial text) */}
          {isAdminLoggedIn && (
            <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
              <button
                type="button"
                onClick={() => openAdminPageEditor('home')}
                className="px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold border border-amber-300 backdrop-blur-md shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                title="Edit Homepage hero image, title, and subtitle"
              >
                <span>Edit Home (Image &amp; Text)</span>
              </button>
              <button
                type="button"
                onClick={() => openPageHeroManager('home')}
                className="px-3 py-1.5 rounded-full bg-black/80 hover:bg-black text-white text-xs font-semibold border border-white/20 backdrop-blur-md shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Change Homepage Hero Image from Library"
              >
                <span>Photo Modal</span>
              </button>
            </div>
          )}

          {/* 
            WIDE HERO EDITORIAL TEXT:
            - Positioned at top-right: right aligned on top right
            - Text color: dynamically choose black or white based on image background luminance
            - 1 unified big box on right: sizing top to bottom above slide counter (1/5 width of hero)
            - Very transparent, hardly visible, almost not there
            - No nested separate boxes: 1 single integrated container
            - Natural text wrapping within box as required for 1/5 width
            - Bottom-right: "Model is wearing..." button link with shoe image on a new line, sized to fit
          */}
          <div
            className={`absolute top-3 sm:top-4 md:top-5 right-3 sm:right-4 md:right-5 bottom-14 sm:bottom-16 md:bottom-16 z-20 flex flex-col justify-between items-end text-right w-[75vw] sm:w-1/5 min-w-0 max-w-[260px] sm:max-w-none p-2.5 sm:p-3 md:p-3.5 lg:p-4 rounded-2xl sm:rounded-3xl transition-all duration-300 pointer-events-auto ${
              isLightBg
                ? 'bg-white/[0.04] hover:bg-white/[0.08] border border-black/5 shadow-xs'
                : 'bg-black/[0.04] hover:bg-black/[0.08] border border-white/10 shadow-xs'
            }`}
          >
            {/* Top Section: Editorial Text (Subtitle & Title) wrapped within 1/5 box */}
            <div className="w-full flex flex-col items-end text-right">
              {/* 1st Line: Subtitle - Italic Serif with High-Contrast Shadow, wrapping naturally */}
              <div
                style={{ color: isLightBg ? '#09090b' : '#ffffff' }}
                className={`text-xs sm:text-sm md:text-base lg:text-lg font-serif font-normal italic mb-1 sm:mb-1.5 text-right tracking-normal break-words [word-break:break-word] whitespace-normal leading-snug transition-colors duration-300 ${
                  isLightBg
                    ? 'text-stone-950 !text-stone-950 drop-shadow-[0_2px_10px_rgba(255,255,255,1)] [text-shadow:_0_2px_14px_rgb(255_255_255_/_100%),_0_1px_4px_rgb(255_255_255_/_90%)]'
                    : 'text-white !text-white drop-shadow-[0_3px_16px_rgba(0,0,0,1)] [text-shadow:_0_2px_16px_rgb(0_0_0_/_100%),_0_1px_6px_rgb(0_0_0_/_95%),_0_0_3px_rgb(0_0_0_/_90%)]'
                }`}
              >
                <span>{renderWithAmpersandNextLine(rawSubtitle)}</span>
              </div>

              {/* Collection Title: Bold Type Line - wrapped neatly to fit within 1/5 box width, made bigger */}
              <h2
                style={{ color: isLightBg ? '#000000' : '#ffffff' }}
                className={`text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black tracking-tight text-right break-words [word-break:break-word] whitespace-normal leading-tight transition-colors duration-300 ${
                  isLightBg
                    ? 'text-black !text-black drop-shadow-[0_2px_10px_rgba(255,255,255,1)] [text-shadow:_0_2px_14px_rgb(255_255_255_/_100%),_0_1px_4px_rgb(255_255_255_/_90%)]'
                    : 'text-white !text-white drop-shadow-[0_4px_18px_rgba(0,0,0,1)] [text-shadow:_0_3px_18px_rgb(0_0_0_/_100%),_0_1px_6px_rgb(0_0_0_/_95%)]'
                }`}
              >
                <span>{renderWithAmpersandNextLine(rawTitle)}</span>
              </h2>
            </div>

            {/* Bottom-Right Section: Model is wearing footwear integrated seamlessly into the right panel */}
            {pairedInfo && (
              <div className="mt-auto pt-2.5 sm:pt-3.5 w-full flex flex-col items-end">
                <button
                  id="hero-paired-shoe-btn"
                  onClick={() => handleOpenPairedShoe(pairedInfo)}
                  className="w-full flex flex-col items-end text-right transition-all cursor-pointer group p-0 bg-transparent border-0 shadow-none focus:outline-none"
                  title={`View footwear: ${pairedInfo.title}`}
                >
                  <span
                    className={`font-bold uppercase tracking-wider text-[10px] sm:text-xs leading-tight transition-colors duration-300 break-words whitespace-normal text-right ${
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
                        className={`font-bold text-xs sm:text-sm md:text-base leading-tight mt-1 group-hover:underline transition-colors duration-300 text-right w-full block break-words [word-break:break-word] whitespace-normal ${
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
          </div>

          {/* Slide Indicator Dots & Counter (Bottom-Right) */}
          <div className="absolute bottom-4 sm:bottom-5 right-4 sm:right-5 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur-xs border border-white/20 shadow-lg">
            {/* Counter */}
            <span className="text-[11px] font-mono text-white/90 font-semibold tracking-wider">
              {String(currentSlideIndex + 1).padStart(2, '0')}&thinsp;/&thinsp;{String(activeSlides.length).padStart(2, '0')}
            </span>

            {/* Interactive Dot Strip */}
            <div className="hidden sm:flex items-center gap-1 ml-1 max-w-[280px] overflow-x-auto py-0.5 scrollbar-none">
              {activeSlides.map((slide, idx) => (
                <button
                  key={slide.id || idx}
                  onClick={() => {
                    setSlideHistory((prev) => [...prev.slice(-27), currentSlideIndex]);
                    setCurrentSlideIndex(idx);
                  }}
                  title={`Slide ${idx + 1}: ${slide.title} (${slide.cleanFilename})`}
                  className={`transition-all rounded-full cursor-pointer shrink-0 ${
                    currentSlideIndex === idx
                      ? 'w-4 h-1.5 bg-amber-400 shadow-xs'
                      : 'w-1 h-1.5 bg-white/40 hover:bg-white/80'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
