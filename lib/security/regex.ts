/**
 * Escape a string for safe use in MongoDB $regex (and JavaScript RegExp).
 * Prevents ReDoS and regex injection when search/filter comes from user input.
 * Use this for any $regex: search (or new RegExp(search)) where search is user-controlled.
 */
export function escapeRegexForMongo(str: string): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
