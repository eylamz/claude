// Google Analytics 4 implementation

import { hasConsent } from '@/lib/utils/cookie-consent';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
const DEBUG = process.env.NODE_ENV === 'development';

// Initialize GA4
export function initializeGA() {
  if (typeof window === 'undefined' || !GA_MEASUREMENT_ID) return;

  // Check if user has consented to analytics cookies
  if (!hasConsent('analytics')) {
    if (DEBUG) {
      console.log('[GA4] Analytics disabled - user has not consented to analytics cookies');
    }
    return;
  }

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };

  // Load GA4 script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Configure
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false, // We'll manually track page views
    debug_mode: DEBUG,
  });

  if (DEBUG) {
    console.log('[GA4] Initialized', GA_MEASUREMENT_ID);
  }
}

// Page view tracking
export function pageview(url: string, title?: string) {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;
  if (!hasConsent('analytics')) return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: url,
    page_title: title,
  });

  if (DEBUG) {
    console.log('[GA4] Pageview', { url, title });
  }
}

// Base event tracking
export function trackEvent(eventName: string, parameters?: Record<string, any>) {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;
  if (!hasConsent('analytics')) return;

  window.gtag('event', eventName, {
    ...parameters,
    debug_mode: DEBUG,
  });

  if (DEBUG) {
    console.log('[GA4] Event', eventName, parameters);
  }
}

// E-commerce Events

export interface Product {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_brand?: string;
  price?: number;
  quantity?: number;
  currency?: string;
}

export function trackAddToCart(product: Product, value?: number) {
  trackEvent('add_to_cart', {
    currency: product.currency || 'ILS',
    value: value || product.price || 0,
    items: [product],
  });
}

export function trackRemoveFromCart(product: Product, value?: number) {
  trackEvent('remove_from_cart', {
    currency: product.currency || 'ILS',
    value: value || product.price || 0,
    items: [product],
  });
}

export function trackBeginCheckout(items: Product[], value: number, currency = 'ILS') {
  trackEvent('begin_checkout', {
    currency,
    value,
    items,
  });
}

export function trackPurchase(transactionId: string, items: Product[], value: number, tax?: number, shipping?: number, currency = 'ILS') {
  trackEvent('purchase', {
    transaction_id: transactionId,
    currency,
    value,
    ...(tax !== undefined && { tax }),
    ...(shipping !== undefined && { shipping }),
    items,
  });
}

export function trackViewItem(product: Product, value?: number) {
  trackEvent('view_item', {
    currency: product.currency || 'ILS',
    value: value || product.price || 0,
    items: [product],
  });
}

// Enhanced E-commerce

export function trackProductImpression(products: Product[], listName?: string) {
  trackEvent('view_item_list', {
    item_list_name: listName || 'Products',
    items: products,
  });
}

export function trackProductClick(product: Product, listName?: string, index?: number) {
  trackEvent('select_item', {
    item_list_name: listName || 'Products',
    item_list_id: listName || 'products',
    items: [{
      ...product,
      index: index || 0,
    }],
  });
}

export function trackCartValue(value: number, currency = 'ILS', itemCount?: number) {
  trackEvent('cart_value', {
    currency,
    value,
    ...(itemCount !== undefined && { item_count: itemCount }),
  });
}

export function trackCheckoutStep(step: number, stepName?: string, value?: number, currency = 'ILS') {
  trackEvent('checkout_progress', {
    checkout_step: step,
    checkout_option: stepName || `Step ${step}`,
    ...(value !== undefined && { currency, value }),
  });
}

// Standard Events

export function trackSearch(searchTerm: string, resultsCount?: number) {
  trackEvent('search', {
    search_term: searchTerm,
    ...(resultsCount !== undefined && { results_count: resultsCount }),
  });
}

export function trackSignUp(method?: string) {
  trackEvent('sign_up', {
    method: method || 'email',
  });
}

export function trackShare(contentType: string, contentId?: string, method?: string) {
  trackEvent('share', {
    content_type: contentType,
    ...(contentId && { content_id: contentId }),
    method: method || 'unknown',
  });
}

// Custom Events

export function trackWishlistAdd(productId: string, productName: string, price?: number) {
  trackEvent('add_to_wishlist', {
    currency: 'ILS',
    value: price || 0,
    items: [{
      item_id: productId,
      item_name: productName,
    }],
  });
}

export function trackWishlistRemove(productId: string) {
  trackEvent('remove_from_wishlist', {
    items: [{
      item_id: productId,
    }],
  });
}

export function trackReviewSubmit(
  contentType: 'product' | 'skatepark' | 'event' | 'guide',
  contentId: string,
  rating: number,
  hasComment: boolean
) {
  trackEvent('review_submit', {
    content_type: contentType,
    content_id: contentId,
    rating,
    has_comment: hasComment,
  });
}

export function trackEventSignup(eventId: string, eventName: string, isFree: boolean) {
  trackEvent('event_signup', {
    event_id: eventId,
    event_name: eventName,
    is_free: isFree,
  });
}

export function trackParkVisitIntent(parkId: string, parkName: string, navigationApp?: string) {
  trackEvent('park_visit_intent', {
    park_id: parkId,
    park_name: parkName,
    ...(navigationApp && { navigation_app: navigationApp }),
  });
}

// Custom Dimensions Helpers

export function setUserProperty(propertyName: string, value: string | number | boolean) {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag('set', 'user_properties', {
    [propertyName]: value,
  });

  if (DEBUG) {
    console.log('[GA4] User Property', propertyName, value);
  }
}

export function setCustomDimension(name: string, value: string) {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    custom_map: {
      [name]: value,
    },
  });
}

// User ID tracking (when user is logged in)
export function setUserId(userId: string) {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    user_id: userId,
  });

  if (DEBUG) {
    console.log('[GA4] User ID Set', userId);
  }
}

export function clearUserId() {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    user_id: null,
  });

  if (DEBUG) {
    console.log('[GA4] User ID Cleared');
  }
}


