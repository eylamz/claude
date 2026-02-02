/**
 * Israeli Standard Keyboard (SI 1452) mapping: QWERTY key positions
 * map to Hebrew on the same physical keys. Used for "language-agnostic" search
 * so typing with the wrong layout (e.g. "zfrui" instead of "זכרון") still finds results.
 */

/** QWERTY character -> Hebrew character on same physical key (Level 1 / unshifted Hebrew layout). */
const QWERTY_TO_HEBREW: Record<string, string> = {
  // Row 2 (number row - only letter-like mappings; numbers/symbols left as-is for search)
  // Row 3 (QWERTY letter row)
  q: '/',
  w: "'",
  e: 'ק',
  r: 'ר',
  t: 'א',
  y: 'ט',
  u: 'ו',
  i: 'ן',
  o: 'ם',
  p: 'פ',
  '[': '[',
  ']': ']',
  '\\': '\\',
  // Row 4
  a: 'ש',
  s: 'ד',
  d: 'ג',
  f: 'כ',
  g: 'ע',
  h: 'י',
  j: 'ח',
  k: 'ל',
  l: 'ך',
  ';': 'ף',
  "'": ',',
  // Row 5
  z: 'ז',
  x: 'ס',
  c: 'ב',
  v: 'ה',
  b: 'נ',
  n: 'מ',
  m: 'צ',
  ',': 'ת',
  '.': 'ץ',
  '/': '.',
};

/** Hebrew -> QWERTY (inverse of QWERTY_TO_HEBREW). Built once. */
const HEBREW_TO_QWERTY: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [en, he] of Object.entries(QWERTY_TO_HEBREW)) {
    if (en !== he) out[he] = en;
  }
  // Apostrophe key in English produces comma in Hebrew; comma key produces ת
  out[','] = "'";
  out['ת'] = ',';
  out['.'] = '/';
  out['ץ'] = '.';
  return out;
})();

/**
 * Maps text between QWERTY and Hebrew by keyboard position (Israeli standard layout).
 * - English letters/symbols -> same-key Hebrew (e.g. 'e' -> 'ק', 't' -> 'א').
 * - Hebrew letters/symbols -> same-key English (e.g. 'ק' -> 'e', 'א' -> 't').
 * Characters not in the mapping are left unchanged.
 */
export function flipLanguage(text: string): string {
  if (!text) return text;
  const result: string[] = [];
  for (const char of text) {
    const lower = char.toLowerCase();
    if (QWERTY_TO_HEBREW[lower] !== undefined) {
      result.push(QWERTY_TO_HEBREW[lower]);
    } else if (HEBREW_TO_QWERTY[char] !== undefined) {
      result.push(HEBREW_TO_QWERTY[char]);
    } else {
      result.push(char);
    }
  }
  return result.join('');
}
