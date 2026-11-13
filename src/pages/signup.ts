/**
 * Sign-up form (back face of the auth panel), with a live password strength meter.
 */

import { signUp } from '../auth';
import { createElement, query, wait } from '../dom';
import { getPasswordStrength, type StrengthChecks } from '../passwordStrength';
import { validateEmail, validateFullName, validateNewPassword, validatePasswordConfirm } from '../validate';
import {
  fieldTemplate,
  setButtonLoading,
  setFieldError,
  shake,
  socialButtonsTemplate,
  submitButtonTemplate,
  validateFields,
  wireLiveValidation,
  wirePasswordToggles,
  wireSocialButtons,
  type ValidatedField,
} from '../components/field';
import { playSuccess } from '../components/success';
import { showToast } from '../components/toast';
import type { AuthForm, AuthFormOptions } from './types';

const CHECK_LABELS: Record<keyof StrengthChecks, string> = {
  length: '8+ characters',
  uppercase: 'Uppercase letter',
  number: 'Number',
  symbol: 'Symbol',
};

const CHECK_ICON =
  '<svg viewBox="0 0 16 16" class="strength-icon size-3.5" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><path d="M5.2 8.2l1.9 1.9 3.8-4" /></svg>';

const STRENGTH_METER = `
<div class="mt-2.5 px-1" data-part="strength">
  <div class="flex items-center gap-3">
    <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
      <div data-part="strength-bar" class="strength-bar h-full rounded-full" data-level="0"></div>
    </div>
    <span data-part="strength-label" class="strength-label w-20 text-right text-xs font-semibold" data-level="0" aria-live="polite"></span>
  </div>
  <ul class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs" aria-label="Password requirements">
    ${(Object.keys(CHECK_LABELS) as (keyof StrengthChecks)[])
      .map(
        (key) =>
          `<li data-check="${key}" class="strength-check flex items-center gap-1.5">${CHECK_ICON}<span>${CHECK_LABELS[key]}</span><span class="sr-only" data-check-state>, not met</span></li>`,
      )
      .join('')}
  </ul>
</div>`;

const TEMPLATE = `
<form novalidate class="flex flex-col gap-5" aria-labelledby="signup-title">
  <header class="space-y-1.5">
    <p class="text-xs font-semibold tracking-[0.25em] text-pink-300/80 uppercase">Get started</p>
    <h1 id="signup-title" data-page-heading tabindex="-1" class="text-3xl font-semibold tracking-tight outline-none">Create your account</h1>
    <p class="text-sm text-slate-400">It takes less than a minute.</p>
  </header>

  <div class="flex flex-col gap-1">
    ${fieldTemplate({ id: 'signup-name', label: 'Full name', autocomplete: 'name' })}
    ${fieldTemplate({ id: 'signup-email', label: 'Email', type: 'email', autocomplete: 'email' })}
    ${fieldTemplate({ id: 'signup-password', label: 'Password', type: 'password', autocomplete: 'new-password', extra: STRENGTH_METER })}
    ${fieldTemplate({ id: 'signup-confirm', label: 'Confirm password', type: 'password', autocomplete: 'new-password' })}

    <div data-field>
      <label for="signup-terms" class="flex cursor-pointer items-start gap-2.5 text-sm text-slate-300">
        <input id="signup-terms" type="checkbox" class="auth-checkbox mt-0.5" aria-describedby="signup-terms-error" />
        <span>I agree to the <button type="button" data-action="terms" class="auth-link">terms</button> and privacy policy</span>
      </label>
      <p id="signup-terms-error" data-error class="field-error" aria-live="polite"></p>
    </div>
  </div>

  ${submitButtonTemplate('Create account')}

  ${socialButtonsTemplate()}

  <p class="text-center text-sm text-slate-400">
    Already have an account? <a href="#/login" class="auth-link">Log in</a>
  </p>
</form>`;

/** Builds the sign-up form and wires its behaviour. */
export function createSignupForm({ onSuccess }: AuthFormOptions): AuthForm {
  const form = createElement<HTMLFormElement>(TEMPLATE);
  const name = query<HTMLInputElement>(form, '#signup-name');
  const email = query<HTMLInputElement>(form, '#signup-email');
  const password = query<HTMLInputElement>(form, '#signup-password');
  const confirm = query<HTMLInputElement>(form, '#signup-confirm');
  const terms = query<HTMLInputElement>(form, '#signup-terms');
  const submit = query<HTMLButtonElement>(form, 'button[type="submit"]');
  const strengthBar = query(form, '[data-part="strength-bar"]');
  const strengthLabel = query(form, '[data-part="strength-label"]');
  const checkItems = Array.from(form.querySelectorAll<HTMLElement>('[data-check]'));

  const fields: ValidatedField[] = [
    [name, () => validateFullName(name.value)],
    [email, () => validateEmail(email.value)],
    [password, () => validateNewPassword(password.value)],
    [confirm, () => validatePasswordConfirm(password.value, confirm.value)],
    [terms, () => (terms.checked ? null : 'Please accept the terms to continue.')],
  ];

  wirePasswordToggles(form);
  wireSocialButtons(form);
  wireLiveValidation(fields);

  query(form, '[data-action="terms"]').addEventListener('click', (event) => {
    event.preventDefault(); // don't toggle the checkbox via its label
    showToast('These terms are a demo — there is nothing to agree to.');
  });

  /** Updates the meter bar, label and checklist. */
  function renderStrength(): void {
    const { checks, level, label } = getPasswordStrength(password.value);
    strengthBar.dataset.level = String(level);
    strengthLabel.dataset.level = String(level);
    strengthLabel.textContent = label;

    for (const item of checkItems) {
      const met = checks[item.dataset.check as keyof StrengthChecks];
      item.toggleAttribute('data-met', met);
      const state = item.querySelector('[data-check-state]');
      if (state) state.textContent = met ? ', met' : ', not met';
    }
  }

  password.addEventListener('input', () => {
    renderStrength();
    // Keep the confirmation error in sync when the password changes.
    if (confirm.value.length > 0) setFieldError(confirm, validatePasswordConfirm(password.value, confirm.value));
  });

  let busy = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!validateFields(fields)) return;

    busy = true;
    setButtonLoading(submit, true, 'Creating account…');
    const [result] = await Promise.all([signUp(name.value, email.value, password.value), wait(900)]);

    if (!result.ok) {
      busy = false;
      setButtonLoading(submit, false, 'Create account');
      // Duplicate email is the expected failure; other errors (no crypto) go on the email field too.
      setFieldError(email, result.error);
      const wrapper = email.closest<HTMLElement>('[data-field]');
      if (wrapper) shake(wrapper);
      email.focus();
      return;
    }

    const firstName = result.user.name.split(' ')[0] ?? result.user.name;
    await playSuccess(form.closest<HTMLElement>('.auth-face') ?? form, `Welcome, ${firstName}!`, 'Your account is ready.');
    onSuccess(result.user);
  });

  renderStrength();

  return {
    el: form,
    focusFirst: () => name.focus(),
  };
}
