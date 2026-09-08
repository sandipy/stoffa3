import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  SlidersHorizontal,
  X,
  Check,
  Camera,
  Sparkles,
} from 'lucide-react';
import { useCommerce, deduplicateProducts } from '../context/CommerceContext';
import { Product } from '../types';
import { getHeroSlideForCategory } from '../data/heroCollectionsData';
import { getEffectivePageHero } from '../data/pageHeroManager';
import { isReadyToShipProduct, isSaleProduct } from '../utils/collectionClassifier';
import { loadSavedHeroPairings } from '../data/heroPairingsData';
import { navigateTo } from '../utils/navigationRouter';
import { splitProductNameTwoLines, renderWithAmpersandNextLine } from '../utils/textSplitter';
import { guessIsLightBackground } from '../utils/imageLuminance';

interface CategoryCollectionSectionProps {
  categoryTitle: string;
}

export function formatStoffaDisplayTitle(product: Product): { mainTitle: string; colorTitle: string } {
  const colorName = product.colors && product.colors[0] ? product.colors[0].name.toUpperCase() : '';
  let upper = product.title.toUpperCase();

  // Clean brand noise
  upper = upper.replace(/^STOFFA\s+STYLE\s+/i, '').replace(/^STOFFA\s+/i, '');

  if (upper.includes(' - ')) {
    const parts = upper.split(' - ');
    return { mainTitle: parts[0].trim(), colorTitle: parts[1]?.trim() || colorName };
  }

  if (colorName && upper.endsWith(` ${colorName}`)) {
    const base = upper.substring(0, upper.length - colorName.length - 1).trim();
    return { mainTitle: base, colorTitle: colorName };
  }

  return { mainTitle: upper, colorTitle: colorName };
}

