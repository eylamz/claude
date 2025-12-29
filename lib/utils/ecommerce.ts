/**
 * Utility function to check if ecommerce is enabled
 * Uses NEXT_PUBLIC_ENABLE_ECOMMERCE environment variable
 * Defaults to true if not set (backward compatibility)
 */
export function isEcommerceEnabled(): boolean {
  if (typeof window === 'undefined') {
    // Server-side: use process.env
    const envValue = process.env.NEXT_PUBLIC_ENABLE_ECOMMERCE;
    return envValue !== 'false';
  } else {
    // Client-side: use window.env or process.env
    const envValue = process.env.NEXT_PUBLIC_ENABLE_ECOMMERCE;
    return envValue !== 'false';
  }
}

