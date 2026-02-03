/**
 * Highlights the first occurrence of the search query (or flipped-keyboard equivalent)
 * in text. Used for search result display (e.g. MobileSidebar, HeaderNav, search page).
 */

import type { ReactNode } from 'react';
import { flipLanguage } from '@/lib/utils/transliterate';

export function highlightMatch(text: string, query: string): ReactNode {
  if (!query.trim() || !text) return text;

  const queryLower = query.toLowerCase().trim();
  const flipped = flipLanguage(query);
  const flippedLower = flipped ? flipped.toLowerCase().trim() : '';
  const textLower = text.toLowerCase();

  let index = textLower.indexOf(queryLower);
  let matchLength = query.length;
  if (index === -1 && flippedLower) {
    index = textLower.indexOf(flippedLower);
    matchLength = flippedLower.length;
  }
  if (index === -1) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + matchLength);
  const after = text.slice(index + matchLength);

  return (
    <>
      {before}
      <mark className="bg-transparent font-bold text-brand-main dark:text-brand-dark">
        {match}
      </mark>
      {after}
    </>
  );
}
