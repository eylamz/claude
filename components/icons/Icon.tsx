'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// Direct SVG imports - Next.js will bundle these at build time
import Helmet from './helmet.svg';
import Toilet from './toilet.svg';
import Parking from './parking.svg';
import Guard from './securityGuard.svg';
import Scoot from './scooter.svg';
import Bike from './bmx-icon.svg';
import BombShelter from './safe-house.svg';
import Shekel from './shekel.svg';
import Couch from './couch.svg';
import Rainy from './rainy.svg';
import LightRain from './lightRain.svg';
import Snow from './snow.svg';
import Wind from './wind.svg';
import Cloudy from './cloudy.svg';
import PartlyCloudy from './partlyCloudy.svg';
import UmbrellaBold from './umbrellaBold.svg';
import Thunderstorm from './thunderstorm.svg';
import MapPinBold from './locationBold.svg';
import MapPin from './location.svg';
import AmenitiesBold from './notesBold.svg';
import Info from './info.svg';
import InfoBold from './infoBold.svg';
import Target from './target.svg';
import TargetBold from './targetBold.svg';
import QuestionMark from './questionMark.svg';
import ClockBold from './clockBold.svg';
import LightbulbBold from './lightbulbBold.svg';
import Sunset from './sunset.svg';
import Sun from './sun.svg';
import SunBold from './sunBold.svg';
import Moon from './moon.svg';
import MoonBold from './moonBold.svg';
import Menu from './menu.svg';
import Hours24 from './hours24.svg';
import MapIcon from './map.svg';
import MapIconBold from './mapBold.svg';
import LocationOff from './locationOff.svg';
import LocationOffBold from './locationOffBold.svg';
import HeartLiked from './heartLike.svg';
import Heart from './heart.svg';
import HeartBold from './heartBold.svg';
import FilterBold from './filterBold.svg';
import Filter from './filter.svg';
import Close from './close.svg';
import X from './X.svg';
import ImageBold from './imageBold.svg';
import BulkImage from './bulkImage.svg';
import Logo from './logo.svg';
import LogoHostage from './logo-hostage.svg';
import LogoHostage2 from './logo-hostage2.svg';
import LogoHostage3 from './logo-hostage3.svg';
import GymWeightBold from './gymWeightBold.svg';
import GymWeight from './gymWeight.svg';
import Wrench from './wrench.svg';
import WrenchBold from './wrenchBold.svg';
import PlantBold from './plantBold.svg';
import GoogleMaps from './googleMaps.svg';
import newGoogleMaps from './newGoogleMaps.svg';
import newAppleMaps from './newAppleMaps.svg';
import newAppleMapsDark from './newAppleMapsDark.svg';
import Waze from './wazeMaps.svg';
import WazeDark from './wazeDark.svg';
import GoogleMapsBold from './googleMapsBold.svg';
import AppleMapsBold from './appleMapsBold.svg';
import WazeBold from './wazeBold.svg';
import NoWax from './Wax.svg';
import NearbyRestaurants from './nearbyResturants.svg';
import Roller from './Roller.svg';
import Skate from './Skate.svg';
import Longboard from './longboard.svg';
import Search from './search.svg';
import SearchBold from './SearchBold.svg';
import SearchQuest from './searchQuest.svg';
import SearchClose from './searchClose.svg';
import Sparks from './sparks.svg';
import SparksBold from './sparksBold.svg';
import New from './new.svg';
import Featured from './featured.svg';
import Archive from './archive.svg';
import ArrowCircleDown from './arrowCircleDown.svg';
import ClosedPark from './closedPark.svg';
import IsraelFlag from './israelFlag.svg';
import UsaFlag from './usaFlag.svg';
import Instagram from './instagram.svg';
import Youtube from './youtube.svg';
import Messages from './messages.svg';
import Tiktok from './tiktok.svg';
import Trash from './trash.svg';
import TrashBold from './trashBold.svg';
import Link from './link.svg';
import Share from './share.svg';
import ShareBold from './shareBold.svg';
import Account from './account.svg';
import AccountBold from './accountBold.svg';
import Trainers from './trainers.svg';
import TrainersBold from './trainersBold.svg';
import Moovit from './moovit.svg';
import MoovitDark from './moovitDark.svg';
import Park from './trees.svg';
import Books from './books.svg';
import Star from './star.svg';
import StarWand from './starWand.svg';
import StarWandBold from './starWandBold.svg';
import Cart from './cart.svg';
import Backpack from './backpack.svg';
import BackpackBold from './backpackBold.svg';
import LockBold from './lockBold.svg';
import Eye from './eye.svg';
import EyeClosed from './eyeClosed.svg';
import EyeBold from './eyeBold.svg';
import EyeClosedBold from './eyeClosedBold.svg';
import Shop from './shop.svg';
import ShopBold from './shopBold.svg';
import ShopCart from './shopCart.svg';
import ShopCartBold from './shopCartBold.svg';
import ZoomIn from './zoomIn.svg';
import ZoomOut from './zoomOut.svg';
import Edit from './edit.svg';
import EditBold from './editBold.svg';
import Gift from './gift.svg';
import GiftBold from './giftBold.svg';
import Tag from './tag.svg';
import TagBold from './tagBold.svg';
import Task from './task.svg';
import TaskBold from './taskBold.svg';
import Calendar from './calendar.svg';
import CalendarBold from './calendarBold.svg';
import Checkmark from './checkmark.svg';
import Ranking from './ranking.svg';
import RankingBold from './rankingBold.svg';
import Maximize from './maximize.svg';
import MaximizeBold from './maximizeBold.svg';
import Monitor from './monitor.svg';
import MonitorBold from './monitorBold.svg';
import oferSesh from './oferSesh.svg';
import oferSeshRose from './oferSeshRose.svg';
import springJam from './springjam25.svg';
import Language from './language.svg';
import FavIcon from './favIcon.svg';
import FavIconNew from './favIconNew.svg';
import TrashCan from './trash-can.svg';
import Settings from './settings.svg';
import SettingsBold from './settingsBold.svg';
import Admin from './admin.svg';
import AdminBold from './adminBold.svg';
import Logout from './logout.svg';
import LogoutBold from './logoutBold.svg';
import Category from './category.svg';
import CategoryBold from './categoryBold.svg';
import Drag from './drag.svg';
import DragBold from './dragBold.svg';
import Global from './global.svg';
import GlobalBold from './globalBold.svg';
import Hebrew from './hebrew.svg';
import HebrewBold from './hebrewBold.svg';
import English from './english.svg';
import EnglishBold from './englishBold.svg';
import Book from './book.svg';
import BookBold from './bookBold.svg';
import Accessibility from './accessibility.svg';
import AccessibilityBold from './accessibilityBold.svg';
import Terms from './terms.svg';
import TermsBold from './termsBold.svg';
import Chart from './chart.svg';
import ChartBold from './chartBold.svg';
import Objects from './objects.svg';
import ObjectsBold from './objectsBold.svg';
import BroomBold from './broomBold.svg';
import Cookie from './cookie.svg';
import CookieBold from './cookieBold.svg';

