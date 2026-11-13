/**
 * Brand name badges shown on the card. These are styled text only —
 * no official logos or artwork are reproduced.
 */

import type { CardBrand } from './cardType';

const BADGES: Record<CardBrand, string> = {
  visa: '<span class="brand-badge brand-visa">VISA</span>',
  mastercard: '<span class="brand-badge brand-mastercard">MASTERCARD</span>',
  amex: '<span class="brand-badge brand-amex">AMEX</span>',
  unknown: '',
};

/** Returns the badge markup for a brand (empty for unknown brands). */
export function getBrandBadge(brand: CardBrand): string {
  return BADGES[brand];
}
