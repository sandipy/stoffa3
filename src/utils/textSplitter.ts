import React from 'react';

/**
 * Intelligent Semantic Text Splitter
 * Splits headlines and editorial subtitles at natural semantic linguistic boundaries
 * (clauses, prepositions, conjunctions, punctuation, em-dashes) rather than rigid word percentages.
 */

// Punctuation characters that indicate a natural semantic break
const PRIMARY_PUNCTUATION_SPLITS = ['—', '--', ':', ';', '–'];
const SECONDARY_PUNCTUATION_SPLITS = [',', '.', '!', '?'];

// Conjunctions, prepositions, and transition phrases that form natural phrase breaks
const SEMANTIC_TRANSITION_PHRASES = [
  'wherever the night takes you',
  'from aisle to after party',
  'from the aisle to the after-party',
  'from daytime exploring to',
  'handcrafted for couples in',
  'dual-density memory foam',
  'dual-density memory',
  'limited-production handcrafted',
  'express dispatch directly from',
  'directly from mumbai workshop',
  'a little extra glamour',
  'all the glam',
  'handcrafted architectural',
  'architectural stature &',
  'height without the stumble',
  'with dual-density',
  'elevated with',
  'crafted for',
  'designed for',
  'curated for',
  'featuring',
];

const SEMANTIC_BRIDGE_WORDS = [
  '&',
  'and',
  'with',
  'for',
  'where',
  'without',
  'from',
  'to',
  'in',
  'at',
  'by',
  'into',
  'across',
];

export interface SemanticSplitResult {
  line1: string;
  line2: string;
  splitReason?: string;
}

/**
 * Splits text into two visually balanced and grammatically coherent lines.
 * Uses AI-informed natural language heuristics:
 * 1. Honors explicit newlines or delimiters ('\n', '|', '//').
 * 2. Leaves short phrases (<= 4 words or <= 30 chars) on a single line to preserve punchiness.
 * 3. Splits at semantic punctuation (em-dashes '—', colons ':', semicolons ';', natural commas ',').
 * 4. Splits at natural prepositional / conjunction boundaries ('with', '&', 'for', 'where').
 * 5. Falls back to the nearest word boundary closest to the visual midpoint (50%).
 */
export function smartSemanticSplit(rawText: string): SemanticSplitResult {
  const text = (rawText || '').trim().replace(/\s+/g, ' ');
  if (!text) return { line1: '', line2: '' };

  // 1. Explicit line breaks or pipes
  if (text.includes('\n')) {
    const [first, ...rest] = text.split('\n');
    return { line1: first.trim(), line2: rest.join(' ').trim(), splitReason: 'explicit-newline' };
  }
  if (text.includes('|')) {
    const [first, ...rest] = text.split('|');
    return { line1: first.trim(), line2: rest.join(' ').trim(), splitReason: 'pipe-delimiter' };
  }
  if (text.includes('//')) {
    const [first, ...rest] = text.split('//');
    return { line1: first.trim(), line2: rest.join(' ').trim(), splitReason: 'slash-delimiter' };
  }

  const words = text.split(' ');

  // 2. Short phrases should stay on ONE line - avoid awkward 1-word or 2-word broken lines
  // e.g. "Stöffa Atelier", "The Spring-Summer Edit", "Just In", "Handcrafted Footwear", "Archive & Private Sale"
  if (words.length <= 4 || text.length <= 32) {
    return { line1: text, line2: '', splitReason: 'short-single-line' };
  }

  // 3. Primary punctuation: em dash '—', '--', colon ':', semicolon ';'
  for (const punct of PRIMARY_PUNCTUATION_SPLITS) {
    if (text.includes(punct)) {
      const parts = text.split(punct);
      const l1 = parts[0].trim();
      const l2 = parts.slice(1).join(punct).trim();
      if (l1.length >= 8 && l2.length >= 8) {
        return {
          line1: l1 + (punct === ':' || punct === ';' ? punct : ''),
          line2: (punct === '—' || punct === '–' ? '' : '') + l2,
          splitReason: `punct-${punct}`,
        };
      }
    }
  }

  // 4. Secondary punctuation: comma ',' or period '.'
  // Split at comma if positioned reasonably in the middle (between 25% and 75% of string length)
  const commaIdx = text.indexOf(',');
  if (commaIdx !== -1) {
    const ratio = commaIdx / text.length;
    if (ratio >= 0.25 && ratio <= 0.75) {
      const l1 = text.slice(0, commaIdx + 1).trim();
      const l2 = text.slice(commaIdx + 1).trim();
      if (l1 && l2) {
        return { line1: l1, line2: l2, splitReason: 'comma-clause' };
      }
    }
  }

  // 5. Check for curated semantic transition phrases
  const lower = text.toLowerCase();
  for (const phrase of SEMANTIC_TRANSITION_PHRASES) {
    const pIdx = lower.indexOf(phrase);
    if (pIdx > 8 && pIdx + phrase.length < text.length) {
      const l1 = text.slice(0, pIdx).trim();
      const l2 = text.slice(pIdx).trim();
      if (l1 && l2) {
        return { line1: l1, line2: l2, splitReason: 'semantic-phrase' };
      }
    }
  }

  // 6. Look for natural conjunctions / prepositions near the center (between 30% and 70% word count)
  let bestBridgeIdx = -1;
  let minDistanceToCenter = Infinity;
  const centerWordIdx = words.length / 2;

  words.forEach((w, idx) => {
    // don't break on first or last word
    if (idx <= 1 || idx >= words.length - 2) return;
    const cleanWord = w.toLowerCase().replace(/[^a-z&]/g, '');
    if (SEMANTIC_BRIDGE_WORDS.includes(cleanWord)) {
      const dist = Math.abs(idx - centerWordIdx);
      if (dist < minDistanceToCenter) {
        minDistanceToCenter = dist;
        bestBridgeIdx = idx;
      }
    }
  });

  if (bestBridgeIdx !== -1) {
    const l1 = words.slice(0, bestBridgeIdx).join(' ');
    const l2 = words.slice(bestBridgeIdx).join(' ');
    return { line1: l1, line2: l2, splitReason: 'bridge-word' };
  }

  // 7. Optimal character midpoint balancing: find word boundary closest to 50% character mark
  const midChar = Math.floor(text.length / 2);
  let bestSplitWordIdx = Math.floor(words.length / 2);
  let closestCharDist = Infinity;
  let runningLength = 0;

  for (let i = 0; i < words.length - 1; i++) {
    runningLength += words[i].length + 1;
    const dist = Math.abs(runningLength - midChar);
    if (dist < closestCharDist && i >= 1 && i <= words.length - 2) {
      closestCharDist = dist;
      bestSplitWordIdx = i + 1;
    }
  }

  return {
    line1: words.slice(0, bestSplitWordIdx).join(' '),
    line2: words.slice(bestSplitWordIdx).join(' '),
    splitReason: 'balanced-midpoint',
  };
}

