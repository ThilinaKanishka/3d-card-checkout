/**
 * Login form (front face of the auth panel).
 */

import { logIn } from '../auth';
import { createElement, query, wait } from '../dom';
import { validateEmail } from '../validate';
import {
  fieldTemplate,
  setButtonLoading,
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

const TEMPLATE = `
<form novalidate class="flex flex-col gap-5" aria-labelledby="login-title">
  <header class="space-y-1.5">
    <p class="text-xs font-semibold tracking-[0.25em] text-purple-300/80 uppercase">Welcome back</p>
    <h1 id="login-title" data-page-heading tabindex="-1" class="text-3xl font-semibold tracking-tight outline-none">Log in to Nova Pay</h1>
    <p class="text-sm text-slate-400">Pick up right where you left off.</p>
  </header>

  <div class="flex flex-col gap-1">
    ${fieldTemplate({ id: 'login-email', label: 'Email', type: 'email', autocomplete: 'email' })}
    ${fieldTemplate({ id: 'login-password', label: 'Password', type: 'password', autocomplete: 'current-password' })}
  </div>

  <div class="-mt-3 flex items-center justify-between gap-4 text-sm">
    <label for="login-remember" class="flex cursor-pointer items-center gap-2 text-slate-300">
      <input id="login-remember" type="checkbox" class="auth-checkbox" />
      Remember me
    </label>
    <button type="button" data-action="forgot" class="auth-link">Forgot password?</button>
  </div>

  <div>
    <div data-part="form-error" role="alert"></div>
    ${submitButtonTemplate('Log in')}
  </div>

  ${socialButtonsTemplate()}

  <p class="text-center text-sm text-slate-400">
    New to Nova Pay? <a href="#/signup" class="auth-link">Create an account</a>
  </p>
</form>`;

/** Builds the login form and wires its behaviour. */
export function createLoginForm({ onSuccess }: AuthFormOptions): AuthForm {
  const form = createElement<HTMLFormElement>(TEMPLATE);
  const email = query<HTMLInputElement>(form, '#login-email');
  const password = query<HTMLInputElement>(form, '#login-password');
  const remember = query<HTMLInputElement>(form, '#login-remember');
  const submit = query<HTMLButtonElement>(form, 'button[type="submit"]');
  const formError = query(form, '[data-part="form-error"]');

  const fields: ValidatedField[] = [
    [email, () => validateEmail(email.value)],
    [password, () => (password.value.length === 0 ? 'Password is required.' : null)],
  ];

  wirePasswordToggles(form);
  wireSocialButtons(form);
  wireLiveValidation(fields);

  query(form, '[data-action="forgot"]').addEventListener('click', () => {
    showToast('Password reset is not available — this is a demo.');
  });

  /** Shows or clears the form-level error above the button. */
  function setFormError(message: string | null): void {
    formError.innerHTML = message
      ? '<p class="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200"></p>'
      : '';
    const p = formError.firstElementChild;
    if (p && message) p.textContent = message;
  }

  // Any edit after a failed attempt clears the "incorrect" message.
  form.addEventListener('input', () => setFormError(null));

  let busy = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;

    setFormError(null);
    if (!validateFields(fields)) return;

    busy = true;
    setButtonLoading(submit, true, 'Logging in…');

    // Short pause so the loading state is visible (hashing alone is instant).
    const [result] = await Promise.all([logIn(email.value, password.value, remember.checked), wait(700)]);

    if (!result.ok) {
      busy = false;
      setButtonLoading(submit, false, 'Log in');
      setFormError(result.error);
      shake(form);
      password.select();
      return;
    }

    const firstName = result.user.name.split(' ')[0] ?? result.user.name;
    await playSuccess(form.closest<HTMLElement>('.auth-face') ?? form, `Welcome back, ${firstName}!`, 'Taking you to checkout…');
    onSuccess(result.user);
  });

  return {
    el: form,
    focusFirst: () => email.focus(),
  };
}
