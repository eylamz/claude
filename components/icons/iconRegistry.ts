/**
 * Icon Registry - Static imports of all SVG icons
 * This file is auto-generated or manually maintained
 * All icons are imported at build time - no runtime fetching needed
 */

import React from 'react';

// Type for dynamic icon imports
type IconModule = {
  default: string | { src: string } | React.ComponentType;
};

// Create a registry map of icon imports
// Using dynamic import paths that webpack can resolve at build time
const iconRegistry: Record<string, () => Promise<IconModule>> = {
  // Map icon names to their import functions
  search: () => import('./search.svg'),
  menu: () => import('./menu.svg'),
  close: () => import('./close.svg'),
  X: () => import('./X.svg'),
  cart: () => import('./cart.svg'),
  shopCart: () => import('./shopCart.svg'),
  shopCartBold: () => import('./shopCartBold.svg'),
  heart: () => import('./heart.svg'),
  heartBold: () => import('./heartBold.svg'),
  heartLike: () => import('./heartLike.svg'),
  share: () => import('./share.svg'),
  shareBold: () => import('./shareBold.svg'),
  location: () => import('./location.svg'),
  locationBold: () => import('./locationBold.svg'),
  map: () => import('./map.svg'),
  filter: () => import('./filter.svg'),
  filterBold: () => import('./filterBold.svg'),
  star: () => import('./star.svg'),
  eye: () => import('./eye.svg'),
  eyeBold: () => import('./eyeBold.svg'),
  edit: () => import('./edit.svg'),
  editBold: () => import('./editBold.svg'),
  trash: () => import('./trash.svg'),
  trashBold: () => import('./trashBold.svg'),
  checkmark: () => import('./checkmark.svg'),
  info: () => import('./info.svg'),
  infoBold: () => import('./infoBold.svg'),
  arrowCircleDown: () => import('./arrowCircleDown.svg'),
  zoomIn: () => import('./zoomIn.svg'),
  zoomOut: () => import('./zoomOut.svg'),
  calendar: () => import('./calendar.svg'),
  calendarBold: () => import('./calendarBold.svg'),
  gift: () => import('./gift.svg'),
  giftBold: () => import('./giftBold.svg'),
  tag: () => import('./tag.svg'),
  tagBold: () => import('./tagBold.svg'),
  task: () => import('./task.svg'),
  taskBold: () => import('./taskBold.svg'),
  shop: () => import('./shop.svg'),
  shopBold: () => import('./shopBold.svg'),
  sun: () => import('./sun.svg'),
  sunBold: () => import('./sunBold.svg'),
  moon: () => import('./moon.svg'),
  moonBold: () => import('./moonBold.svg'),
  googleMaps: () => import('./googleMaps.svg'),
  googleMapsBold: () => import('./googleMapsBold.svg'),
  appleMaps: () => import('./appleMaps.svg'),
  appleMapsBold: () => import('./appleMapsBold.svg'),
  wazeMaps: () => import('./wazeMaps.svg'),
  wazeBold: () => import('./wazeBold.svg'),
  instagram: () => import('./instagram.svg'),
  youtube: () => import('./youtube.svg'),
  tiktok: () => import('./tiktok.svg'),
  messages: () => import('./messages.svg'),
  usaFlag: () => import('./usaFlag.svg'),
  israelFlag: () => import('./israelFlag.svg'),
  scooter: () => import('./scooter.svg'),
  parking: () => import('./parking.svg'),
  toilet: () => import('./toilet.svg'),
  wrench: () => import('./wrench.svg'),
  wrenchBold: () => import('./wrenchBold.svg'),
  gymWeight: () => import('./gymWeight.svg'),
  gymWeightBold: () => import('./gymWeightBold.svg'),
  account: () => import('./account.svg'),
  language: () => import('./language.svg'),
  logo: () => import('./logo.svg'),
  'logo-hostage': () => import('./logo-hostage.svg'),
  'logo-hostage2': () => import('./logo-hostage2.svg'),
  'logo-hostage3': () => import('./logo-hostage3.svg'),
  favIcon: () => import('./favIcon.svg'),
  favIconNew: () => import('./favIconNew.svg'),
  springjam25: () => import('./springjam25.svg'),
  Skate: () => import('./Skate.svg'),
  Roller: () => import('./Roller.svg'),
  Wax: () => import('./Wax.svg'),
  'bmx-icon': () => import('./bmx-icon.svg'),
  'safe-house': () => import('./safe-house.svg'),
  sunset: () => import('./sunset.svg'),
  shekel: () => import('./shekel.svg'),
  securityGuard: () => import('./securityGuard.svg'),
  helmet: () => import('./helmet.svg'),
  hours24: () => import('./hours24.svg'),
  lightbulbBold: () => import('./lightbulbBold.svg'),
  lockBold: () => import('./lockBold.svg'),
  notesBold: () => import('./notesBold.svg'),
  ranking: () => import('./ranking.svg'),
  rankingBold: () => import('./rankingBold.svg'),
  starWand: () => import('./starWand.svg'),
  starWandBold: () => import('./starWandBold.svg'),
  monitor: () => import('./monitor.svg'),
  monitorBold: () => import('./monitorBold.svg'),
  maximize: () => import('./maximize.svg'),
  maximizeBold: () => import('./maximizeBold.svg'),
  questionMark: () => import('./questionMark.svg'),
  link: () => import('./link.svg'),
  archive: () => import('./archive.svg'),
  featured: () => import('./featured.svg'),
  new: () => import('./new.svg'),
  sparks: () => import('./sparks.svg'),
  searchQuest: () => import('./searchQuest.svg'),
  bulkImage: () => import('./bulkImage.svg'),
  imageBold: () => import('./imageBold.svg'),
  clockBold: () => import('./clockBold.svg'),
  closedPark: () => import('./closedPark.svg'),
  couch: () => import('./couch.svg'),
  nearbyResturants: () => import('./nearbyResturants.svg'),
  books: () => import('./books.svg'),
  trees: () => import('./trees.svg'),
  newGoogleMaps: () => import('./newGoogleMaps.svg'),
  newAppleMaps: () => import('./newAppleMaps.svg'),
  newAppleMapsDark: () => import('./newAppleMapsDark.svg'),
  moovit: () => import('./moovit.svg'),
  moovitDark: () => import('./moovitDark.svg'),
  wazeDark: () => import('./wazeDark.svg'),
  oferSesh: () => import('./oferSesh.svg'),
  oferSeshRose: () => import('./oferSeshRose.svg'),
  'trash-can': () => import('./trash-can.svg'),
  umbrella: () => import('./umbrella.svg'),
  broom: () => import('./broom.svg'),
  // Alias
  clock: () => import('./clockBold.svg'),
};

