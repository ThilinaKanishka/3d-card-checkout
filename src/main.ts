/**
 * Wires the checkout form to the live 3D card preview.
 */

import './style.css';
import { detectCardType, getCardTypeInfo } from './cardType';
import type { CardBrand, CardTypeInfo } from './cardType';
import {
  caretFromDigitIndex,
  digitsOnly,
  formatCardNumber,
  formatCardNumberPreview,
  formatExpiry,
  sanitizeHolder,
} from './format';
import { validateCardNumber, validateCvv, validateExpiry, validateHolder } from './validate';
import type { ValidationResult } from './validate';
import { getBrandLogo } from './logos';

type FieldName = 'number' | 'holder' | 'expiry' | 'cvv';

/** Looks up an element by id, failing loudly if the markup is out of sync. */
function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

// ───────────────────────── Element references ─────────────────────────

const form = getEl<HTMLFormElement>('payment-form');
const payButton = getEl<HTMLButtonElement>('pay-button');
const paySpinner = getEl<HTMLSpanElement>('pay-spinner');
const payLabel = getEl<HTMLSpanElement>('pay-label');
const brandBadge = getEl<HTMLSpanElement>('card-brand-badge');
const successPanel = getEl<HTMLDivElement>('success-panel');
const successMessage = getEl<HTMLParagraphElement>('success-message');
const resetButton = getEl<HTMLButtonElement>('reset-button');

const card = getEl<HTMLDivElement>('card');
const cardBrandFront = getEl<HTMLDivElement>('card-brand-front');
const cardBrandBack = getEl<HTMLDivElement>('card-brand-back');
const cardNumberDisplay = getEl<HTMLSpanElement>('card-number-display');
const cardHolderDisplay = getEl<HTMLSpanElement>('card-holder-display');
const cardExpiryDisplay = getEl<HTMLSpanElement>('card-expiry-display');
const cardCvvDisplay = getEl<HTMLSpanElement>('card-cvv-display');

/** Inputs, error slots and (optional) card highlight region for each field. */
const fields: Record<FieldName, { input: HTMLInputElement; error: HTMLElement; region: HTMLElement | null }> = {
  number: {
    input: getEl('card-number'),
    error: getEl('card-number-error'),
    region: getEl('card-region-number'),
  },
  holder: {
    input: getEl('card-holder'),
    error: getEl('card-holder-error'),
    region: getEl('card-region-holder'),
  },
  expiry: {
    input: getEl('card-expiry'),
    error: getEl('card-expiry-error'),
    region: getEl('card-region-expiry'),
  },
  cvv: {
    input: getEl('card-cvv'),
    error: getEl('card-cvv-error'),
    region: null, // CVV lives on the back; focusing it flips the card instead.
  },
};

const FIELD_NAMES = Object.keys(fields) as FieldName[];

// ───────────────────────── State ─────────────────────────

/** Fields the user has left at least once; errors are only shown for these (or complete fields). */
const touched = new Set<FieldName>();

let currentBrand: CardBrand = 'unknown';

function cardInfo(): CardTypeInfo {
  return getCardTypeInfo(currentBrand);
}

// ───────────────────────── Validation ─────────────────────────

/** Runs every validator against the current input values. */
function validateAll(): Record<FieldName, ValidationResult> {
  const info = cardInfo();
  return {
    number: validateCardNumber(digitsOnly(fields.number.input.value), info),
    holder: validateHolder(fields.holder.input.value),
    expiry: validateExpiry(fields.expiry.input.value),
    cvv: validateCvv(fields.cvv.input.value, info),
  };
}

/**
 * A field is "complete" once it has reached its full length — at that point
 * it is worth telling the user about problems even before they leave it.
 */
function isComplete(name: FieldName): boolean {
  const value = fields[name].input.value;
  switch (name) {
    case 'number':
      return digitsOnly(value).length >= cardInfo().length;
    case 'expiry':
      return value.length === 5;
    case 'cvv':
      return value.length >= cardInfo().cvvLength;
    case 'holder':
      return false;
  }
}

/** Renders inline errors and toggles the Pay button. */
function renderValidation(): void {
  const results = validateAll();

  for (const name of FIELD_NAMES) {
    const { input, error } = fields[name];
    const message = results[name];
    const show = message !== null && (touched.has(name) || isComplete(name));

    error.textContent = show ? message : '';
    input.toggleAttribute('data-invalid', show);
    input.setAttribute('aria-invalid', String(show));
  }

  payButton.disabled = FIELD_NAMES.some((name) => results[name] !== null);
}

// ───────────────────────── Card preview ─────────────────────────

/** Updates the brand-dependent parts of the card (gradient, logos, badge). */
function renderBrand(): void {
  if (card.dataset.brand === currentBrand) return;

  card.dataset.brand = currentBrand;
  const logo = getBrandLogo(currentBrand);
  cardBrandFront.innerHTML = logo;
  cardBrandBack.innerHTML = logo;

  const known = currentBrand !== 'unknown';
  brandBadge.textContent = known ? cardInfo().label : '';
  brandBadge.classList.toggle('opacity-0', !known);

  fields.cvv.input.placeholder = '1234'.slice(0, cardInfo().cvvLength);
}

