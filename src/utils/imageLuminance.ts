/**
 * Image Luminance Detection Utility
 * Samples the top-right region of an image to automatically select
 * black or white text for optimal editorial readability.
 */

// Heuristic keyword dictionary for hero images
const KNOWN_LIGHT_KEYWORDS = [
  'palace',
  'white',
  'sunny',
  'boardwalk',
  'cafe',
  'terrace',
  'garden',
  'limestone',
  'day',
  'resort_casual',
  'beach',
  'ivory',
  'champagne',
  'bench',
  'kaftan',
  'yacht',
  'flats',
  'block_heels',
];

const KNOWN_DARK_KEYWORDS = [
  'night',
  'skyline',
  'speakeasy',
  'fireside',
  'black_terrace',
  'ballroom',
  'twilight',
  'midnight',
  'noir',
  'cocktail_soiree',
];

/**
 * Fast heuristic guess based on filename/URL
 */
export function guessIsLightBackground(imageUrl: string): boolean {
  if (!imageUrl) return false;
  const lower = imageUrl.toLowerCase();

  for (const darkWord of KNOWN_DARK_KEYWORDS) {
    if (lower.includes(darkWord)) return false;
  }
  for (const lightWord of KNOWN_LIGHT_KEYWORDS) {
    if (lower.includes(lightWord)) return true;
  }
  return false;
}

// In-memory cache for sampled luminance results
const luminanceCache = new Map<string, boolean>();

/**
 * Samples the top-right quadrant of an image to determine if the background
 * is light (perceived luminance > 138).
 */
export function analyzeImageTopRightLuminance(
  imageUrl: string,
  callback: (isLight: boolean) => void
): () => void {
  if (!imageUrl) {
    callback(false);
    return () => {};
  }

  if (luminanceCache.has(imageUrl)) {
    callback(luminanceCache.get(imageUrl)!);
    return () => {};
  }

  let cancelled = false;
  const img = new Image();
  img.crossOrigin = 'Anonymous';

  img.onload = () => {
    if (cancelled) return;
    try {
      const sampleW = 32;
      const sampleH = 32;
      const canvas = document.createElement('canvas');
      canvas.width = sampleW;
      canvas.height = sampleH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        const fallback = guessIsLightBackground(imageUrl);
        luminanceCache.set(imageUrl, fallback);
        callback(fallback);
        return;
      }

      // Sample specifically the top-right quadrant where editorial text is positioned
      const sw = Math.max(1, img.naturalWidth * 0.55);
      const sh = Math.max(1, img.naturalHeight * 0.45);
      const sx = Math.max(0, img.naturalWidth - sw);
      const sy = 0;

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sampleW, sampleH);
      const imgData = ctx.getImageData(0, 0, sampleW, sampleH).data;

      let totalLum = 0;
      let count = 0;

      for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        const a = imgData[i + 3];

        if (a > 50) {
          // Standard ITU-R BT.709 perceived luminance formula
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          totalLum += lum;
          count++;
        }
      }

      const avgLum = count > 0 ? totalLum / count : 120;
      // Perceived luminance > 138 means bright/light background -> text should be black
      const isLight = avgLum > 138;
      luminanceCache.set(imageUrl, isLight);
      if (!cancelled) callback(isLight);
    } catch {
      // CORS or security restriction fallback
      const fallback = guessIsLightBackground(imageUrl);
      luminanceCache.set(imageUrl, fallback);
      if (!cancelled) callback(fallback);
    }
  };

  img.onerror = () => {
    if (cancelled) return;
    const fallback = guessIsLightBackground(imageUrl);
    luminanceCache.set(imageUrl, fallback);
    callback(fallback);
  };

  img.src = imageUrl;

  return () => {
    cancelled = true;
  };
}

import { smartSemanticSplit } from './textSplitter';

/**
 * Intelligent Semantic Text Splitter (Replaces obsolete 60% logic).
 * Splits text using AI natural language heuristics at grammatical, punctuation,
 * and semantic phrase boundaries where it makes sense, leaving short phrases unbroken.
 */
export function splitWords6040(text: string): { line1: string; line2: string } {
  return smartSemanticSplit(text);
}

export { smartSemanticSplit };
