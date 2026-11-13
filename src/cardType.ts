/**
 * Card brand detection and per-brand metadata.
 */

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'unknown';

export interface CardTypeInfo {
  brand: CardBrand;
  /** Human-readable brand name. */
  label: string;
  /** Total number of digits in a complete card number. */
  length: number;
  /** Digit grouping used when displaying the number. */
  groups: readonly number[];
  /** Number of digits in the security code. */
  cvvLength: number;
}

const CARD_TYPES: Record<CardBrand, CardTypeInfo> = {
  visa: { brand: 'visa', label: 'Visa', length: 16, groups: [4, 4, 4, 4], cvvLength: 3 },
  mastercard: { brand: 'mastercard', label: 'Mastercard', length: 16, groups: [4, 4, 4, 4], cvvLength: 3 },
  amex: { brand: 'amex', label: 'American Express', length: 15, groups: [4, 6, 5], cvvLength: 4 },
  unknown: { brand: 'unknown', label: 'Card', length: 16, groups: [4, 4, 4, 4], cvvLength: 3 },
};

/**
 * Detects the card brand from the leading digits of a card number.
 *
 * - Visa:       starts with 4
 * - Mastercard: 51–55, or 2221–2720
 * - Amex:       34 or 37
 *
 * @param digits Card number containing digits only (may be partial).
 */
export function detectCardType(digits: string): CardBrand {
  if (digits.startsWith('4')) return 'visa';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^5[1-5]/.test(digits)) return 'mastercard';

  // The 2-series Mastercard range needs four digits to be unambiguous.
  if (digits.length >= 4) {
    const prefix = Number(digits.slice(0, 4));
    if (prefix >= 2221 && prefix <= 2720) return 'mastercard';
  }

  return 'unknown';
}

/** Returns the metadata (length, grouping, CVV length…) for a brand. */
export function getCardTypeInfo(brand: CardBrand): CardTypeInfo {
  return CARD_TYPES[brand];
}
