/**
 * Inline brand marks rendered on the card. Simple shapes and text only —
 * no official artwork is bundled.
 */

import type { CardBrand } from './cardType';

const LOGOS: Record<CardBrand, string> = {
  visa: '<span class="logo-visa" aria-label="Visa">VISA</span>',
  mastercard: `
    <svg class="logo-mastercard" viewBox="0 0 48 30" aria-label="Mastercard" role="img">
      <circle cx="17" cy="15" r="13" fill="#eb001b" />
      <circle cx="31" cy="15" r="13" fill="#f79e1b" fill-opacity="0.9" />
      <path d="M24 4.1a13 13 0 0 1 0 21.8a13 13 0 0 1 0-21.8z" fill="#ff5f00" />
    </svg>`,
  amex: '<span class="logo-amex" aria-label="American Express">AMEX</span>',
  unknown: '',
};

/** Returns the HTML markup for a brand's logo (empty for unknown brands). */
export function getBrandLogo(brand: CardBrand): string {
  return LOGOS[brand];
}
