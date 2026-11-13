/**
 * Lightweight toast notifications, announced politely to screen readers.
 */

import { prefersReducedMotion } from '../dom';

export type ToastVariant = 'info' | 'success' | 'error';

export interface ToastOptions {
  variant?: ToastVariant;
  /** How long the toast stays visible, in milliseconds. */
  duration?: number;
}

const MAX_TOASTS = 3;

const ICONS: Record<ToastVariant, string> = {
  info: '<svg viewBox="0 0 24 24" class="size-5 fill-none stroke-sky-300 stroke-2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01" stroke-linecap="round"/></svg>',
  success: '<svg viewBox="0 0 24 24" class="size-5 fill-none stroke-emerald-300 stroke-2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  error: '<svg viewBox="0 0 24 24" class="size-5 fill-none stroke-rose-300 stroke-2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01" stroke-linecap="round"/></svg>',
};

let region: HTMLElement | null = null;

/** Lazily creates the fixed live region that holds the toasts. */
function getRegion(): HTMLElement {
  if (region?.isConnected) return region;
  region = document.createElement('div');
  region.className = 'pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4';
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  document.body.append(region);
  return region;
}

function dismiss(toast: HTMLElement): void {
  if (prefersReducedMotion()) {
    toast.remove();
    return;
  }
  toast.classList.add('toast-leave');
  // Remove after the 0.25s leave animation (timer, so it can't linger if the animation doesn't run).
  window.setTimeout(() => toast.remove(), 250);
}

/** Shows a toast message at the bottom of the screen. */
export function showToast(message: string, { variant = 'info', duration = 3200 }: ToastOptions = {}): void {
  const container = getRegion();

  // Keep the stack short: drop the oldest toast.
  while (container.children.length >= MAX_TOASTS) container.firstElementChild?.remove();

  const toast = document.createElement('div');
  toast.className =
    'toast pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 shadow-2xl shadow-black/50 backdrop-blur-xl';
  toast.innerHTML = ICONS[variant];

  const text = document.createElement('span');
  text.textContent = message;
  toast.append(text);

  container.append(toast);
  window.setTimeout(() => dismiss(toast), duration);
}
