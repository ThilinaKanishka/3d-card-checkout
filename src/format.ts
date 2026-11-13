/**
 * Pure string helpers that sanitise and format the checkout inputs.
 */

/** Strips every non-digit character. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Splits a string into consecutive chunks of the given sizes (extra characters are dropped). */
function chunk(value: string, groups: readonly number[]): string[] {
  const parts: string[] = [];
  let index = 0;
  for (const size of groups) {
    if (index >= value.length) break;
    parts.push(value.slice(index, index + size));
    index += size;
  }
  return parts;
}

/**
 * Formats card digits for the input field, e.g. "4242424242424242" → "4242 4242 4242 4242".
 *
 * @param digits Digits only, already trimmed to the brand's max length.
 * @param groups Digit grouping for the detected brand.
 */
export function formatCardNumber(digits: string, groups: readonly number[]): string {
  return chunk(digits, groups).join(' ');
}

/**
 * Formats card digits for the card preview, padding unfilled positions with "#",
 * e.g. "4242 42" → "4242 42## #### ####".
 */
export function formatCardNumberPreview(digits: string, groups: readonly number[]): string {
  const total = groups.reduce((sum, size) => sum + size, 0);
  return chunk(digits.padEnd(total, '#'), groups).join(' ');
}

/**
 * Finds the caret position in a formatted string that sits just after the
 * `digitIndex`-th digit. Used to keep the caret stable while re-formatting.
 */
export function caretFromDigitIndex(formatted: string, digitIndex: number): number {
  if (digitIndex <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted.charAt(i))) seen++;
    if (seen === digitIndex) return i + 1;
  }
  return formatted.length;
}

/**
 * Keeps only letters and single spaces, with no leading space.
 * "  john  o'neil3" → "john oneil"
 */
export function sanitizeHolder(value: string): string {
  return value
    .replace(/[^A-Za-z ]/g, '')
    .replace(/ {2,}/g, ' ')
    .replace(/^ /, '');
}

/**
 * Formats an expiry date as "MM/YY", auto-inserting the slash.
 *
 * - A leading 2–9 can only be a one-digit month, so it is zero-padded ("5" → "05/").
 * - Typing "1/" is treated as "01/".
 * - While deleting, the trailing slash is not re-added so backspace works naturally.
 *
 * @param raw        Current raw input value.
 * @param isDeleting True when the input event was a deletion.
 */
export function formatExpiry(raw: string, isDeleting = false): string {
  let digits = digitsOnly(raw).slice(0, 4);

  if (/^[2-9]/.test(digits) || /^1\/$/.test(raw.trim())) {
    digits = `0${digits}`.slice(0, 4);
  }

  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  if (digits.length === 2 && !isDeleting) return `${digits}/`;
  return digits;
}