// Type for SVG components (Next.js imports SVGs as URLs by default)
type SvgComponent = React.ComponentType<React.SVGProps<SVGSVGElement>> | string;

// Icon cache to store loaded SVG content synchronously
const iconCache = new Map<string, string>();

// Icon mapping - maps icon names to their imported SVG modules
const iconMap: Record<string, SvgComponent> = {
  // Amenity Icons
  helmet: Helmet,
  toilet: Toilet,
  parking: Parking,
  securityGuard: Guard,
  scooter: Scoot,
  'bmx-icon': Bike,
  'safe-house': BombShelter,
  shekel: Shekel,
  couch: Couch,
  umbrellaBold: UmbrellaBold,
  Wax: NoWax,
  nearbyResturants: NearbyRestaurants,
  
  // Navigation Icons
  location: MapPin,
  locationBold: MapPinBold,
  map: MapIcon,
  mapBold: MapIconBold,
  locationOff: LocationOff,
  locationOffBold: LocationOffBold,
  search: Search,
  searchBold: SearchBold,
  searchQuest: SearchQuest,
  searchClose: SearchClose,
  filter: Filter,
  filterBold: FilterBold,
  close: Close,
  X: X,
  menu: Menu,
  cart: Cart,
  plantBold: PlantBold,
  backpack: Backpack,
  backpackBold: BackpackBold,
  shop: Shop,
  shopBold: ShopBold,
  settings: Settings,
  settingsBold: SettingsBold,
  admin: Admin,
  adminBold: AdminBold,
  logout: Logout,
  logoutBold: LogoutBold,
  global: Global,
  globalBold: GlobalBold,
  hebrew: Hebrew,
  hebrewBold: HebrewBold,
  english: English,
  englishBold: EnglishBold,
  book: Book,
  bookBold: BookBold,
  objects: Objects,
  objectsBold: ObjectsBold,

  // Weather Icons
  wind: Wind,
  cloudy: Cloudy,
  partlyCloudy: PartlyCloudy, 
  rainy: Rainy,
  lightRain: LightRain,
  snow: Snow,
  thunderstorm: Thunderstorm,


  // Action Icons
  heart: Heart,
  heartBold: HeartBold,
  heartLike: HeartLiked,
  googleMaps: GoogleMaps,
  newGoogleMaps: newGoogleMaps,
  newAppleMaps: newAppleMaps,
  newAppleMapsDark: newAppleMapsDark,
  wazeMaps: Waze,
  wazeDark: WazeDark,
  moovit: Moovit,
  moovitDark: MoovitDark,
  googleMapsBold: GoogleMapsBold,
  appleMapsBold: AppleMapsBold,
  wazeBold: WazeBold,
  instagram: Instagram,
  youtube: Youtube,
  messages: Messages,
  tiktok: Tiktok,
  trash: Trash,
  trashBold: TrashBold,
  link: Link,
  share: Share,
  shareBold: ShareBold,
  shopCart: ShopCart,
  shopCartBold: ShopCartBold,
  edit: Edit,
  editBold: EditBold,
  drag: Drag,
  dragBold: DragBold,
  
  // Rating Icons
  wrench: Wrench,
  wrenchBold: WrenchBold,
  gymWeight: GymWeight,
  gymWeightBold: GymWeightBold,
  broomBold: BroomBold,
  
  // UI Icons
  logo: Logo,
  'logo-hostage': LogoHostage,
  'logo-hostage2': LogoHostage2,
  'logo-hostage3': LogoHostage3,
  clock: ClockBold,
  clockBold: ClockBold,
  cookie: Cookie,
  cookieBold: CookieBold,
  notesBold: AmenitiesBold,
  info: Info,
  infoBold: InfoBold,
  target: Target,
  targetBold: TargetBold,
  accessibility: Accessibility,
  accessibilityBold: AccessibilityBold,
  terms: Terms,
  termsBold: TermsBold,
  questionMark: QuestionMark,
  account: Account,
  accountBold: AccountBold,
  trainers: Trainers,
  trainersBold: TrainersBold,
  sun: Sun,
  sunBold: SunBold,
  moon: Moon,
  moonBold: MoonBold,
  sunset: Sunset,
  chart: Chart,
  chartBold: ChartBold,
  lightbulbBold: LightbulbBold,
  hours24: Hours24,
  map: MapIcon,
  imageBold: ImageBold,
  bulkImage: BulkImage,
  sparks: Sparks,
  sparksBold: SparksBold,
  new: New,
  featured: Featured,
  archive: Archive,
  closedPark: ClosedPark,
  israelFlag: IsraelFlag,
  usaFlag: UsaFlag,
  trees: Park,
  books: Books,
  star: Star,
  starWand: StarWand,
  starWandBold: StarWandBold,
  lockBold: LockBold,
  zoomIn: ZoomIn,
  zoomOut: ZoomOut,
  arrowCircleDown: ArrowCircleDown,
  eye: Eye,
  eyeClosed: EyeClosed,
  eyeBold: EyeBold,
  eyeClosedBold: EyeClosedBold,
  gift: Gift,
  giftBold: GiftBold,
  tag: Tag,
  tagBold: TagBold,
  task: Task,
  taskBold: TaskBold,
  calendar: Calendar,
  calendarBold: CalendarBold,
  checkmark: Checkmark,
  ranking: Ranking,
  rankingBold: RankingBold,
  maximize: Maximize,
  maximizeBold: MaximizeBold,
  monitor: Monitor,
  monitorBold: MonitorBold,
  category: Category,
  categoryBold: CategoryBold,

  
  // Guide Icons
  Roller: Roller,
  Skate: Skate,
  Longboard: Longboard,
  
  // Banner Icons
  oferSesh: oferSesh,
  oferSeshRose: oferSeshRose,
  springjam25: springJam,
  
  // Additional Icons
  language: Language,
  favIcon: FavIcon,
  favIconNew: FavIconNew,
  'trash-can': TrashCan,
};

