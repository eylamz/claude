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

/**
 * Utility function to check if trainers feature is enabled
 * Uses NEXT_PUBLIC_ENABLE_TRAINERS environment variable
 * Defaults to true if not set (backward compatibility)
 */
export function isTrainersEnabled(): boolean {
  if (typeof window === 'undefined') {
    // Server-side: use process.env
    const envValue = process.env.NEXT_PUBLIC_ENABLE_TRAINERS;
    return envValue !== 'false';
  } else {
    // Client-side: use window.env or process.env
    const envValue = process.env.NEXT_PUBLIC_ENABLE_TRAINERS;
    return envValue !== 'false';
  }
}

/**
 * Utility function to check if registration is enabled
 * Uses NEXT_PUBLIC_ENABLE_REGISTER environment variable
 * Defaults to true if not set (backward compatibility)
 */
export function isRegisterEnabled(): boolean {
  if (typeof window === 'undefined') {
    // Server-side: use process.env
    const envValue = process.env.NEXT_PUBLIC_ENABLE_REGISTER;
    return envValue !== 'false';
  } else {
    // Client-side: use window.env or process.env
    const envValue = process.env.NEXT_PUBLIC_ENABLE_REGISTER;
    return envValue !== 'false';
  }
}

/**
 * Utility function to check if login is enabled
 * Uses NEXT_PUBLIC_ENABLE_LOGIN environment variable
 * Defaults to true if not set (backward compatibility)
 */
export function isLoginEnabled(): boolean {
  if (typeof window === 'undefined') {
    // Server-side: use process.env
    const envValue = process.env.NEXT_PUBLIC_ENABLE_LOGIN;
    return envValue !== 'false';
  } else {
    // Client-side: use window.env or process.env
    const envValue = process.env.NEXT_PUBLIC_ENABLE_LOGIN;
    return envValue !== 'false';
  }
}/**
 * Utility function to check if Growth Lab feature is enabled
 * Uses NEXT_PUBLIC_ENABLE_GROWTH_LAB environment variable
 * Defaults to true if not set (backward compatibility)
 */
export function isGrowthLabEnabled(): boolean {
  if (typeof window === 'undefined') {
    // Server-side: use process.env
    const envValue = process.env.NEXT_PUBLIC_ENABLE_GROWTH_LAB;
    return envValue !== 'false';
  } else {
    // Client-side: use window.env or process.env
    const envValue = process.env.NEXT_PUBLIC_ENABLE_GROWTH_LAB;
    return envValue !== 'false';
  }
}/**
 * Utility function to check if Community feature is enabled
 * Uses NEXT_PUBLIC_ENABLE_COMMUNITY environment variable
 * Defaults to true if not set (backward compatibility)
 */
export function isCommunityEnabled(): boolean {
  if (typeof window === 'undefined') {
    // Server-side: use process.env
    const envValue = process.env.NEXT_PUBLIC_ENABLE_COMMUNITY;
    return envValue !== 'false';
  } else {
    // Client-side: use window.env or process.env
    const envValue = process.env.NEXT_PUBLIC_ENABLE_COMMUNITY;
    return envValue !== 'false';
  }
}

/**
 * Utility function to check if newsletter (and footer) is enabled.
 * Uses NEXT_PUBLIC_ENABLE_NEWSLETTER environment variable.
 * Footer is shown only when this is explicitly "true".
 */
export function isNewsletterEnabled(): boolean {
  const envValue = process.env.NEXT_PUBLIC_ENABLE_NEWSLETTER;
  return envValue === 'true';
}