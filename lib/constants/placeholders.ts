/**
 * Inline placeholder images (data URLs) to avoid repeated HTTP requests
 * when many components use the same fallback on the same page.
 */

/** Data URL for a neutral gray placeholder (1x1, stretches to fill). No network request. */
export const PLACEHOLDER_SKATEPARK_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1"><rect width="1" height="1" fill="#e5e7eb"/></svg>'
  );