// Preload all icons synchronously at module load (client-side only)
if (typeof window !== 'undefined') {
  // Preload all icons in the background
  Promise.all(
    Object.entries(iconMap).map(async ([name, iconModule]) => {
      try {
        // If it's already a string (URL), fetch it
        if (typeof iconModule === 'string') {
          const response = await fetch(iconModule);
          if (response.ok) {
            const svgText = await response.text();
            iconCache.set(name, svgText);
          }
        } else {
          // For React components, we need to handle differently
          // In Next.js, SVGs are typically imported as URLs
          const iconUrl = (iconModule as any)?.default || iconModule;
          if (typeof iconUrl === 'string') {
            const response = await fetch(iconUrl);
            if (response.ok) {
              const svgText = await response.text();
              iconCache.set(name, svgText);
            }
          }
        }
      } catch {
        // Silently fail - icons will load on demand
      }
    })
  ).catch(() => {
    // Silently fail
  });
}

// Type for icon names - dynamically generated from available SVG files
// You can add more icon names here as you add SVG files
export type IconName =
  | 'search'  | 'searchBold'
  | 'searchClose'
  | 'menu'
  | 'close'
  | 'X'
  | 'cart'
  | 'plantBold'
  | 'cookie'  | 'cookieBold'
  | 'backpack'  | 'backpackBold'
  | 'shopCart'  | 'shopCartBold'
  | 'heart'  | 'heartBold'
  | 'heartLike'
  | 'share'  | 'shareBold'
  | 'location'  | 'locationBold'
  | 'locationOff'  | 'locationOffBold'
  | 'map'  | 'mapBold'
  | 'filter'  | 'filterBold'
  | 'star'
  | 'eye'  | 'eyeBold'
  | 'eyeClosed'  | 'eyeClosedBold'
  | 'edit'  | 'editBold'
  | 'trash'  | 'trashBold'
  | 'checkmark'
  | 'info'  | 'infoBold'
  | 'arrowCircleDown'
  | 'zoomIn'
  | 'zoomOut'
  | 'calendar'  | 'calendarBold'
  | 'gift'  | 'giftBold'
  | 'tag'  | 'tagBold'
  | 'task'  | 'taskBold'
  | 'shop'  | 'shopBold'
  | 'sun'  | 'sunBold'
  | 'moon'
  | 'moonBold'
  | 'googleMaps'  | 'googleMapsBold'
  | 'appleMaps'  | 'appleMapsBold'
  | 'wazeMaps'  | 'wazeBold'
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'messages'
  | 'usaFlag'
  | 'israelFlag'
  | 'scooter'
  | 'parking'
  | 'toilet'
  | 'wrench'  | 'wrenchBold'
  | 'gymWeight'  | 'gymWeightBold'
  | 'account'  | 'accountBold'
  | 'trainers'  | 'trainersBold'
  | 'language'
  | 'logo'
  | 'logo-hostage'
  | 'logo-hostage2'
  | 'logo-hostage3'
  | 'favIcon'
  | 'favIconNew'
  | 'springjam25'
  | 'Skate'
  | 'Longboard'
  | 'Roller'
  | 'Wax'
  | 'bmx-icon'
  | 'safe-house'
  | 'sunset'
  | 'shekel'
  | 'securityGuard'
  | 'helmet'
  | 'hours24'
  | 'lightbulbBold'
  | 'lockBold'
  | 'notesBold'
  | 'ranking'  | 'rankingBold'
  | 'starWand'  | 'starWandBold'
  | 'monitor'  | 'monitorBold'
  | 'maximize'  | 'maximizeBold'
  | 'questionMark'
  | 'link'
  | 'archive'
  | 'featured'
  | 'new'
  | 'sparks' | 'sparksBold'
  | 'searchQuest'
  | 'bulkImage'
  | 'imageBold'
  | 'clockBold'
  | 'closedPark'
  | 'couch'
  | 'nearbyResturants'
  | 'books'
  | 'trees'
  | 'newGoogleMaps'
  | 'newAppleMaps'
  | 'newAppleMapsDark'
  | 'moovit'
  | 'moovitDark'
  | 'wazeDark'
  | 'oferSesh'
  | 'oferSeshRose'
  | 'trash-can'
  | 'umbrellaBold'
  | 'wind'
  | 'cloudy'
  | 'partlyCloudy'
  | 'lightRain'
  | 'rainy'
  | 'snow'
  | 'thunderstorm'
  | 'broom' | 'broomBold'
  | 'settings'  | 'settingsBold'
  | 'admin'  | 'adminBold'
  | 'logout'  | 'logoutBold'
  | 'category'  | 'categoryBold'
  | 'drag'  | 'dragBold'
  | 'global'  | 'globalBold'
  | 'hebrew'  | 'hebrewBold'
  | 'english'  | 'englishBold'
  | 'book'  | 'bookBold'
  | 'accessibility' | 'accessibilityBold'
  | 'terms'  | 'termsBold'
  | 'clock'
  | 'chart' | 'chartBold'
  | 'target' | 'targetBold'
  | 'wrench' | 'wrenchBold'
  | 'objects' | 'objectsBold';
  // Alias for clockBold if needed

