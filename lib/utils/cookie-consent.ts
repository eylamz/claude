/**
 * Cookie Consent Management
 * Handles storing and retrieving user cookie preferences
 */

export type CookieCategory = 'essential' | 'analytics' | 'functional';

export interface CookiePreferences {
  essential: boolean; // Always true, cannot be disabled
  analytics: boolean;
  functional: boolean;
  timestamp: number; // When consent was given/updated
}

const CONSENT_COOKIE_NAME = 'cookie_consent';
const CONSENT_STORAGE_KEY = 'cookie_preferences';

/**
 * Get cookie consent preferences from localStorage
 */
export function getCookiePreferences(): CookiePreferences | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;

    const preferences = JSON.parse(stored) as CookiePreferences;
    return preferences;
  } catch (error) {
    console.error('Error reading cookie preferences:', error);
    return null;
  }
}

/**
 * Set cookie consent preferences
 */
export function setCookiePreferences(preferences: Partial<CookiePreferences>): void {
  if (typeof window === 'undefined') return;

  try {
    const existing = getCookiePreferences();
    const newPreferences: CookiePreferences = {
      essential: true, // Always true
      analytics: preferences.analytics ?? existing?.analytics ?? false,
      functional: preferences.functional ?? existing?.functional ?? false,
      timestamp: Date.now(),
    };

    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(newPreferences));
    
    // Also set a cookie for server-side access (if needed)
    const cookieValue = JSON.stringify(newPreferences);
    const maxAge = 365 * 24 * 60 * 60; // 1 year
    document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(cookieValue)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch (error) {
    console.error('Error saving cookie preferences:', error);
  }
}

/**
 * Check if user has given consent for a specific category
 */
export function hasConsent(category: CookieCategory): boolean {
  if (category === 'essential') return true; // Essential cookies are always allowed

  const preferences = getCookiePreferences();
  if (!preferences) return false;

  return preferences[category] === true;
}

/**
 * Check if user has given any consent (banner should not show)
 */
export function hasGivenConsent(): boolean {
  const preferences = getCookiePreferences();
  return preferences !== null;
}

/**
 * Accept all cookies
 */
export function acceptAllCookies(): void {
  setCookiePreferences({
    essential: true,
    analytics: true,
    functional: true,
  });
}

/**
 * Reject all non-essential cookies
 */
export function rejectNonEssentialCookies(): void {
  setCookiePreferences({
    essential: true,
    analytics: false,
    functional: false,
  });
}

/**
 * Clear all cookie preferences (for testing/debugging)
 */
export function clearCookiePreferences(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(CONSENT_STORAGE_KEY);
  document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}
