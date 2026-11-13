/**
 * Animated checkmark overlay shown after a successful login / sign-up,
 * just before redirecting.
 */

import { prefersReducedMotion, wait } from '../dom';

/**
 * Covers `container` with the success animation and resolves once it has
 * played. The overlay stays until the page is unmounted.
 */
export async function playSuccess(container: HTMLElement, title: string, subtitle: string): Promise<void> {
  const overlay = document.createElement('div');
  overlay.className =
    'success-overlay absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-[inherit] bg-slate-950/90 p-8 text-center';
  overlay.setAttribute('role', 'status');
  overlay.innerHTML = `
    <svg class="success-draw size-20" viewBox="0 0 52 52" aria-hidden="true">
      <circle class="success-draw-circle" cx="26" cy="26" r="24" />
      <path class="success-draw-check" d="M15.5 27.5l7 7 14-15" />
    </svg>
    <p data-title class="text-xl font-semibold"></p>
    <p data-subtitle class="text-sm text-slate-400"></p>`;

  const titleEl = overlay.querySelector('[data-title]');
  const subtitleEl = overlay.querySelector('[data-subtitle]');
  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle;

  container.append(overlay);
  await wait(prefersReducedMotion() ? 500 : 1400);
}
