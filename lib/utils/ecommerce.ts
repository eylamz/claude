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
}