/**
 * Splits a product title into two visually balanced lines for compact containers
 * such as the "Model is wearing..." section in the hero right panel.
 */
export function splitProductNameTwoLines(rawName: string): { line1: string; line2: string } {
  const name = (rawName || '').trim().replace(/\s+/g, ' ');
  if (!name) return { line1: '', line2: '' };

  // Explicit newlines or delimiters
  if (name.includes('\n')) {
    const [l1, ...rest] = name.split('\n');
    return { line1: l1.trim(), line2: rest.join(' ').trim() };
  }
  if (name.includes('—')) {
    const [l1, ...rest] = name.split('—');
    return { line1: l1.trim(), line2: rest.join('—').trim() };
  }
  if (name.includes('–')) {
    const [l1, ...rest] = name.split('–');
    return { line1: l1.trim(), line2: rest.join('–').trim() };
  }
  if (name.includes(' - ')) {
    const [l1, ...rest] = name.split(' - ');
    return { line1: l1.trim(), line2: rest.join(' - ').trim() };
  }

  const words = name.split(' ');
  if (words.length <= 1) {
    return { line1: name, line2: '' };
  }
  if (words.length === 2) {
    return { line1: words[0], line2: words[1] };
  }
  if (words.length === 3) {
    return { line1: `${words[0]} ${words[1]}`, line2: words[2] };
  }

  // Split at ampersand or 'and' if present
  const ampIdx = words.findIndex((w) => w === '&' || w.toLowerCase() === 'and');
  if (ampIdx >= 1 && ampIdx < words.length - 1) {
    return {
      line1: words.slice(0, ampIdx).join(' '),
      line2: words.slice(ampIdx).join(' '),
    };
  }

  // Character midpoint balancing across words
  const midChar = Math.floor(name.length / 2);
  let bestIdx = Math.ceil(words.length / 2);
  let minDiff = Infinity;
  let runningLen = 0;

  for (let i = 0; i < words.length - 1; i++) {
    runningLen += words[i].length + 1;
    const diff = Math.abs(runningLen - midChar);
    if (diff < minDiff) {
      minDiff = diff;
      bestIdx = i + 1;
    }
  }

  return {
    line1: words.slice(0, bestIdx).join(' '),
    line2: words.slice(bestIdx).join(' '),
  };
}

/**
 * Splits text on ampersand so that "& ..." is placed on the next line always.
 * Returns an array of lines.
 */
export function splitAmpersandNextLine(text: string): string[] {
  if (!text || typeof text !== 'string') return [text || ''];
  if (!text.includes('&')) return [text];

  const parts = text.split(/\s+&\s+/);
  if (parts.length <= 1) return [text];

  const lines: string[] = [parts[0].trim()];
  for (let i = 1; i < parts.length; i++) {
    lines.push(`& ${parts[i].trim()}`);
  }
  return lines;
}

/**
 * Renders text with ampersand clauses always breaking onto the next line.
 * Example: "Higher Wedges (3.5" - 4.25") & Bridal Crystals"
 * Line 1: Higher Wedges (3.5" - 4.25")
 * Line 2: & Bridal Crystals
 */
export function renderWithAmpersandNextLine(text: string): React.ReactNode {
  if (!text || typeof text !== 'string') return text;
  if (!text.includes('&')) return text;

  const parts = text.split(/\s+&\s+/);
  if (parts.length <= 1) return text;

  return React.createElement(
    React.Fragment,
    null,
    React.createElement('span', { className: 'block leading-tight' }, parts[0].trim()),
    parts.slice(1).map((part, idx) =>
      React.createElement(
        'span',
        { key: idx, className: 'block leading-tight mt-0.5' },
        `& ${part.trim()}`
      )
    )
  );
}
