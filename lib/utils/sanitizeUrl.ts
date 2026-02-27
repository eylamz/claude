const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * Sanitize a potentially user-controlled URL before using it in href/src.
 *
 * - Allows http/https, mailto, tel, and relative URLs (/path, #hash).
 * - Rejects javascript:, data:, vbscript:, and malformed URLs.
 *
 * Returns the original URL string when safe, or null when it should not be used.
 */
export function sanitizeUrl(rawUrl: string | undefined | null): string | null {
  if (!rawUrl) return null;

  const url = rawUrl.trim();
  if (!url) return null;

  // Allow same-origin relative links and hash links
  if (url.startsWith('/') || url.startsWith('#')) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (!SAFE_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }
    return url;
  } catch {
    // If parsing fails, treat as unsafe
    return null;
  }
}