export const CategoryCollectionSection: React.FC<CategoryCollectionSectionProps> = ({
  categoryTitle,
}) => {
  const {
    products,
    formatPrice,
    setSelectedProductModal,
    sortBy,
    setSortBy,
    selectedSizeFilter,
    setSelectedSizeFilter,
    setSelectedCategory,
    activeCampaign,
    isAdminLoggedIn,
    openPageHeroManager,
    openAdminPageEditor,
    t,
  } = useCommerce();

  // Listen for real-time page hero updates saved by admin
  const [, setHeroUpdateVersion] = useState(0);
  useEffect(() => {
    const handleHeroUpdated = () => {
      setHeroUpdateVersion((v) => v + 1);
    };
    window.addEventListener('stoffa_page_heroes_updated', handleHeroUpdated);
    return () => window.removeEventListener('stoffa_page_heroes_updated', handleHeroUpdated);
  }, []);

  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [selectedColorFilter, setSelectedColorFilter] = useState<string>('all');
  const [selectedHeelFilter, setSelectedHeelFilter] = useState<string>('all');
  const [selectedPriceFilter, setSelectedPriceFilter] = useState<string>('all');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  // Helper functions for strict classification:
  // Strictly separates shoes from bags: no bags when under shoes, no shoes when in bags
  const isBagProduct = (p: Product): boolean => {
    const cat = (p.category || '').toLowerCase();
    const col = (p.collection || '').toLowerCase();
    const title = (p.title || '').toLowerCase();
    if (cat === 'bags' || col.includes('bags & potlis') || col.includes('bag')) return true;
    if (/\b(bag|bags|potli|potlis|clutch|clutches|tote|totes|handbag|handbags)\b/i.test(title)) {
      if (!title.includes('baguette flats') && !title.includes('baguette low') && !title.includes('baguette high')) {
        return true;
      }
    }
    return false;
  };

  const isShoeProduct = (p: Product): boolean => !isBagProduct(p);

  // Normalize categoryTitle matching
  const normalizedTitle = categoryTitle.toLowerCase().trim();

  const isShoeSection =
    normalizedTitle === 'shoes' ||
    normalizedTitle === 'all shoes' ||
    normalizedTitle.includes('wedge') ||
    normalizedTitle.includes('heel') ||
    normalizedTitle.includes('flat') ||
    normalizedTitle.includes('2.5') ||
    normalizedTitle.includes('3.5') ||
    normalizedTitle.includes('4.25');

  const SHOE_SUBSECTIONS = [
    { name: 'All Shoes', category: 'Shoes', hash: '#/shoes' },
    { name: '2.5" Wedges', category: 'Low wedges - 2.5 inch', hash: '#/shoes/low-wedges' },
    { name: '3.5" Wedges', category: 'High wedges - 3.5 inch', hash: '#/shoes/high-wedges' },
    { name: '4.25" Wedges', category: 'Higher wedge - 4.25 inch', hash: '#/shoes/higher-wedges' },
    { name: 'Block Heels', category: 'Block Heels', hash: '#/shoes/block-heels' },
    { name: 'Flats', category: 'Flats', hash: '#/shoes/flats' },
  ];

  const handleSubSelect = (sub: typeof SHOE_SUBSECTIONS[0]) => {
    setSelectedCategory(sub.category);
    window.location.hash = sub.hash;
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  const isSubActive = (sub: typeof SHOE_SUBSECTIONS[0]) => {
    if (sub.name === 'All Shoes') {
      return normalizedTitle === 'shoes' || normalizedTitle === 'all shoes';
    }
    return normalizedTitle === sub.category.toLowerCase();
  };

  // Filter products matching this section using authentic Stöffa Style attributes
  const matchingProducts = products.filter((p) => {
    if (p.isHidden) return false;

    const pCat = p.category.toLowerCase();
    const pCollection = (p.collection || '').toLowerCase();
    const pTitle = p.title.toLowerCase();
    const pColors = p.colors.map((c) => c.name.toLowerCase());
    const pSubtitle = (p.subtitle || '').toLowerCase();
    const occs = (p.occasions || []).map((o) => o.toLowerCase());
    const badge = (p.badge || '').toLowerCase();

    if (normalizedTitle === 'all' || normalizedTitle === 'home') return true;

    // ==========================================
    // 1. STRICT SHOE SUB-MENUS (NO BAGS ALLOWED)
    // ==========================================

    // 1a. Low wedges - 2.5 inch
    if (
      normalizedTitle.includes('2.5') ||
      normalizedTitle.includes('low wedge') ||
      normalizedTitle === 'low wedges - 2.5 inch'
    ) {
      if (!isShoeProduct(p)) return false;
      return (
        pCollection.includes('low wedge') ||
        pTitle.includes('2.5') ||
        pTitle.includes('2.25') ||
        pCollection.includes('low') ||
        (pTitle.includes('low') && pTitle.includes('wedge'))
      );
    }

    // 1b. Higher wedge - 4.25 inch (check BEFORE high wedges to avoid collisions)
    if (
      normalizedTitle.includes('4.25') ||
      normalizedTitle.includes('higher wedge') ||
      normalizedTitle === 'higher wedge - 4.25 inch'
    ) {
      if (!isShoeProduct(p)) return false;
      return (
        pCollection.includes('higher wedge') ||
        pTitle.includes('4.25') ||
        pTitle.includes('higher')
      );
    }

    // 1c. High wedges - 3.5 inch
    if (
      normalizedTitle.includes('3.5') ||
      normalizedTitle.includes('high wedge') ||
      normalizedTitle === 'high wedges - 3.5 inch'
    ) {
      if (!isShoeProduct(p)) return false;
      return (
        (pCollection.includes('high wedge') ||
          pTitle.includes('3.5') ||
          pTitle.includes('high k') ||
          pTitle.includes('classic high') ||
          (pTitle.includes('high') && pTitle.includes('wedge'))) &&
        !pCollection.includes('higher') &&
        !pTitle.includes('higher') &&
        !pTitle.includes('4.25')
      );
    }

    // 1d. Block Heels
    if (normalizedTitle.includes('block') || normalizedTitle === 'block heels') {
      if (!isShoeProduct(p)) return false;
      return pCollection.includes('block') || pTitle.includes('block');
    }

    // 1e. Flats (Strictly flats and loafers, no bags like Border Flat Bag)
    if (
      normalizedTitle === 'flats' ||
      normalizedTitle.includes('kolhapuri') ||
      normalizedTitle === 'flats & loafers'
    ) {
      if (!isShoeProduct(p)) return false;
      return (
        pCollection.includes('flat') ||
        pCat.includes('flat') ||
        pTitle.includes('flat') ||
        pTitle.includes('kolhapuri')
      );
    }

    // 1f. Shoes / Footwear general category (ALL shoes, STRICTLY NO bags)
    if (normalizedTitle === 'shoes' || normalizedTitle === 'footwear') {
      return isShoeProduct(p);
    }

    // ==========================================
    // 2. STRICT BAGS & ACCESSORIES (NO SHOES)
    // ==========================================
    if (
      normalizedTitle === 'bags' ||
      normalizedTitle === 'bags & potlis' ||
      normalizedTitle.includes('potli') ||
      normalizedTitle.includes('clutch') ||
      normalizedTitle.includes('tote') ||
      normalizedTitle === 'accessories'
    ) {
      return isBagProduct(p);
    }

    // ==========================================
    // 3. THE 14 USER-REQUESTED CURATED COLLECTIONS
    // ==========================================

    // Collection 1: Bride on Her Feet (Comfortable bridal footwear for standing & dancing)
    if (normalizedTitle === 'bride on her feet') {
      if (!isShoeProduct(p)) return false;
      return (
        badge.includes('bridal') ||
        pTitle.includes('bridal') ||
        pTitle.includes('crystal') ||
        pCollection.includes('low wedge') ||
        pCollection.includes('kolhapuri flats') ||
        pColors.some((c) => ['champagne', 'gold', 'light gold', 'rose gold', 'silver', 'white'].includes(c))
      ) && (occs.includes('wedding') || pCollection.includes('wedge') || pCollection.includes('flat'));
    }

    // Collection 2: Mother of the Bride (Refined low wedges, block heels, metallic accessories)
    if (normalizedTitle === 'mother of the bride') {
      return (
        pCollection.includes('low wedge') ||
        pCollection.includes('block') ||
        pTitle.includes('border clutch') ||
        pTitle.includes('border flat bag') ||
        pColors.some((c) => ['champagne', 'pewter', 'antique', 'silver', 'gold', 'light gold'].includes(c))
      ) && (pCollection.includes('low') || pCollection.includes('block') || isBagProduct(p) || pTitle.includes('classic'));
    }

    // Collection 3: The Bridesmaid Edit (Festive flats, block heels, shimmering potlis)
    if (normalizedTitle === 'the bridesmaid edit') {
      return (
        pCollection.includes('kolhapuri flats') ||
        pCollection.includes('block') ||
        pTitle.includes('potli') ||
        pTitle.includes('baguette') ||
        pColors.some((c) => ['rose gold', 'champagne', 'light gold', 'pink', 'gold'].includes(c))
      );
    }

    // Collection 4: The Destination Bride (Outdoor/resort wedding wedges, lawn/sand-friendly, braided)
    if (normalizedTitle === 'the destination bride') {
      return (
        pCollection.includes('wedge') &&
        (pColors.some((c) => ['gold', 'rose gold', 'champagne', 'light gold', 'tan', 'camel'].includes(c)) ||
          pTitle.includes('bridal') ||
          pTitle.includes('braided') ||
          pTitle.includes('tassel') ||
          occs.includes('resort'))
      );
    }

    // Collection: The Sangeet Ceremony (Dance-floor comfort, festive sparkle, low wedges, block heels, shimmering potlis)
    if (normalizedTitle === 'the sangeet ceremony' || normalizedTitle.includes('sangeet')) {
      return (
        pCollection.includes('low wedge') ||
        pCollection.includes('block') ||
        pCollection.includes('kolhapuri flats') ||
        pTitle.includes('crystal') ||
        pTitle.includes('baguette') ||
        pTitle.includes('potli') ||
        pTitle.includes('clutch')
      ) && (
        pColors.some((c) => ['gold', 'rose gold', 'champagne', 'light gold', 'silver', 'pewter', 'antique gold', 'pink'].includes(c)) ||
        occs.includes('wedding') ||
        occs.includes('festive') ||
        occs.includes('party') ||
        isBagProduct(p)
      );
    }

    // Collection 5: Something Blue (Navy, ink, blue tones & icy silver crystal pairings)
    if (normalizedTitle === 'something blue') {
      return (
        pColors.some((c) => c.includes('navy') || c.includes('blue') || c.includes('ink') || c.includes('silver') || c.includes('pewter')) ||
        pTitle.includes('navy') ||
        pTitle.includes('ink') ||
        pTitle.includes('blue') ||
        pTitle.includes('silver') ||
        pTitle.includes('pewter')
      );
    }

    // Collection 6: Prom Night (High wedges, baguette crystal flats & heels, glam clutches)
    if (normalizedTitle === 'prom night') {
      return (
        pCollection.includes('high wedge') ||
        pCollection.includes('higher wedge') ||
        pTitle.includes('crystal') ||
        pTitle.includes('baguette') ||
        pTitle.includes('clutch') ||
        pColors.some((c) => ['rose gold', 'silver', 'gold', 'light gold'].includes(c))
      );
    }

    // Collection 7: Quinceañera Glam (Princess crystal embellishments, rose gold, celebratory potlis)
    if (
      normalizedTitle === 'quinceañera glam' ||
      normalizedTitle.includes('quinceanera') ||
      normalizedTitle.includes('quinceañera')
    ) {
      return (
        pTitle.includes('crystal') ||
        pTitle.includes('embellished') ||
        pTitle.includes('potli') ||
        pColors.some((c) => ['rose gold', 'gold', 'light gold', 'champagne'].includes(c))
      );
    }

    // Collection 8: Cruise Ready (Effortless resort comfort, braided slide flats, 2.5" wedges, warm neutrals)
    if (normalizedTitle === 'cruise ready') {
      return (
        pCollection.includes('low wedge') ||
        pCollection.includes('kolhapuri flats') ||
        pTitle.includes('braided') ||
        pTitle.includes('tassel') ||
        pColors.some((c) => ['camel', 'tan', 'taupe', 'gold', 'light gold'].includes(c))
      );
    }

    // Collection 9: The Holiday Edit (Festive golds, rich pewter, black crystal, statement potlis)
    if (normalizedTitle === 'the holiday edit') {
      return (
        pTitle.includes('potli') ||
        pTitle.includes('crystal') ||
        pColors.some((c) => ['black', 'pewter', 'gold', 'antique'].includes(c)) ||
        badge.includes('best')
      );
    }

    // Collection 10: Garden Party (Grass-stable block heels, low wedges, airy flats, neutral tones)
    if (normalizedTitle === 'garden party') {
      return (
        pCollection.includes('block') ||
        pCollection.includes('low wedge') ||
        (pCollection.includes('flat') &&
          (pColors.some((c) => ['camel', 'tan', 'taupe', 'light gold', 'rose gold'].includes(c)) ||
            pTitle.includes('braided')))
      );
    }

    // Collection 11: Red Carpet Ready (Celebrity-worn statement pieces, crystal drama, sculptural wedges)
    if (normalizedTitle === 'red carpet ready') {
      return (
        badge.includes('worn by') ||
        pTitle.includes('crystal') ||
        pCollection.includes('higher wedge') ||
        pSubtitle.includes('worn by') ||
        badge.includes('bridal edit')
      );
    }

    // Collection 12: Christmas Brunch (Warm festive metallics, champagne flats, border holiday bags & block heels)
    if (normalizedTitle === 'christmas brunch') {
      return (
        pCollection.includes('block') ||
        (pCollection.includes('flat') && pColors.some((c) => ['gold', 'champagne', 'light gold'].includes(c))) ||
        pTitle.includes('border') ||
        pTitle.includes('potli')
      );
    }

    // Collection 13: Girls' Night Out (Chic block heels, metallic flats, party clutches & potlis)
    if (normalizedTitle === "girls' night out" || normalizedTitle.includes('girls')) {
      return (
        pCollection.includes('block') ||
        isBagProduct(p) ||
        pTitle.includes('baguette') ||
        pColors.some((c) => ['black', 'rose gold', 'silver', 'gold'].includes(c))
      );
    }

    // Collection 14: Date Night (Romantic 2.5" wedges, sleek block heels, black, rose gold & clutches)
    if (normalizedTitle === 'date night') {
      return (
        pCollection.includes('low wedge') ||
        pCollection.includes('block') ||
        isBagProduct(p) ||
        pColors.some((c) => ['black', 'rose gold', 'champagne', 'pewter'].includes(c))
      );
    }

    // ==========================================
    // 4. GENERAL CATEGORIES & EDITORIAL
    // ==========================================

    // Collections overview
    if (normalizedTitle === 'collections') {
      return true;
    }

    // Ready to Ship
    if (normalizedTitle.includes('ready to ship') || normalizedTitle.includes('ready')) {
      return isReadyToShipProduct(p);
    }

    // Sale
    if (normalizedTitle.includes('sale')) {
      return isSaleProduct(p);
    }

    // Just In / New Arrivals
    if (
      normalizedTitle.includes('latest') ||
      normalizedTitle.includes('new arrival') ||
      normalizedTitle.includes('just in')
    ) {
      return p.isNewArrival || Boolean(p.badge?.includes('NEW'));
    }

    // Bridal Wedges
    if (normalizedTitle.includes('bridal')) {
      return (
        pTitle.includes('crystal') ||
        pTitle.includes('bridal') ||
        pTitle.includes('champagne') ||
        pTitle.includes('gold') ||
        pTitle.includes('rose gold') ||
        pTitle.includes('silver')
      );
    }

    // Direct text search across title, category, collection, materials
    return (
      pCat.includes(normalizedTitle) ||
      pCollection.includes(normalizedTitle) ||
      pTitle.includes(normalizedTitle) ||
      pColors.some((c) => c.includes(normalizedTitle))
    );
  });

  function pOccasionsMatch(p: Product, occ: string): boolean {
    return Array.isArray(p.occasions) && p.occasions.includes(occ as any);
  }

  const getCategorySubtitle = (title: string): string => {
    const norm = title.toLowerCase().trim();
    if (norm === 'flats' || norm.includes('kolhapuri')) {
      return 'Handcrafted artisanal Kolhapuri flats & slides • Pure comfort on everyday feet';
    }
    if (norm.includes('2.5') || norm.includes('low wedge')) {
      return 'Signature 2.5" low wedges with dual-density memory foam for effortless all-day wear';
    }
    if (norm.includes('3.5') || norm.includes('high wedge')) {
      return 'Sculptural 3.5" high wedges pairing classic elevation with balanced comfort';
    }
    if (norm.includes('4.25') || norm.includes('higher wedge')) {
      return 'Statement 4.25" higher wedges engineered for celebratory height and stability';
    }
    if (norm.includes('block')) {
      return 'Handcrafted stable block heels offering contemporary structure and timeless poise';
    }
    if (norm === 'shoes' || norm === 'footwear') {
      return 'Exquisite handcrafted Indian footwear • Wedges, block heels, and Kolhapuri flats';
    }
    if (norm === 'bags' || norm.includes('bag') || norm.includes('potli')) {
      return 'Intricately embroidered border clutches, potlis, and handcrafted luxury evening bags';
    }
    if (norm === 'bride on her feet') {
      return 'Made for the long day, the dance floor and everything after — from the aisle to the after party.';
    }
    if (norm === 'mother of the bride') {
      return 'All the glam, with comfort for the long hours';
    }
    if (norm === 'the bridesmaid edit') {
      return 'Made to complement the bride, without holding you back from the dance floor.';
    }
    if (norm === 'the destination bride') {
      return 'Glamour that travels — from the ceremony to cocktails by the sea.';
    }
    if (norm === 'the sangeet ceremony' || norm.includes('sangeet')) {
      return 'Color and dance a match made in heaven.';
    }
    if (norm === 'something blue') {
      return 'A little blue, a lot of personality — your something blue, with a twist';
    }
    if (norm === 'prom night') {
      return 'The shoes that make the entrance — and keep you dancing all night';
    }
    if (norm === 'quinceañera glam' || norm.includes('quinceanera') || norm.includes('quinceañera')) {
      return 'For her big moment, with the glamour to match every dance.';
    }
    if (norm === 'cruise ready') {
      return 'From daytime exploring to sunset cocktails — one wardrobe, every occasion';
    }
    if (norm === 'the holiday edit') {
      return 'Lightweight in your baggage and versatile glam on your feet';
    }
    if (norm === 'garden party') {
      return 'Glam on the lawns , Height without the stumble.';
    }
    if (norm === 'red carpet ready') {
      return 'Make the entrance. Own the moment. Stay out late.';
    }
    if (norm === 'christmas brunch') {
      return 'Sparkle in comfort indoors,  as hostess or guest.';
    }
    if (norm === "girls' night out" || norm.includes('girls')) {
      return 'Made for the plans that start with “just one drink” and end much later';
    }
    if (norm === 'date night') {
      return 'A little extra glamour, wherever the night takes you.';
    }
    return 'Handcrafted luxury footwear & accessories • Exclusively priced in USD';
  };

  // Fallback to all if matching filtered empty, with deduplication
  const rawBaseList = matchingProducts.length > 0 ? matchingProducts : products;
  const baseList = deduplicateProducts(rawBaseList);

  // Apply Heel Height filter
  let displayProducts = baseList;
  if (selectedHeelFilter !== 'all') {
    displayProducts = displayProducts.filter((p) => {
      const col = (p.collection || '').toLowerCase();
      const title = p.title.toLowerCase();
      if (selectedHeelFilter === 'flats') return col.includes('flat') || title.includes('flat');
      if (selectedHeelFilter === 'low-wedge') return col.includes('low') || title.includes('2.25') || title.includes('low');
      if (selectedHeelFilter === 'high-wedge') return col.includes('3.5') || (title.includes('high') && !title.includes('higher'));
      if (selectedHeelFilter === 'higher-wedge') return col.includes('4.25') || title.includes('higher') || title.includes('4.5');
      if (selectedHeelFilter === 'block-heel') return col.includes('block') || title.includes('block');
      if (selectedHeelFilter === 'bags') return p.category.toLowerCase().includes('bag') || title.includes('potli');
      return true;
    });
  }

  // Apply color filter
  if (selectedColorFilter !== 'all') {
    displayProducts = displayProducts.filter((p) =>
      p.colors.some((c) => c.name.toLowerCase().includes(selectedColorFilter.toLowerCase()))
    );
  }

  // Apply size filter
  if (selectedSizeFilter !== 'all') {
    displayProducts = displayProducts.filter((p) => p.sizes.includes(selectedSizeFilter));
  }

  // Apply price filter
  if (selectedPriceFilter !== 'all') {
    displayProducts = displayProducts.filter((p) => {
      if (selectedPriceFilter === 'under-50') return p.priceUSD < 50;
      if (selectedPriceFilter === '50-75') return p.priceUSD >= 50 && p.priceUSD <= 75;
      if (selectedPriceFilter === 'over-75') return p.priceUSD > 75;
      return true;
    });
  }

  // Apply sorting
  displayProducts = [...displayProducts].sort((a, b) => {
    if (sortBy === 'price-low-to-high') return a.priceUSD - b.priceUSD;
    if (sortBy === 'price-high-to-low') return b.priceUSD - a.priceUSD;
    if (sortBy === 'newest') {
      if (a.isNewArrival && !b.isNewArrival) return -1;
      if (!a.isNewArrival && b.isNewArrival) return 1;
      return b.id.localeCompare(a.id);
    }
    return 0; // featured
  });

  const activeFiltersCount =
    (selectedColorFilter !== 'all' ? 1 : 0) +
    (selectedSizeFilter !== 'all' ? 1 : 0) +
    (selectedHeelFilter !== 'all' ? 1 : 0) +
    (selectedPriceFilter !== 'all' ? 1 : 0);

  const resetAllFilters = () => {
    setSelectedColorFilter('all');
    setSelectedSizeFilter('all');
    setSelectedHeelFilter('all');
    setSelectedPriceFilter('all');
  };

  const getSortLabel = (sortVal: string) => {
    switch (sortVal) {
      case 'price-low-to-high':
        return t('Price: Low to High', 'Price: Low to High');
      case 'price-high-to-low':
        return t('Price: High to Low', 'Price: High to Low');
      case 'newest':
        return t('Date: New to Old', 'Date: New to Old');
      case 'best-selling':
        return t('Best Selling', 'Best Selling');
      default:
        return t('Featured', 'Featured');
    }
  };

  const defaultHeroSlide = getHeroSlideForCategory(categoryTitle);
  const effectiveHero = getEffectivePageHero(categoryTitle);

  const displayImageUrl = effectiveHero.isCustom
    ? effectiveHero.imageUrl
    : (effectiveHero.imageUrl || defaultHeroSlide.imageUrl);
  const displaySubtitle = effectiveHero.isCustom
    ? effectiveHero.subtitle
    : (defaultHeroSlide.subtitle || effectiveHero.subtitle);
  const displayTitle = effectiveHero.isCustom
    ? effectiveHero.title
    : categoryTitle;
  const displayBadge = effectiveHero.badge;
  const isLightBg = guessIsLightBackground(displayImageUrl);

  // Resolve paired shoe for the current collection/hero image
  const pairedInfo = useMemo(() => {
    const heroPairings = loadSavedHeroPairings();
    const pairingMatch = heroPairings.find((p) => {
      const fn = p.cleanFilename || p.rawFilename || p.imageFilename || '';
      const urlLast = displayImageUrl?.split('/').pop() || '';
      return (
        fn &&
        displayImageUrl &&
        (displayImageUrl.includes(fn) || fn.includes(urlLast) || p.imageSrc === displayImageUrl)
      );
    });
    const shoeName = pairingMatch?.suggestedShoes || pairingMatch?.pairedShoes;
    const shoeImgUrl = pairingMatch?.shoesUrl || pairingMatch?.pairedShoesUrl;
    if (pairingMatch && shoeName) {
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
    // Highlight a premier footwear product if available
    const featuredFootwear = displayProducts.find(
      (p) =>
        p.images &&
        p.images.length > 0 &&
        (p.category === 'Shoes' ||
          p.category?.toLowerCase().includes('wedge') ||
          p.category?.toLowerCase().includes('heel') ||
          p.category?.toLowerCase().includes('flat'))
    );
    if (featuredFootwear) {
      return {
        title: featuredFootwear.title,
        image: featuredFootwear.images[0],
        product: featuredFootwear,
      };
    }
    return null;
  }, [displayImageUrl, products, displayProducts]);

  const handleOpenPairedShoe = (info: { title: string; product: Product | null }) => {
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
        setSelectedCategory('Shoes');
        navigateTo('shoes');
      }
    }
  };

  return (
    <section id="category-products-section" className="w-full bg-white pt-3 sm:pt-6 pb-8 sm:pb-12 scroll-mt-36 sm:scroll-mt-44">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 
          DEDICATED COLLECTION HERO BANNER 
          Using 1 of the collection images matching this menu item/category!
          Features clean layout with right-panel integration, unbolded subtitle, prominent title, and footwear showcase.
        */}
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] lg:aspect-[16/9] max-h-[calc(100vh-120px)] min-h-[380px] sm:min-h-[440px] md:min-h-[500px] overflow-hidden rounded-2xl border border-stone-200/90 shadow-xl group bg-stone-900 mb-8 sm:mb-12">
          <img
            src={displayImageUrl}
            alt={defaultHeroSlide.altText || displayTitle}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-[center_60%] transition-all duration-700 ease-out"
          />

          {/* In-place Admin controls to edit this page's hero image and text (moved to top-left to avoid colliding with right panel) */}
          {isAdminLoggedIn && (
            <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
              <button
                type="button"
                onClick={() => openAdminPageEditor(categoryTitle)}
                className="px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold border border-amber-300 backdrop-blur-md shadow-xl flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer group/btn"
                title={`Edit images, titles, and text for ${categoryTitle}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-stone-950 group-hover/btn:rotate-12 transition-transform" />
                <span>Edit Page (Image &amp; Text)</span>
              </button>
              <button
                type="button"
                onClick={() => openPageHeroManager(categoryTitle)}
                className="px-3 py-1.5 rounded-full bg-black/80 hover:bg-black text-white text-xs font-semibold border border-white/20 backdrop-blur-md shadow-xl flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title={`Quick Photo Selector for ${categoryTitle}`}
              >
                <Camera className="w-3.5 h-3.5 text-amber-300" />
                <span>Photo Modal</span>
              </button>
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
            className={`absolute top-3 sm:top-4 md:top-5 right-3 sm:right-4 md:right-5 bottom-4 sm:bottom-6 md:bottom-8 z-20 flex flex-col justify-between items-end text-right w-[75vw] sm:w-1/5 min-w-0 max-w-[260px] sm:max-w-none p-2.5 sm:p-3 md:p-3.5 lg:p-4 rounded-2xl sm:rounded-3xl transition-all duration-300 pointer-events-auto ${
              isLightBg
                ? 'bg-white/[0.04] hover:bg-white/[0.08] border border-black/5 shadow-xs'
                : 'bg-black/[0.04] hover:bg-black/[0.08] border border-white/10 shadow-xs'
            }`}
          >
            {/* Top Section: Badge, Subtitle (unbolded italic), and Title wrapped within 1/5 box */}
            <div className="w-full flex flex-col items-end text-right">
              {displayBadge && (
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30 text-[10px] font-mono font-bold uppercase tracking-wider mb-2 backdrop-blur-xs">
                  {t(displayBadge, displayBadge)}
                </span>
              )}

              {/* 1st Line: Subtitle - Italic Serif unbolded with high-contrast text shadow, wrapping naturally */}
              <div
                style={{ color: isLightBg ? '#09090b' : '#ffffff' }}
                className={`text-xs sm:text-sm md:text-base lg:text-lg font-serif font-normal italic mb-1 sm:mb-1.5 text-right tracking-normal break-words [word-break:break-word] whitespace-normal leading-snug transition-colors duration-300 ${
                  isLightBg
                    ? 'text-stone-950 !text-stone-950 drop-shadow-[0_2px_10px_rgba(255,255,255,1)] [text-shadow:_0_2px_14px_rgb(255_255_255_/_100%),_0_1px_4px_rgb(255_255_255_/_90%)]'
                    : 'text-white !text-white drop-shadow-[0_3px_16px_rgba(0,0,0,1)] [text-shadow:_0_2px_16px_rgb(0_0_0_/_100%),_0_1px_6px_rgb(0_0_0_/_95%),_0_0_3px_rgb(0_0_0_/_90%)]'
                }`}
              >
                <span>{renderWithAmpersandNextLine(t(displaySubtitle, displaySubtitle))}</span>
              </div>

              {/* Title: Bold tracking-tight, wrapping naturally, made bigger */}
              <h2
                style={{ color: isLightBg ? '#000000' : '#ffffff' }}
                className={`text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black tracking-tight text-right break-words [word-break:break-word] whitespace-normal leading-tight transition-colors duration-300 ${
                  isLightBg
                    ? 'text-black !text-black drop-shadow-[0_2px_10px_rgba(255,255,255,1)] [text-shadow:_0_2px_14px_rgb(255_255_255_/_100%),_0_1px_4px_rgb(255_255_255_/_90%)]'
                    : 'text-white !text-white drop-shadow-[0_4px_18px_rgba(0,0,0,1)] [text-shadow:_0_3px_18px_rgb(0_0_0_/_100%),_0_1px_6px_rgb(0_0_0_/_95%)]'
                }`}
              >
                {renderWithAmpersandNextLine(t(displayTitle, displayTitle))}
              </h2>
            </div>

            {/* Bottom Section: Model is wearing footwear integrated seamlessly into the right panel */}
            {pairedInfo && (
              <div className="mt-auto pt-2.5 sm:pt-3.5 w-full flex flex-col items-end">
                <button
                  id={`category-paired-shoe-btn-${categoryTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
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
        </div>

        {/* Shoe Subcategories Navigation - Right below hero image on shoe section */}
        {isShoeSection && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 my-6 pb-2">
            {SHOE_SUBSECTIONS.map((sub) => {
              const active = isSubActive(sub);
              return (
                <button
                  key={sub.name}
                  onClick={() => handleSubSelect(sub)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    active
                      ? 'btn-champagne-pill-active shadow-xs'
                      : 'btn-champagne-pill'
                  }`}
                >
                  {t(sub.name, sub.name)}
                </button>
              );
            })}
          </div>
        )}

        {/* Collection Status and Sort Bar */}
        <div className="flex items-center justify-end border-b-2 border-stone-200 pb-4 mb-8">
          {/* Right: Featured Sort Menu with 4px corners */}
          <div className="relative">
            <button
              id="category-sort-btn"
              onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
              className="flex items-center gap-2 text-sm sm:text-base text-stone-950 hover:text-black font-bold transition-colors cursor-pointer"
            >
              <span>{getSortLabel(sortBy)}</span>
              <ChevronDown className="w-4 h-4 text-stone-900" />
            </button>

            {isSortMenuOpen && (
              <div className="absolute end-0 top-full mt-2 w-52 bg-white border-2 border-stone-300 shadow-xl py-2 z-40 rounded-[4px]">
                {[
                  { value: 'featured', label: t('Featured', 'Featured') },
                  { value: 'best-selling', label: t('Best Selling', 'Best Selling') },
                  { value: 'price-low-to-high', label: t('Price: Low to High', 'Price: Low to High') },
                  { value: 'price-high-to-low', label: t('Price: High to Low', 'Price: High to Low') },
                  { value: 'newest', label: t('Date: New to Old', 'Date: New to Old') },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSortBy(opt.value as any);
                      setIsSortMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors block cursor-pointer ${
                      sortBy === opt.value
                        ? 'bg-stone-100 text-stone-950 font-extrabold'
                        : 'text-stone-800 hover:bg-stone-50 hover:text-stone-950'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Symmetrical 4-Column Product Grid (Matches Screenshot: 4 items per row, edge balanced) */}
        {displayProducts.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <h3 className="font-serif text-lg text-slate-700">{t('No pieces match this specific combination', 'No pieces match this specific combination')}</h3>
            <p className="text-xs text-slate-500">{t('Try resetting filters to explore all handcrafted Stöffa styles.', 'Try resetting filters to explore all handcrafted Stöffa styles.')}</p>
            <button
              onClick={resetAllFilters}
              className="px-5 py-2.5 btn-champagne-primary rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs"
            >
              {t('Reset Filters', 'Reset Filters')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 sm:gap-x-6 gap-y-10 sm:gap-y-12">
            {displayProducts.map((product) => {
              const displayTitle = formatStoffaDisplayTitle(product);

              return (
                <div
                  key={product.id}
                  id={`cat-product-${product.id}`}
                  onClick={() => setSelectedProductModal(product)}
                  className="group bg-white flex flex-col cursor-pointer transition-all text-left"
                >
                  {/* Image Frame with generous padding and margins so low wedges and all images never crop */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#faf8f5] rounded-lg border border-stone-200/80 p-5 sm:p-6 flex items-center justify-center">
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      referrerPolicy="no-referrer"
                      className="max-w-full max-h-full w-auto h-auto object-contain transition-all duration-500 ease-out group-hover:scale-105 drop-shadow-xs"
                    />
                    {product.images[1] && (
                      <img
                        src={product.images[1]}
                        alt={`${product.title} secondary angle`}
                        referrerPolicy="no-referrer"
                        className="max-w-full max-h-full w-auto h-auto object-contain absolute inset-0 m-auto p-5 sm:p-6 opacity-0 transition-opacity duration-500 group-hover:opacity-100 drop-shadow-xs"
                      />
                    )}
                  </div>

                  {/* Product Metadata formatted with bigger and darker fonts */}
                  <div className="pt-3.5 pb-2">
                    {/* Title in Uppercase tracking format: e.g. CLASSIC HIGH K WEDGE / INK */}
                    <div className="text-sm sm:text-base md:text-lg text-stone-950 tracking-[0.06em] uppercase font-bold line-clamp-2 leading-snug break-words group-hover:text-amber-950 transition-colors">
                      {t(displayTitle.mainTitle, displayTitle.mainTitle)} {displayTitle.colorTitle ? `/ ${t(displayTitle.colorTitle, displayTitle.colorTitle)}` : ''}
                    </div>

                    {/* Price line with bigger and darker fonts */}
                    <div className="flex items-center flex-wrap gap-2 text-base sm:text-lg md:text-xl mt-1.5">
                      <span className="text-stone-950 font-extrabold tracking-tight">
                        {formatPrice(product.priceUSD)}
                      </span>
                    </div>

                    {/* Color Swatches below Colors Available with images when 2 or more colors are available */}
                    {product.colors && product.colors.length >= 2 && (
                      <div className="mt-2.5 pt-2 border-t border-stone-100" onClick={(e) => e.stopPropagation()}>
                        <div className="text-[11px] text-stone-500 font-medium mb-1.5 flex items-center justify-between">
                          <span>{t('Colors Available:', 'Colors Available:')}</span>
                          <span className="font-semibold text-stone-800">{product.colors.length} {t('shades', 'shades')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                          {product.colors.slice(0, 4).map((clr, cIdx) => {
                            const swatchImg = product.images[cIdx % product.images.length] || product.images[0];
                            return (
                              <div
                                key={clr.name}
                                title={clr.name}
                                className="flex items-center gap-1 p-1 rounded-md border border-stone-200 bg-[#fbf9f6] text-[10px] text-stone-700 shrink-0 shadow-2xs"
                              >
                                <div className="w-5 h-5 rounded overflow-hidden bg-white border border-stone-200 shrink-0 flex items-center justify-center p-0.5">
                                  <img
                                    src={swatchImg}
                                    alt={clr.name}
                                    referrerPolicy="no-referrer"
                                    className="max-w-full max-h-full w-auto h-auto object-contain"
                                  />
                                </div>
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-stone-300 shrink-0"
                                  style={{ backgroundColor: clr.hex }}
                                />
                                <span className="font-medium text-[10px] max-w-[60px] truncate">{t(clr.name, clr.name)}</span>
                              </div>
                            );
                          })}
                          {product.colors.length > 4 && (
                            <span className="text-[10px] text-stone-400 font-mono pl-1 shrink-0">
                              +{product.colors.length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
