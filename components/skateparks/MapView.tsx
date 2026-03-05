'use client';

import { useEffect, useRef } from 'react';
import { MapParkCard } from './MapParkCard';

interface SkateparkImage {
  url: string;
  order: number;
  publicId?: string;
  isFeatured?: boolean;
}

interface Skatepark {
  _id: string;
  slug: string;
  name: { en: string; he: string } | string;
  address: { en: string; he: string } | string;
  area: 'north' | 'center' | 'south';
  location: { lat: number; lng: number };
  imageUrl: string;
  images?: SkateparkImage[];
  amenities: {
    entryFee: boolean;
    parking: boolean;
    shade: boolean;
    bathroom: boolean;
    helmetRequired: boolean;
    guard: boolean;
    seating: boolean;
    bombShelter: boolean;
    scootersAllowed: boolean;
    bikesAllowed: boolean;
    noWax: boolean;
    nearbyRestaurants: boolean;
  };
  rating: number;
  totalReviews: number;
  is24Hours: boolean;
  isFeatured?: boolean;
  openingYear?: number | null;
  closingYear?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  distance?: number | null;
}

interface UserLocation {
  lat: number;
  lng: number;
}

/**
 * Load Google Maps script (prevents duplicate loading)
 */
const loadGoogleMapsScript = (locale: string = 'en'): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Helper function to check if Map constructor is ready and resolve
    const checkMapReady = () => {
      const google = (window as any).google;
      if (google?.maps?.Map && typeof google.maps.Map === 'function') {
        resolve();
      } else {
        setTimeout(checkMapReady, 50); // Check again in 50ms
      }
    };

    // Check if Google Maps is already loaded
    if ((window as any).google?.maps) {
      // Even if maps exists, we need to wait for Map constructor with loading=async
      checkMapReady();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );
    if (existingScript) {
      // Wait for existing script to load, then check for Map constructor
      existingScript.addEventListener('load', () => {
        checkMapReady();
      });
      existingScript.addEventListener('error', reject);
      return;
    }

    // Load Google Maps script with async/defer attributes
    const script = document.createElement('script');
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    const language = locale === 'he' ? 'he' : 'en';
    const region = locale === 'he' ? 'IL' : undefined;
    
    // Build script URL with loading=async for best practices
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&language=${language}${region ? `&region=${region}` : ''}&loading=async`;
    
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // When using loading=async, we need to wait for the API to be fully initialized
      // Use the same checkMapReady function defined above
      checkMapReady();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

/**
 * Google Maps Component (using script tag for simplicity)
 */
function GoogleMapView({
  skateparks,
  userLocation,
  onMarkerClick,
  locale,
  hasAmenitiesFilter,
  fullscreenContainerRef,
}: {
  skateparks: Skatepark[];
  userLocation: UserLocation | null;
  onMarkerClick: (park: Skatepark | null) => void;
  locale: string;
  hasAmenitiesFilter?: boolean;
  /** Ref to the wrapper that contains both map and MapParkCard; fullscreen will target this so the card stays visible */
  fullscreenContainerRef?: React.RefObject<HTMLElement | null>;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const scriptLoadedRef = useRef(false);
  const themeCleanupRef = useRef<(() => void) | null>(null);
  const zoomListenerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return;

    const initMap = async () => {
      try {
        // Load script if not already loaded
        if (!scriptLoadedRef.current) {
          await loadGoogleMapsScript(locale);
          scriptLoadedRef.current = true;
        }

        const google = (window as any).google;
        if (!google?.maps) {
          console.error('Google Maps failed to load');
          return;
        }

        // Double-check Map constructor is available before using it
        if (!google.maps.Map || typeof google.maps.Map !== 'function') {
          console.error('Google Maps Map constructor is not available');
          return;
        }

        const center = userLocation || { lat: 32.0735802, lng: 34.7880511 }; // Default to Jerusalem

        // Helper function to create custom icon for skatepark marker
        const createSkateparkIcon = (fillColor: string, strokeColor: string, circleColor: string) => {
          const svg = `
            <svg width="44" height="48" viewBox="0 0 44 48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 6c9 0 16 6 16 14 0 5-2.5 9-6 12-2.5 2-6 6-7.5 9-.5 1.5-2.5 1.5-3 0-1.5-3-5-7-7.5-9-3.5-3-6-7-6-12 0-8 7-14 16-14z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>
              <circle cx="23" cy="20.5" r="5.5" fill="${circleColor}"/>
            </svg>
          `;
          return {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
            scaledSize: new google.maps.Size(40, 50),
            anchor: new google.maps.Point(20, 50),
          };
        };

        // Get theme from localStorage (matches app theme system)
        const getCurrentTheme = (): 'light' | 'dark' => {
          if (typeof window === 'undefined') return 'light';
          
          // Check localStorage first
          const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
          if (storedTheme === 'dark' || storedTheme === 'light') {
            return storedTheme;
          }
          
          // Fallback to checking document class
          const hasDarkClass = document.documentElement.classList.contains('dark');
          return hasDarkClass ? 'dark' : 'light';
        };

        const currentTheme = getCurrentTheme();

        // Dark theme styles for Google Maps (without requiring mapId)
        const darkThemeStyles = [
          { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
          {
            featureType: 'administrative.locality',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }],
          },
          {
            featureType: 'poi',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }],
          },
          {
            featureType: 'poi.park',
            elementType: 'geometry',
            stylers: [{ color: '#263c3f' }],
          },
          {
            featureType: 'poi.park',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#6b9a76' }],
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#38414e' }],
          },
          {
            featureType: 'road',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#212a37' }],
          },
          {
            featureType: 'road',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#9ca5b3' }],
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry',
            stylers: [{ color: '#746855' }],
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#1f2835' }],
          },
          {
            featureType: 'road.highway',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#f3d19c' }],
          },
          {
            featureType: 'transit',
            elementType: 'geometry',
            stylers: [{ color: '#2f3948' }],
          },
          {
            featureType: 'transit.station',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }],
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#17263c' }],
          },
          {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#515c6d' }],
          },
          {
            featureType: 'water',
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#17263c' }],
          },
        ];

        // Initialize map with theme-based styles
        const mapOptions: any = {
          center,
          zoom: userLocation ? 12 : 10,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: false, // Use custom control so fullscreen targets wrapper (map + card)
          language: locale === 'he' ? 'he' : 'en',
          region: locale === 'he' ? 'IL' : undefined,

          gestureHandling: 'greedy', //3

          // Only apply dark theme styles if theme is dark
          styles: currentTheme === 'dark' ? darkThemeStyles : [],
        };

        const map = new google.maps.Map(mapRef.current, mapOptions);
        mapInstanceRef.current = map;

        // Custom fullscreen control: fullscreen the wrapper (map + MapParkCard) so the card stays visible
        const containerRef = fullscreenContainerRef;
        const controlDiv = document.createElement('div');
        const controlBtn = document.createElement('button');
        controlBtn.type = 'button';
        controlBtn.title = 'Toggle fullscreen';
        controlBtn.setAttribute('aria-label', 'Toggle fullscreen');
        controlBtn.style.cssText =
          'background-color:#fff;border:0;border-radius:2px;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:pointer;margin:10px;padding:0;width:40px;height:40px;display:flex;align-items:center;justify-content:center;';
        controlBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666666" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
        controlBtn.addEventListener('click', () => {
          const container = containerRef?.current;
          if (!container) return;
          const requestFullscreen =
            container.requestFullscreen ||
            (container as any).webkitRequestFullscreen ||
            (container as any).mozRequestFullScreen ||
            (container as any).msRequestFullscreen;
          const exitFullscreen =
            document.exitFullscreen ||
            (document as any).webkitExitFullscreen ||
            (document as any).mozCancelFullScreen ||
            (document as any).msExitFullscreen;
          const isFullscreen = !!(document.fullscreenElement ?? (document as any).webkitFullscreenElement);
          if (isFullscreen) {
            exitFullscreen?.call(document);
          } else if (requestFullscreen) {
            requestFullscreen.call(container);
          }
        });
        controlDiv.appendChild(controlBtn);
        map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(controlDiv);

        // Track if a marker was clicked
        let markerClicked = false;

        // Prevent clicking on empty map areas - clear selection on map click
        map.addListener('click', () => {
          // Small delay to check if marker click handler fired first
          setTimeout(() => {
            if (!markerClicked) {
              onMarkerClick(null); // Clear selection when clicking empty map area
            }
            markerClicked = false; // Reset flag
          }, 10);
        });

        // Clear existing markers
        markersRef.current.forEach((marker) => {
          if (marker.map) marker.map = null;
        });
        markersRef.current = [];

        // Add park markers with custom pins
        skateparks.forEach((park) => {
          const name = typeof park.name === 'string' ? park.name : park.name.en || park.name.he;
          const position = { lat: park.location.lat, lng: park.location.lng };

          // Determine marker color based on closing year
          const currentYear = new Date().getFullYear();
          const isClosed = park.closingYear && park.closingYear <= currentYear;
          const markerFillColor = isClosed ? '#ef4444' : '#31c438'; // Red for closed parks, green for open
          const markerStrokeColor = isClosed ? '#991b1b' : '#18671c'; // Darker stroke for closed parks
          const markerCircleColor = isClosed ? '#991b1b' : '#18671c'; // Circle color matches stroke

          // Create marker with custom icon
          const marker = new google.maps.Marker({
            position,
            map,
            title: name,
            icon: createSkateparkIcon(markerFillColor, markerStrokeColor, markerCircleColor),
          });

          // Add click listener - show bottom panel
          marker.addListener('click', () => {
            markerClicked = true; // Set flag to prevent map click handler from clearing selection
            onMarkerClick(park);
          });

          markersRef.current.push(marker);
        });

        // Add user location marker
        if (userLocation) {
          const userMarker = new google.maps.Marker({
            position: userLocation,
            map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#4285F4',
              fillOpacity: 1,
              strokeColor: '#104413',
              strokeWeight: 2,
            },
            title: 'Your Location',
          });
          markersRef.current.push(userMarker);
        }

        // Listen for theme changes and update map styles
        const updateMapTheme = () => {
          const newTheme = getCurrentTheme();
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setOptions({
              styles: newTheme === 'dark' ? darkThemeStyles : [],
            });
          }
        };

        // Listen for localStorage changes (theme toggle) - works across tabs
        const handleStorageChange = (e: StorageEvent) => {
          if (e.key === 'theme') {
            updateMapTheme();
          }
        };

        // Listen for class changes on document element (theme toggle) - works in same tab
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
              updateMapTheme();
            }
          });
        });

        // Start observing document element for class changes
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
        });

        // Listen for storage events (cross-tab theme changes)
        window.addEventListener('storage', handleStorageChange);

        // Store cleanup function in ref
        themeCleanupRef.current = () => {
          observer.disconnect();
          window.removeEventListener('storage', handleStorageChange);
        };
      } catch (error) {
        console.error('Error initializing Google Maps:', error);
      }
    };

    initMap();

    // Cleanup function for useEffect
    return () => {
      if (themeCleanupRef.current) {
        themeCleanupRef.current();
        themeCleanupRef.current = null;
      }
    };
  }, [skateparks, userLocation, onMarkerClick, locale, fullscreenContainerRef]);

  // Auto-zoom to fit all visible markers when amenities filtering is active
  useEffect(() => {
    // Only proceed if amenities filter is active and map is ready
    if (!hasAmenitiesFilter || !mapInstanceRef.current || skateparks.length === 0) {
      return;
    }

    const google = (window as any).google;
    if (!google?.maps?.LatLngBounds) return;

    // Create bounds from skateparks locations
    const bounds = new google.maps.LatLngBounds();
    let hasValidBounds = false;

    skateparks.forEach((park) => {
      if (park.location && park.location.lat && park.location.lng) {
        bounds.extend(new google.maps.LatLng(park.location.lat, park.location.lng));
        hasValidBounds = true;
      }
    });

    // Fit bounds with padding if we have valid locations
    if (hasValidBounds) {
      // Remove previous zoom listener if it exists
      if (zoomListenerRef.current) {
        google.maps.event.removeListener(zoomListenerRef.current);
        zoomListenerRef.current = null;
      }

      mapInstanceRef.current.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50,
      });

      // Listen for bounds_changed event to check and cap zoom level at 6
      zoomListenerRef.current = google.maps.event.addListener(
        mapInstanceRef.current,
        'bounds_changed',
        () => {
          const currentZoom = mapInstanceRef.current.getZoom();
          if (currentZoom && currentZoom > 10) {
            mapInstanceRef.current.setZoom(10);
          }
          // Remove listener after adjusting zoom (one-time check)
          if (zoomListenerRef.current) {
            google.maps.event.removeListener(zoomListenerRef.current);
            zoomListenerRef.current = null;
          }
        }
      );
    }

    // Cleanup listener on unmount or when dependencies change
    return () => {
      if (zoomListenerRef.current) {
        const google = (window as any).google;
        if (google?.maps?.event) {
          google.maps.event.removeListener(zoomListenerRef.current);
        }
        zoomListenerRef.current = null;
      }
    };
  }, [skateparks, hasAmenitiesFilter]);

  return <div ref={mapRef} className="w-full h-full min-h-[600px]" />;
}

interface MapViewProps {
  skateparks: Skatepark[];
  userLocation: UserLocation | null;
  selectedPark: Skatepark | null;
  onParkSelect: (park: Skatepark | null) => void;
  locale: string;
  hasAmenitiesFilter: boolean;
  mapContainerRef?: React.RefObject<HTMLElement | null>;
  tr: (enText: string, heText: string) => string;
}

/**
 * Map View Component
 * Displays skateparks on a Google Map with controls and park detail panel
 */
export function MapView({
  skateparks,
  userLocation,
  selectedPark,
  onParkSelect,
  locale,
  hasAmenitiesFilter,
  mapContainerRef,
  tr,
}: MapViewProps) {
  const fullscreenWrapperRef = useRef<HTMLDivElement>(null);

  return (
    <section 
      aria-label={tr('Skatepark map', 'מפת פארקים')}
      className="relative h-[calc(100vh-280px)] min-h-[600px]" 
      ref={mapContainerRef}
    >
      {/* Shared parent: relative + h-full so MapParkCard anchors to map container; fullscreened by custom control so card stays visible */}
      <div ref={fullscreenWrapperRef} className="relative h-full">
        <div className="h-full rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-xl">
          <GoogleMapView
            skateparks={skateparks}
            userLocation={userLocation}
            onMarkerClick={onParkSelect}
            locale={locale}
            hasAmenitiesFilter={hasAmenitiesFilter}
            fullscreenContainerRef={fullscreenWrapperRef}
          />
        </div>
        {/* Selected Park Detail Panel - inside map container so it stays visible in fullscreen */}
        {selectedPark && (
          <MapParkCard
            park={selectedPark}
            locale={locale}
            onClose={() => onParkSelect(null)}
          />
        )}
      </div>

      {/* Map Controls Overlay - Top Right
      <div className="w-1/4 absolute top-[11px] right-[54px] sm:right-[80px] z-30 flex flex-col gap-2">
        {/* Parks Count Badge */}
        {/* <div className="px-2 py-[6px] bg-white rounded-[2px] shadow-md">
          <span className="text-lg  text-[#565656]">
            {skateparks.length} {tr('parks shown', 'פארקים מוצגים')}
          </span>
        </div>
      </div> */}
    </section>
  );
}

