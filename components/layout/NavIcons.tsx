'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { sanitizeSvg } from '@/lib/utils/sanitizeSvg';

// Inline SVGs for instant paint – no network request. Logo is first so it's the first thing visible.
const LOGO_SVG = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 136 25" class="logo" style="enable-background:new 0 0 136 25" xmlSpace="preserve"><style>.logo0{fill-rule:evenodd;clip-rule:evenodd}</style><g><path class="logo0" d="M132.8,5c0,0-2.9,0.1-5,0.1h-6c-2.6,0-3.5,0.6-3.5,2.6c0,1.9,0.9,2.3,3.1,2.5l7.4,0.6c5,0.4,7.2,2.2,7.2,6.6c0,4.6-2.2,7.1-8,7.1h-14.5c1.4-1,2.2-2.5,2.5-4.5h12c2.5,0,3.4-0.6,3.4-2.6c0-1.9-0.9-2.4-3.1-2.6l-7.4-0.6c-5.1-0.4-7.1-2.1-7.1-6.6c0-4.6,2.2-7.1,7.9-7.1h6.1c1.2,0,4.1,0,4.8,0c-0.9,0-0.1,0,0.2,0c0.5,0,0.8,0.3,0.8,0.8v2.7C133.6,4.7,133.3,5,132.8,5z M111.4,5c0,0-0.4,0.1-2.6,0.1h-8.4C97.9,5,97,5.7,97,7.7c0,1.9,0.9,2.3,3.1,2.5l7.4,0.6c5,0.4,7.2,2.2,7.2,6.6c0,4.6-2.2,7.1-8,7.1H88v0c-0.1,0-0.2,0-0.3-0.1c1.6-1.2,2.9-2.7,3.9-4.4h15c2.5,0,3.4-0.6,3.4-2.6c0-1.9-0.9-2.4-3.1-2.6l-7.4-0.6c-5.1-0.4-7.1-2.1-7.1-6.6c0-4.6,2.2-7.1,7.9-7.1h8.5c1.1,0,2.4,0,2.6,0c0.5,0,0.8,0.3,0.8,0.8v2.7C112.3,4.7,112,5,111.4,5z M75.9,8.2c1,0.8,2,1.7,2.9,2.5c0.8-0.9,1.7-1.8,2.6-2.8C82.4,8.5,83.3,9,83.3,9s-1.3,1.4-2.9,3.1c1.9,1.8,3.2,3.2,3.2,3.2s-1.5,1.5-1.5,1.5c-0.6-0.7-1.8-1.9-3.1-3.1c-1.2,1.3-2.2,2.6-2.7,3.2c-0.1,0.1-1.7-1.2-1.7-1.2s1.1-1.5,2.8-3.5c-1.7-1.6-3.2-2.9-3.2-2.9S75.1,8.8,75.9,8.2z M79.1,25c-4.2,0-7.9-2-10.1-5.3c1.1-1.8,1.7-3.9,2.6-5.8c0.6,3.6,3.8,6.4,7.5,6.4c4.2,0,7.7-3.5,7.7-7.8c0-4-2.9-7.3-6.7-7.7c-0.1,0-0.3,0-0.3-0.1c-0.1,0-0.2,0-0.3,0c-13.9,0-5.5,19.6-21.7,19.6c-9.7,0-13.9,0-13.9,0c-0.5,0-0.8-0.3-0.8-0.8V9.2l0-1.2c0-0.5,0.3-0.8,0.8-0.8h3c0.5,0,0.8,0.3,0.8,0.8l0,2.5h9.2c1.7,0,3-0.4,3-2.4V7.6c0-2-1.3-2.6-3.4-2.6h-8.3v0H36.1V1.4c0-0.5,0.3-0.8,0.8-0.8h19.6c5.6,0,7.8,2.2,7.9,6.6v0.3c0,1.8-0.6,3.4-1.7,4.5c0.9,0.3,1.5,0.7,1.4,1.1c-0.2,0.7-1,2.7-2,3.2c0-1-1.9-1.9-4.5-1.9c-0.1,0-0.1,0-0.2,0c-0.2,0-0.4,0-0.6,0h-9.4V20c0,0,1.7-0.1,10-0.1C70.3,19.8,62.2,0,79.1,0c0,0,0.1,0,0.1,0c6.7,0.1,12.2,5.7,12.2,12.5C91.4,19.5,85.9,25,79.1,25z M36.9,7.2h3c0.5,0,0.8,0.3,0.8,0.8v15.6c0,0.5-0.3,0.8-0.8,0.8h-3c-0.4,0-0.8-0.2-1-0.5L22.9,7.7v9.7c0,0.5-0.3,0.8-0.8,0.8h-3c-0.5,0-0.8-0.3-0.8-0.8V1.4c0-0.5,0.3-0.8,0.8-0.8h3c0.4,0,0.8,0.2,1,0.5L36,17.4V8C36,7.5,36.3,7.2,36.9,7.2z M15.4,5H4.6v5.2h6.9c0.5,0,0.8,0.3,0.8,0.8v2.5c0,0.5-0.3,0.8-0.8,0.8H4.6v5.5h17.3c0.5,0,0.8,0.3,0.8,0.8v2.8c0,0.5-0.3,0.8-0.8,0.8H0.8c-0.5,0-0.8-0.3-0.8-0.8V1.4c0-0.5,0.3-0.8,0.8-0.8h14.5c0.5,0,0.8,0.3,0.8,0.8v2.8C16.2,4.7,15.9,5,15.4,5z" fill="CurrentColor"/></g></svg>`;