/** Mirrors every input value onto the card faces. */
function renderCard(): void {
  const info = cardInfo();
  const digits = digitsOnly(fields.number.input.value);
  const holder = fields.holder.input.value.trim();
  const expiry = fields.expiry.input.value;
  const cvv = fields.cvv.input.value;

  cardNumberDisplay.textContent = formatCardNumberPreview(digits, info.groups);
  cardHolderDisplay.textContent = holder ? holder.toUpperCase() : 'FULL NAME';
  cardExpiryDisplay.textContent = expiry ? expiry.padEnd(5, 'MM/YY'.slice(expiry.length)) : 'MM/YY';
  cardCvvDisplay.textContent = cvv.padEnd(info.cvvLength, '•');
}

/** Full refresh after any input change. */
function render(): void {
  renderBrand();
  renderCard();
  renderValidation();
}

// ───────────────────────── Input handlers ─────────────────────────

/** Card number: digits only, brand-specific max length and grouping, stable caret. */
fields.number.input.addEventListener('input', () => {
  const input = fields.number.input;
  const caret = input.selectionStart ?? input.value.length;
  const digitsBeforeCaret = digitsOnly(input.value.slice(0, caret)).length;

  const allDigits = digitsOnly(input.value);
  currentBrand = detectCardType(allDigits);
  const info = cardInfo();
  const digits = allDigits.slice(0, info.length);

  const formatted = formatCardNumber(digits, info.groups);
  input.value = formatted;

  if (document.activeElement === input) {
    const pos = caretFromDigitIndex(formatted, Math.min(digitsBeforeCaret, digits.length));
    input.setSelectionRange(pos, pos);
  }

  // Switching away from Amex shortens the CVV, so trim any extra digit.
  fields.cvv.input.value = fields.cvv.input.value.slice(0, info.cvvLength);

  render();
});

/** Card holder: letters and single spaces only. */
fields.holder.input.addEventListener('input', () => {
  const input = fields.holder.input;
  const caret = input.selectionStart ?? input.value.length;
  const cleanBeforeCaret = sanitizeHolder(input.value.slice(0, caret)).length;

  input.value = sanitizeHolder(input.value);
  if (document.activeElement === input) input.setSelectionRange(cleanBeforeCaret, cleanBeforeCaret);

  render();
});

/** Expiry: auto-insert "/" while typing, but let backspace remove it. */
fields.expiry.input.addEventListener('input', (event) => {
  const isDeleting = event instanceof InputEvent && event.inputType.startsWith('delete');
  fields.expiry.input.value = formatExpiry(fields.expiry.input.value, isDeleting);
  render();
});

/** CVV: digits only, 3 or 4 depending on the brand. */
fields.cvv.input.addEventListener('input', () => {
  fields.cvv.input.value = digitsOnly(fields.cvv.input.value).slice(0, cardInfo().cvvLength);
  render();
});

// ───────────────────────── Focus: highlight & flip ─────────────────────────

for (const name of FIELD_NAMES) {
  const { input, region } = fields[name];

  input.addEventListener('focus', () => {
    region?.classList.add('is-active');
    if (name === 'cvv') card.classList.add('is-flipped');
  });

  input.addEventListener('blur', () => {
    region?.classList.remove('is-active');
    if (name === 'cvv') card.classList.remove('is-flipped');

    // Only start nagging once the user has actually typed something here.
    if (input.value.length > 0) touched.add(name);
    renderValidation();
  });
}

// ───────────────────────── Submit & reset ─────────────────────────

form.addEventListener('submit', (event) => {
  event.preventDefault();

  // Guard against Enter-key submits while invalid: reveal all errors instead.
  const results = validateAll();
  if (FIELD_NAMES.some((name) => results[name] !== null)) {
    FIELD_NAMES.forEach((name) => touched.add(name));
    renderValidation();
    return;
  }

  // Fake a short processing delay — this is a UI demo, nothing is sent anywhere.
  payButton.disabled = true;
  paySpinner.classList.remove('hidden');
  payLabel.textContent = 'Processing…';

  window.setTimeout(() => {
    const last4 = digitsOnly(fields.number.input.value).slice(-4);
    successMessage.textContent = `$129.00 was charged to your ${cardInfo().label} ending in ${last4}. (Demo — no real payment was made.)`;

    form.classList.add('invisible');
    successPanel.classList.replace('hidden', 'flex');
    resetButton.focus();
  }, 1400);
});

resetButton.addEventListener('click', () => {
  form.reset();
  touched.clear();
  currentBrand = 'unknown';

  paySpinner.classList.add('hidden');
  payLabel.textContent = 'Pay Now';
  successPanel.classList.replace('flex', 'hidden');
  form.classList.remove('invisible');

  render();
  fields.number.input.focus();
});

// Initial paint.
render();
