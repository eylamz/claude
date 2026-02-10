/**
 * Format confirmation number with a dash every 3 digits (e.g. 847291 → 847-291).
 * Non-all-digit values are returned as-is.
 */
export function formatConfirmationNumber(value: string | null | undefined): string {
  if (value == null || value === '') return '';
  if (/^\d+$/.test(value)) {
    return value.replace(/(\d{3})(?=\d)/g, '$1-');
  }
  return value;
}
