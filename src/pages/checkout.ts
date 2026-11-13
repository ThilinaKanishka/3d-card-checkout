/**
 * Checkout page: payment form wired to the live 3D card preview, plus a
 * header with the signed-in user and a "Log out" button.
 */

import type { User } from '../auth';
import { detectCardType, getCardTypeInfo, type CardBrand, type CardTypeInfo } from '../cardType';
import {
  caretFromDigitIndex,
  digitsOnly,
  formatCardNumber,
  formatCardNumberPreview,
  formatExpiry,
  sanitizeHolder,
} from '../format';
import { validateCardNumber, validateCvv, validateExpiry, validateHolder, type ValidationResult } from '../validate';
import { createElement, query } from '../dom';
import { attachTilt } from '../tilt';
import { brandMarkTemplate } from '../components/brand';
import { createCard, type CardRegion } from '../components/card';
import { openLogoutModal, type LogoutModal } from '../components/logoutModal';
import { createProfileMenu } from '../components/profileMenu';
import type { Page } from './types';

type FieldName = 'number' | 'holder' | 'expiry' | 'cvv';

export interface CheckoutPageOptions {
  /** Called after the user confirms in the logout modal and its animation finishes. */
  onLogout(): void;
}

const TEMPLATE = `
<div class="page-enter flex min-h-screen flex-col">
  <!-- Header -->
  <header class="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 pt-6">
    ${brandMarkTemplate()}
    <div data-slot="profile" class="min-w-0"></div>
  </header>

  <main class="flex flex-1 items-center justify-center px-4 py-8 sm:py-10">
    <section class="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white/4 shadow-2xl shadow-black/50 backdrop-blur-xl lg:grid-cols-2">
      <!-- Left: card preview -->
      <div data-slot="card"
        class="flex flex-col items-center justify-center gap-6 border-b border-white/10 bg-linear-to-br from-white/6 to-transparent p-6 sm:p-10 lg:border-r lg:border-b-0">
        <p class="order-last text-center text-xs text-slate-400">Tip: focus the CVV field to flip the card.</p>
      </div>

      <!-- Right: payment form -->
      <div class="relative p-6 sm:p-10">
        <form id="payment-form" class="flex flex-col gap-5" novalidate>
          <header>
            <h1 data-page-heading tabindex="-1" class="text-2xl font-semibold tracking-tight outline-none">Complete Payment</h1>
            <p class="mt-1 text-sm text-slate-400">Enter your card details to finish checkout.</p>
          </header>

          <!-- Card number -->
          <div>
            <label for="card-number" class="field-label">Card Number</label>
            <div class="relative">
              <input id="card-number" name="cardNumber" class="field-input pr-28 font-mono tracking-wider" type="text"
                inputmode="numeric" autocomplete="cc-number" placeholder="1234 5678 9012 3456" aria-describedby="card-number-error" />
              <span id="card-brand-badge"
                class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md bg-white/10 px-2 py-0.5 text-xs font-medium text-slate-300 opacity-0 transition-opacity"></span>
            </div>
            <p id="card-number-error" class="field-error" aria-live="polite"></p>
          </div>

          <!-- Card holder -->
          <div>
            <label for="card-holder" class="field-label">Card Holder</label>
            <input id="card-holder" name="cardHolder" class="field-input" type="text" maxlength="26"
              autocomplete="cc-name" placeholder="Full name" aria-describedby="card-holder-error" />
            <p id="card-holder-error" class="field-error" aria-live="polite"></p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <!-- Expiry -->
            <div>
              <label for="card-expiry" class="field-label">Expiry (MM/YY)</label>
              <input id="card-expiry" name="cardExpiry" class="field-input font-mono" type="text" inputmode="numeric"
                maxlength="5" autocomplete="cc-exp" placeholder="MM/YY" aria-describedby="card-expiry-error" />
              <p id="card-expiry-error" class="field-error" aria-live="polite"></p>
            </div>

            <!-- CVV -->
            <div>
              <label for="card-cvv" class="field-label">CVV</label>
              <input id="card-cvv" name="cardCvv" class="field-input font-mono" type="text" inputmode="numeric"
                autocomplete="cc-csc" placeholder="123" aria-describedby="card-cvv-error" />
              <p id="card-cvv-error" class="field-error" aria-live="polite"></p>
            </div>
          </div>

          <div class="flex items-center justify-between border-t border-white/10 pt-5 text-sm">
            <span class="text-slate-400">Total due</span>
            <span class="text-lg font-semibold">$129.00</span>
          </div>

          <button id="pay-button" type="submit" disabled
            class="group relative flex h-12 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 font-semibold text-white shadow-lg shadow-purple-900/40 transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:brightness-100">
            <span id="pay-spinner" class="hidden size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
            <span id="pay-label">Pay Now</span>
          </button>

          <p class="flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <svg viewBox="0 0 24 24" class="size-3.5 fill-current" aria-hidden="true">
              <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3H9z" />
            </svg>
            Demo only — no real payment is made.
          </p>
        </form>

        <!-- Success state (shown after "Pay Now") -->
        <div id="success-panel" class="absolute inset-0 hidden flex-col items-center justify-center gap-4 p-6 text-center sm:p-10" role="status">
          <div class="success-check flex size-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/40">
            <svg viewBox="0 0 24 24" class="size-8 fill-none stroke-emerald-400 stroke-[2.5]" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <h2 class="text-2xl font-semibold">Payment successful</h2>
          <p id="success-message" class="max-w-xs text-sm text-slate-400"></p>
          <button id="reset-button" type="button"
            class="mt-2 rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:outline-none">
            Make another payment
          </button>
        </div>
      </div>
    </section>
  </main>
</div>`;