export async function loadIcon(name: string): Promise<string> {
  const iconLoader = iconRegistry[name];
  
  if (!iconLoader) {
    throw new Error(`Icon "${name}" not found in registry`);
  }

  try {
    const iconModule = await iconLoader();
    
    // Handle different export formats from webpack/Next.js
    let svgUrl: string | undefined;
    
    if (typeof iconModule.default === 'string') {
      svgUrl = iconModule.default;
    } else if (iconModule.default && typeof iconModule.default === 'object') {
      svgUrl = (iconModule.default as any).src || (iconModule.default as any).default;
    }

    if (!svgUrl) {
      throw new Error(`Could not extract URL from icon module: ${name}`);
    }

    // For static files in Next.js, the URL should resolve immediately
    // If it's a data URL or inline SVG, return directly
    if (svgUrl.startsWith('data:') || svgUrl.startsWith('<svg')) {
      return svgUrl;
    }

    // Fetch the SVG content - this is a local file, no network request
    // The URL is a relative path that Next.js will resolve
    const response = await fetch(svgUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch icon: ${name} (${svgUrl})`);
    }
    
    return await response.text();
  } catch (error) {
    throw new Error(`Failed to load icon "${name}": ${error instanceof Error ? error.message : String(error)}`);
  }
}

export default iconRegistry;