interface IconProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'size'> {
  name: IconName;
  className?: string;
  size?: number | string;
}

/**
 * Custom Icon component that loads SVG files directly using static imports
 * Icons are bundled at build time - no async loading needed
 * 
 * @example
 * ```tsx
 * <Icon name="search" className="w-4 h-4 text-gray-500" />
 * <Icon name="cart" size={24} />
 * ```
 */
export const Icon = React.forwardRef<HTMLSpanElement, IconProps>(
  function Icon({ name, className, size, ...props }, ref) {
  const [svgContent, setSvgContent] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    async function loadIcon() {
      // Check cache first (may have been populated by preload)
      const cached = iconCache.get(name);
      if (cached) {
        if (isMounted) {
          setSvgContent(cached);
          setLoading(false);
        }
        return;
      }

      // Get icon from iconMap
      const iconModule = iconMap[name];
      if (!iconModule) {
        if (isMounted) {
          setError(`Icon "${name}" not found`);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Handle different import formats from Next.js
        let iconUrl: string | undefined;
        
        if (typeof iconModule === 'string') {
          iconUrl = iconModule;
        } else {
          // Next.js imports SVGs as objects with a default property
          const moduleDefault = (iconModule as any)?.default || iconModule;
          if (typeof moduleDefault === 'string') {
            iconUrl = moduleDefault;
          } else if (moduleDefault && typeof moduleDefault === 'object') {
            iconUrl = moduleDefault.src || moduleDefault.default;
          }
        }

        if (!iconUrl) {
          throw new Error(`Could not extract URL from icon module: ${name}`);
        }

        // Fetch the SVG content
        const response = await fetch(iconUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch icon: ${name}`);
        }
        
        const svgText = await response.text();

        if (!isMounted) return;

        if (!svgText) {
          throw new Error(`Could not load icon: ${name}`);
        }

        // Cache the icon for future use
        iconCache.set(name, svgText);
        setSvgContent(svgText);
      } catch (err: any) {
        if (!isMounted) return;
        console.error(`Failed to load icon: ${name}`, err);
        setError(`Icon "${name}" not found`);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadIcon();

    return () => {
      isMounted = false;
    };
  }, [name]);

  if (error) {
    console.warn(`Icon "${name}" not found. Please check that the file exists in /components/icons/`);
    return (
      <span
        className={cn('inline-flex items-center justify-center', className)}
        style={size ? { width: size, height: size } : undefined}
        {...props}
      >
        <svg
          className="w-full h-full"
          width={size || 24}
          height={size || 24}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  if (loading || !svgContent) {
    // Return empty/invisible placeholder instead of rectangle
    return (
      <span
        className={cn('inline-flex items-center justify-center', className)}
        style={size ? { width: size, height: size } : undefined}
        {...props}
        aria-hidden="true"
      />
    );
  }

  // Clean and process the SVG content
  let cleanedSvg = svgContent
    // Remove XML declaration
    .replace(/<\?xml[^>]*\?>/gi, '')
    // Extract SVG element
    .match(/<svg[^>]*>([\s\S]*)<\/svg>/i);

  if (!cleanedSvg) {
    return (
      <span
        className={cn('inline-flex items-center justify-center', className)}
        style={size ? { width: size, height: size } : undefined}
        {...props}
      >
        <svg
          className="w-full h-full"
          width={size || 24}
          height={size || 24}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        </svg>
      </span>
    );
  }

  const svgTag = cleanedSvg[0].match(/<svg[^>]*>/i)?.[0] || '<svg>';
  const svgInner = cleanedSvg[1];

  // Extract viewBox
  const viewBoxMatch = svgTag.match(/viewBox=["']([^"']+)["']/i);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';

  // Build new SVG tag with proper attributes
  let newSvgAttrs = svgTag
    .replace(/<svg\s*/, '<svg ')
    .replace(/\s+width=["'][^"']*["']/gi, '')
    .replace(/\s+height=["'][^"']*["']/gi, '')
    .replace(/\s+class=["'][^"']*["']/gi, '')
    .replace(/\s+className=["'][^"']*["']/gi, '')
    .replace(/\s+viewBox=["'][^"']*["']/gi, '');

  // Ensure viewBox is set
  if (!newSvgAttrs.includes('viewBox=')) {
    newSvgAttrs = newSvgAttrs.replace('<svg ', `<svg viewBox="${viewBox}" `);
  }

  // Add className and size
  if (className) {
    newSvgAttrs = newSvgAttrs.replace('<svg ', `<svg class="${className}" `);
  }

  if (size) {
    const sizeValue = typeof size === 'number' ? `${size}` : size;
    newSvgAttrs = newSvgAttrs.replace('<svg ', `<svg width="${sizeValue}" height="${sizeValue}" `);
  }

  // Ensure fill is set for proper currentColor support
  if (!newSvgAttrs.includes('fill=')) {
    newSvgAttrs = newSvgAttrs.replace('<svg ', '<svg fill="none" ');
  }

  const finalSvg = `${newSvgAttrs}${svgInner}</svg>`;

  return (
    <span
      ref={ref}
      className={cn('inline-flex items-center justify-center', className)}
      dangerouslySetInnerHTML={{ __html: finalSvg }}
      style={size && typeof size === 'number' ? { width: size, height: size } : undefined}
      {...props}
    />
  );
  }
);

// Helper to create individual icon components
export function createIconComponent(iconName: IconName) {
  const IconComponent = React.forwardRef<HTMLSpanElement, Omit<IconProps, 'name'>>(
    (props, ref) => <Icon name={iconName} {...props} ref={ref} />
  );
  IconComponent.displayName = `Icon(${iconName})`;
  return IconComponent;
}