const SEARCH_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path><path d="M22 22L20 20" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>`;

const SEARCH_BOLD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22"><g><path fill="currentColor" d="M10.5,20c5.25,0,9.5-4.25,9.5-9.5S15.75,1,10.5,1,1,5.25,1,10.5s4.25,9.5,9.5,9.5Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21,21l-2-2"/></g></svg>`;

const BACKPACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 41.07 52.03"><g><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M26.49,9.63c.27-.7.42-1.46.42-2.26,0-3.52-2.85-6.37-6.37-6.37s-6.37,2.85-6.37,6.37c0,.78.15,1.53.41,2.22,1.71-.92,3.69-1.44,5.92-1.44s4.27.54,6,1.49Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M33.23,22.32c0-5.57-2.49-10.37-6.74-12.69-1.73-.94-3.74-1.49-6-1.49s-4.21.53-5.92,1.44c-4.3,2.3-6.82,7.13-6.82,12.73l-1.43,21.67c0,3.89,3.15,7.05,7.05,7.05h14.26c3.89,0,7.05-3.15,7.05-7.05l-1.43-21.67Z"/><line stroke="currentColor" x1="14.74" y1="26.01" x2="26.33" y2="26.01" stroke-width="5"/><line stroke="currentColor" x1="14.74" y1="37.57" x2="26.33" y2="37.57" stroke-width="5"/></g></svg>`;

const BACKPACK_BOLD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 41.07 51.78"><g><circle fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" cx="20.54" cy="7.37" r="6.37"/><path fill="currentColor" d="M38.53,29.26h-3.78c-.11,0-.21.03-.31.07l-.46-7.01c0-8.65-5.67-14.92-13.49-14.92s-13.49,6.28-13.49,14.87l-.46,7.02c-.07-.02-.14-.03-.21-.03h-3.78c-1.4,0-2.54,1.14-2.54,2.54v9.48c0,2.36,1.92,4.27,4.27,4.27h1.46c.73,3.54,3.9,6.23,7.63,6.23h14.26c3.75,0,6.89-2.66,7.63-6.23h1.56c2.36,0,4.27-1.92,4.27-4.27v-9.48c0-1.4-1.14-2.54-2.54-2.54ZM26.33,39.57h-11.58c-1.1,0-2-.9-2-2s.9-2,2-2h11.58c1.1,0,2,.9,2,2s-.9,2-2,2ZM26.33,28.01h-11.58c-1.1,0-2-.9-2-2s.9-2,2-2h11.58c1.1,0,2,.9,2,2s-.9,2-2,2Z"/></g></svg>`;

const SETTINGS_BOLD_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.1 9.2214C18.29 9.2214 17.55 7.9414 18.45 6.3714C18.97 5.4614 18.66 4.3014 17.75 3.7814L16.02 2.7914C15.23 2.3214 14.21 2.6014 13.74 3.3914L13.63 3.5814C12.73 5.1514 11.25 5.1514 10.34 3.5814L10.23 3.3914C9.78 2.6014 8.76 2.3214 7.97 2.7914L6.24 3.7814C5.33 4.3014 5.02 5.4714 5.54 6.3814C6.45 7.9414 5.71 9.2214 3.9 9.2214C2.86 9.2214 2 10.0714 2 11.1214V12.8814C2 13.9214 2.85 14.7814 3.9 14.7814C5.71 14.7814 6.45 16.0614 5.54 17.6314C5.02 18.5414 5.33 19.7014 6.24 20.2214L7.97 21.2114C8.76 21.6814 9.78 21.4014 10.25 20.6114L10.36 20.4214C11.26 18.8514 12.74 18.8514 13.65 20.4214L13.76 20.6114C14.23 21.4014 15.25 21.6814 16.04 21.2114L17.77 20.2214C18.68 19.7014 18.99 18.5314 18.47 17.6314C17.56 16.0614 18.3 14.7814 20.11 14.7814C21.15 14.7814 22.01 13.9314 22.01 12.8814V11.1214C22 10.0814 21.15 9.2214 20.1 9.2214ZM12 15.2514C10.21 15.2514 8.75 13.7914 8.75 12.0014C8.75 10.2114 10.21 8.7514 12 8.7514C13.79 8.7514 15.25 10.2114 15.25 12.0014C15.25 13.7914 13.79 15.2514 12 15.2514Z" fill="currentColor"/></svg>`;

const NAV_ICONS: Record<string, string> = {
  logo: LOGO_SVG,
  search: SEARCH_SVG,
  searchBold: SEARCH_BOLD_SVG,
  backpack: BACKPACK_SVG,
  backpackBold: BACKPACK_BOLD_SVG,
  settingsBold: SETTINGS_BOLD_SVG,
};

export type NavIconName = keyof typeof NAV_ICONS;

interface NavIconsProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: NavIconName;
  className?: string;
}

/**
 * Lightweight nav-only icons. Inline SVGs – no fetch, no Icon bundle.
 * Logo is first in the map so it paints first; use for nav bar only.
 */
export function NavIcons({ name, className, style, ...props }: NavIconsProps) {
  const svg = NAV_ICONS[name];
  if (!svg) return null;
  return (
    <span
      className={cn('inline-flex items-center justify-center [&>svg]:size-full [&>svg]:shrink-0 [&>svg]:overflow-visible', className)}
      style={style}
      {...props}
      dangerouslySetInnerHTML={{ __html: sanitizeSvg(svg) }}
    />
  );
}
