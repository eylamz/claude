/**
 * Sanitize SVG markup before injecting with dangerouslySetInnerHTML.
 * Mitigates SVG injection / XSS if SVG content comes from a compromised source
 * (e.g. fetched from Cloudinary or other external storage).
 *
 * - Removes <script> and inline event handlers (onclick, onload, etc.)
 * - Removes javascript: / data: in href and xlink:href (except data:image for safe use)
 * - Removes dangerous elements: iframe, object, embed
 */
export function sanitizeSvg(svg: string): string {
  if (!svg || typeof svg !== 'string') return '';

  let out = svg;

  // Remove <script>...</script> and <script ...>...</script>
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');

  // Remove event handler attributes (onclick, onload, onerror, onmouseover, etc.)
  out = out.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  out = out.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');

  // Remove javascript: and vbscript: in href (e.g. <a href="javascript:...">)
  out = out.replace(/\bhref\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href=""');
  out = out.replace(/\bhref\s*=\s*["']\s*vbscript:[^"']*["']/gi, 'href=""');
  out = out.replace(/\bhref\s*=\s*["']\s*data:[^"']*["']/gi, 'href=""');

  // xlink:href (SVG 1.1) - same treatment
  out = out.replace(/\bxlink:href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'xlink:href=""');
  out = out.replace(/\bxlink:href\s*=\s*["']\s*vbscript:[^"']*["']/gi, 'xlink:href=""');
  out = out.replace(/\bxlink:href\s*=\s*["']\s*data:[^"']*["']/gi, 'xlink:href=""');

  // Remove dangerous elements (iframe, object, embed) and their contents
  out = out.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, '');
  out = out.replace(/<object\b[^>]*>[\s\S]*?<\/object\s*>/gi, '');
  out = out.replace(/<embed\b[^>]*\s*\/?>/gi, '');

  return out;
}