/** Builds the checkout page for the signed-in user. */
export function createCheckoutPage(user: User, { onLogout }: CheckoutPageOptions): Page {
  const el = createElement(TEMPLATE);

  // ───── Header: profile menu → logout confirmation ─────
  let logoutModal: LogoutModal | null = null;

  const profileMenu = createProfileMenu({
    user,
    onLogoutRequest() {
      logoutModal = openLogoutModal({
        user,
        returnFocus: profileMenu.trigger,
        onConfirm() {
          logoutModal = null;
          onLogout();
        },
      });
    },
  });
  query(el, '[data-slot="profile"]').append(profileMenu.el);

  // ───── Card preview ─────
  const card = createCard();
  query(el, '[data-slot="card"]').prepend(card.root);
  const detachTilt = attachTilt(card.root, { maxTilt: 12 });

  // ───── Element references ─────
  const form = query<HTMLFormElement>(el, '#payment-form');
  const payButton = query<HTMLButtonElement>(el, '#pay-button');
  const paySpinner = query(el, '#pay-spinner');
  const payLabel = query(el, '#pay-label');
  const brandBadge = query(el, '#card-brand-badge');
  const successPanel = query(el, '#success-panel');
  const successMessage = query(el, '#success-message');
  const resetButton = query<HTMLButtonElement>(el, '#reset-button');

  /** Inputs, error slots and (optional) card highlight region for each field. */
  const fields: Record<FieldName, { input: HTMLInputElement; error: HTMLElement; region: CardRegion | null }> = {
    number: { input: query(el, '#card-number'), error: query(el, '#card-number-error'), region: 'number' },
    holder: { input: query(el, '#card-holder'), error: query(el, '#card-holder-error'), region: 'holder' },
    expiry: { input: query(el, '#card-expiry'), error: query(el, '#card-expiry-error'), region: 'expiry' },
    // CVV lives on the back; focusing it flips the card instead.
    cvv: { input: query(el, '#card-cvv'), error: query(el, '#card-cvv-error'), region: null },
  };

  const FIELD_NAMES = Object.keys(fields) as FieldName[];

  // ───── State ─────

  /** Fields the user has left at least once; errors are only shown for these (or complete fields). */
  const touched = new Set<FieldName>();
  let currentBrand: CardBrand = 'unknown';
  let renderedBrand: CardBrand | null = null;
  let payTimer = 0;

  function cardInfo(): CardTypeInfo {
    return getCardTypeInfo(currentBrand);
  }

  // ───── Validation ─────

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

  // ───── Card preview ─────

  /** Updates the brand-dependent parts of the UI (card theme, input badge, CVV placeholder). */
  function renderBrand(): void {
    if (renderedBrand === currentBrand) return;
    renderedBrand = currentBrand;

    card.setBrand(currentBrand);
    const known = currentBrand !== 'unknown';
    brandBadge.textContent = known ? cardInfo().label : '';
    brandBadge.classList.toggle('opacity-0', !known);
    fields.cvv.input.placeholder = '1234'.slice(0, cardInfo().cvvLength);
  }

  /** Mirrors every input value onto the card faces. */
  function renderCard(): void {
    const info = cardInfo();
    const holder = fields.holder.input.value.trim();
    const expiry = fields.expiry.input.value;

    card.setNumber(formatCardNumberPreview(digitsOnly(fields.number.input.value), info.groups));
    card.setHolder(holder ? holder.toUpperCase() : 'FULL NAME');
    card.setExpiry(expiry ? expiry.padEnd(5, 'MM/YY'.slice(expiry.length)) : 'MM/YY');
    card.setCvv(fields.cvv.input.value.padEnd(info.cvvLength, '•'));
  }

  /** Full refresh after any input change. */
  function render(): void {
    renderBrand();
    renderCard();
    renderValidation();
  }

  // ───── Input handlers ─────

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

  // ───── Focus: highlight & flip ─────

  for (const name of FIELD_NAMES) {
    const { input, region } = fields[name];

    input.addEventListener('focus', () => {
      card.setActiveRegion(region);
      card.setFlipped(name === 'cvv');
    });

    input.addEventListener('blur', () => {
      card.setActiveRegion(null);
      card.setFlipped(false);

      // Only start nagging once the user has actually typed something here.
      if (input.value.length > 0) touched.add(name);
      renderValidation();
    });
  }

  // ───── Submit & reset ─────

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

    payTimer = window.setTimeout(() => {
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

  return {
    el,
    destroy() {
      window.clearTimeout(payTimer);
      detachTilt();
      profileMenu.destroy();
      logoutModal?.dismiss();
    },
  };
}
