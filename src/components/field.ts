/**
 * Shared building blocks for the auth forms: floating-label fields, password
 * visibility toggles, inline errors, shake feedback, loading buttons and the
 * demo social buttons.
 */

import { showToast } from './toast';

export interface FieldOptions {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password';
  autocomplete: string;
  /** Extra markup rendered below the input (e.g. the strength meter). */
  extra?: string;
}

const EYE_OPEN =
  '<svg data-icon="show" viewBox="0 0 24 24" class="size-5 fill-none stroke-current stroke-[1.8]" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" stroke-linejoin="round"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_CLOSED =
  '<svg data-icon="hide" viewBox="0 0 24 24" class="hidden size-5 fill-none stroke-current stroke-[1.8]" aria-hidden="true"><path d="M3 3l18 18M10.6 5.6A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.7M6.5 7.3A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 4.4-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** A text input with a floating label, optional eye toggle, and an error slot. */
export function fieldTemplate({ id, label, type = 'text', autocomplete, extra = '' }: FieldOptions): string {
  const isPassword = type === 'password';
  const toggle = isPassword
    ? `<button type="button" data-toggle-password="${id}" aria-controls="${id}" aria-label="Show password" aria-pressed="false"
         class="absolute top-1/2 right-2 z-[2] grid size-10 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:text-slate-100 focus-visible:text-slate-100 focus-visible:outline-none">
         ${EYE_OPEN}${EYE_CLOSED}
       </button>`
    : '';

  return `
<div data-field>
  <div class="auth-field">
    <input id="${id}" name="${id}" type="${type}" autocomplete="${autocomplete}" placeholder=" " required
      aria-describedby="${id}-error" class="auth-input ${isPassword ? 'pr-12' : ''}" />
    <label for="${id}" class="auth-label">${label}</label>
    ${toggle}
  </div>
  ${extra}
  <p id="${id}-error" data-error class="field-error" aria-live="polite"></p>
</div>`;
}

/** The gradient submit button with a spinner for the loading state. */
export function submitButtonTemplate(label: string): string {
  return `
<button type="submit"
  class="relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 font-semibold text-white shadow-lg shadow-purple-900/40 transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none active:scale-[0.99] disabled:cursor-wait disabled:opacity-80">
  <span data-spinner class="hidden size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
  <span data-label>${label}</span>
</button>`;
}

/** "or continue with" divider plus the demo Google / GitHub buttons (generic icons). */
export function socialButtonsTemplate(): string {
  const button = (provider: string, icon: string): string => `
    <button type="button" data-social="${provider}"
      class="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:outline-none">
      ${icon}<span>${provider}</span>
    </button>`;

  // Simple generic marks: a letter in a circle and a code bracket — not the official logos.
  const letterIcon =
    '<svg viewBox="0 0 24 24" class="size-4" aria-hidden="true"><circle cx="12" cy="12" r="10" class="fill-none stroke-current stroke-[1.6]"/><text x="12" y="16.2" text-anchor="middle" font-size="11.5" font-weight="700" class="fill-current" font-family="ui-sans-serif, system-ui">G</text></svg>';
  const codeIcon =
    '<svg viewBox="0 0 24 24" class="size-4 fill-none stroke-current stroke-2" aria-hidden="true"><path d="M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  return `
<div class="flex items-center gap-3 text-xs text-slate-500">
  <span class="h-px flex-1 bg-white/10"></span>or continue with<span class="h-px flex-1 bg-white/10"></span>
</div>
<div class="grid grid-cols-2 gap-3">
  ${button('Google', letterIcon)}
  ${button('GitHub', codeIcon)}
</div>`;
}

/** Wires every eye toggle inside `root` to show/hide its password input. */
export function wirePasswordToggles(root: HTMLElement): void {
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-toggle-password]')) {
    const input = root.querySelector<HTMLInputElement>(`#${button.dataset.togglePassword ?? ''}`);
    if (!input) continue;

    button.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(show));
      button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      button.querySelector('[data-icon="show"]')?.classList.toggle('hidden', show);
      button.querySelector('[data-icon="hide"]')?.classList.toggle('hidden', !show);
    });
  }
}

/** Wires the demo social buttons to a "demo only" toast. */
export function wireSocialButtons(root: HTMLElement): void {
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-social]')) {
    button.addEventListener('click', () => {
      showToast(`Continue with ${button.dataset.social ?? 'provider'} is demo only — no account is connected.`);
    });
  }
}

/** Shows (or clears) the inline error for an input and marks it invalid. */
export function setFieldError(input: HTMLInputElement, message: string | null): void {
  const error = input.closest('[data-field]')?.querySelector<HTMLElement>('[data-error]');
  if (error) error.textContent = message ?? '';
  input.toggleAttribute('data-invalid', message !== null);
  input.setAttribute('aria-invalid', String(message !== null));
}

/** Plays the shake animation (restarting it if it's already running). */
export function shake(el: HTMLElement): void {
  el.classList.remove('shake');
  void el.offsetWidth; // force reflow so the animation restarts
  el.classList.add('shake');
  el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
}

export type FieldValidator = () => string | null;
export type ValidatedField = readonly [HTMLInputElement, FieldValidator];

/**
 * Validates every field, shows the errors, shakes the invalid ones and
 * focuses the first. Returns true when everything is valid.
 */
export function validateFields(fields: readonly ValidatedField[]): boolean {
  let firstInvalid: HTMLInputElement | null = null;

  for (const [input, validate] of fields) {
    const message = validate();
    setFieldError(input, message);
    if (message !== null) {
      firstInvalid ??= input;
      const wrapper = input.closest<HTMLElement>('[data-field]');
      if (wrapper) shake(wrapper);
    }
  }

  firstInvalid?.focus();
  return firstInvalid === null;
}

/**
 * Live feedback: validate a field when the user leaves it (if they typed
 * something), and re-check fields that are showing an error as they're fixed.
 */
export function wireLiveValidation(fields: readonly ValidatedField[]): void {
  for (const [input, validate] of fields) {
    input.addEventListener('blur', () => {
      if (input.value.length > 0) setFieldError(input, validate());
    });
    input.addEventListener('input', () => {
      if (input.hasAttribute('data-invalid')) setFieldError(input, validate());
    });
  }
}

/** Toggles the submit button's loading state. */
export function setButtonLoading(button: HTMLButtonElement, loading: boolean, label: string): void {
  button.disabled = loading;
  button.setAttribute('aria-busy', String(loading));
  button.querySelector('[data-spinner]')?.classList.toggle('hidden', !loading);
  const text = button.querySelector('[data-label]');
  if (text) text.textContent = label;
}
