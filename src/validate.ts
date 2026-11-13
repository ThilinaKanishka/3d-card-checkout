/**
 * Field validators. Each returns an error message, or `null` when the value is valid.
 */

import type { CardTypeInfo } from './cardType';
import { getPasswordStrength } from './passwordStrength';

export type ValidationResult = string | null;

/**
 * Luhn (mod 10) checksum: double every second digit from the right,
 * subtract 9 from results over 9, and check the total is divisible by 10.
 */
export function luhnCheck(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;

  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits.charAt(i));
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Card number must be complete for its brand and pass the Luhn check. */
export function validateCardNumber(digits: string, info: CardTypeInfo): ValidationResult {
  if (digits.length === 0) return 'Card number is required.';
  if (digits.length < info.length) return `${info.label} numbers have ${info.length} digits.`;
  if (!luhnCheck(digits)) return 'This card number is not valid.';
  return null;
}

/** Card holder must contain at least a couple of letters. */
export function validateHolder(name: string): ValidationResult {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'Card holder name is required.';
  if (trimmed.replace(/ /g, '').length < 2) return 'Enter the name as shown on the card.';
  return null;
}

/**
 * Expiry must be "MM/YY" with a month of 01–12, and not in the past.
 * A card is valid through the last day of its expiry month.
 *
 * @param value "MM/YY" string.
 * @param now   Reference date (injectable for testing).
 */
export function validateExpiry(value: string, now: Date = new Date()): ValidationResult {
  if (value.length === 0) return 'Expiry date is required.';

  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return 'Use the format MM/YY.';

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return 'Month must be between 01 and 12.';

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return 'This card has expired.';
  }
  if (year > currentYear + 20) return 'Expiry date is too far in the future.';

  return null;
}

/** CVV must be exactly the brand's security-code length. */
export function validateCvv(cvv: string, info: CardTypeInfo): ValidationResult {
  if (cvv.length === 0) return 'CVV is required.';
  if (cvv.length !== info.cvvLength) return `CVV must be ${info.cvvLength} digits.`;
  return null;
}

// ───────────────────────── Account fields ─────────────────────────

/** Basic shape check: something@domain.tld */
export function validateEmail(email: string): ValidationResult {
  const value = email.trim();
  if (value.length === 0) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return 'Enter a valid email address.';
  return null;
}

/** Full name must contain at least two letters. */
export function validateFullName(name: string): ValidationResult {
  const value = name.trim();
  if (value.length === 0) return 'Full name is required.';
  if (value.replace(/[^\p{L}]/gu, '').length < 2) return 'Enter your full name.';
  return null;
}

/** New passwords need 8+ characters and a "strong" score (3 of the 4 checks). */
export function validateNewPassword(password: string): ValidationResult {
  if (password.length === 0) return 'Password is required.';
  if (password.length < 8) return 'Use at least 8 characters.';
  if (getPasswordStrength(password).level < 3) return 'Add an uppercase letter, number or symbol.';
  return null;
}

/** Confirmation must match the password exactly. */
export function validatePasswordConfirm(password: string, confirm: string): ValidationResult {
  if (confirm.length === 0) return 'Please confirm your password.';
  if (confirm !== password) return 'Passwords do not match.';
  return null;
}
