/**
 * "Leaving so soon?" logout confirmation.
 *
 * - Glass dialog over a blurred backdrop, with a floating mini card.
 * - Hold "Log out" for ~1s to confirm (a fill sweeps across the button);
 *   releasing early cancels. Enter confirms instantly; holding Space works too.
 * - Escape, "Stay" or a backdrop click cancels. Focus is trapped while open,
 *   and the page behind is made inert.
 * - On confirm: the card slides into a wallet, the flap closes with a particle
 *   burst, then the modal fades out. Reduced motion skips straight to a fade.
 */

import type { User } from '../auth';
import { createElement, prefersReducedMotion, query, wait } from '../dom';
import { createCard } from './card';
import { shake } from './field';

export interface LogoutModalOptions {
  user: User;
  /** Called after the exit animation, once the modal has been removed. */
  onConfirm(): void;
  /** Where focus goes back to if the user stays. */
  returnFocus?: HTMLElement | null;
}

export interface LogoutModal {
  /** Removes the modal immediately (e.g. when the page unmounts). */
  dismiss(): void;
}

/** How long "Log out" must be held, in ms (keep in sync with --hold-duration in style.css). */
const HOLD_MS = 1000;

/** Cancel (Stay / Escape / backdrop) out-animation, in ms (matches the 0.22s in style.css). */
const CLOSE_MS = 220;

/** Exit sequence timings, in ms. */
const PHASES = {
  walletIn: 350,
  insert: 650,
  close: 450,
  settle: 250,
  fadeOut: 400,
} as const;

const PARTICLE_COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f472b6', '#22d3ee', '#fbbf24'] as const;
const PARTICLE_COUNT = 28;

const TEMPLATE = `
<div class="logout-modal fixed inset-0 z-40 grid place-items-center overflow-y-auto p-4" data-state="open">
  <div data-part="backdrop" class="logout-backdrop absolute inset-0 bg-slate-950/60 backdrop-blur-md"></div>

  <div role="dialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-desc"
    class="logout-dialog relative w-full max-w-sm rounded-3xl border border-white/10 bg-linear-to-b from-slate-900/90 to-slate-950/90 p-7 text-center shadow-2xl shadow-black/70">

    <!-- Mini card + wallet stage (layers interleave: back → card → pocket → flap) -->
    <div data-part="stage" class="wallet-stage relative mx-auto h-48 w-64" aria-hidden="true">
      <div class="wallet-part wallet-back absolute bottom-0 left-1/2 h-30 w-52 -translate-x-1/2 rounded-2xl"></div>
      <div data-part="card-slot" class="mini-card-slot absolute top-2 left-1/2 w-44 -translate-x-1/2">
        <div data-part="card-float" class="mini-card-float"></div>
      </div>
      <div class="wallet-part wallet-pocket absolute bottom-0 left-1/2 h-19.5 w-52 -translate-x-1/2 rounded-t-md rounded-b-2xl"></div>
      <div class="wallet-part wallet-flap-hinge absolute bottom-30 left-1/2 h-0 w-52 -translate-x-1/2">
        <div class="wallet-flap absolute top-0 left-0 h-13.5 w-full rounded-b-2xl">
          <span class="wallet-clasp absolute bottom-2 left-1/2 size-4 -translate-x-1/2 rounded-full"></span>
        </div>
      </div>
      <!-- Burst origin: the clasp on the closed flap -->
      <div data-part="particles" class="pointer-events-none absolute bottom-20.5 left-1/2"></div>
    </div>

    <h2 id="logout-title" class="mt-4 text-2xl font-semibold tracking-tight">Leaving so soon?</h2>
    <p id="logout-desc" class="mt-1.5 text-sm text-slate-400">Your session will end on this device.</p>

    <div class="mt-7 grid grid-cols-2 gap-3">
      <button type="button" data-action="stay"
        class="h-12 rounded-xl border border-white/15 bg-white/3 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:outline-none">
        Stay
      </button>
      <button type="button" data-action="confirm" aria-describedby="logout-hint"
        class="hold-button relative h-12 overflow-hidden rounded-xl bg-linear-to-r from-rose-500 to-pink-500 text-sm font-semibold text-white shadow-lg shadow-rose-900/40 transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none">
        <span class="hold-fill absolute inset-0" aria-hidden="true"></span>
        <span class="relative flex items-center justify-center gap-2">
          <svg viewBox="0 0 24 24" class="size-4 fill-none stroke-current stroke-2" aria-hidden="true">
            <path d="M14 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4M14 12H4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span data-part="confirm-label">Hold to log out</span>
        </span>
      </button>
    </div>
    <p id="logout-hint" data-part="hint" class="logout-hint mt-3 text-xs text-slate-500" aria-live="polite">Press and hold the button for a second, or press Enter</p>
  </div>
</div>`;

/** Opens the logout confirmation modal. */
export function openLogoutModal({ user, onConfirm, returnFocus = null }: LogoutModalOptions): LogoutModal {
  const el = createElement(TEMPLATE);
  const backdrop = query(el, '[data-part="backdrop"]');
  const dialog = query(el, '[role="dialog"]');
  const stage = query(el, '[data-part="stage"]');
  const particles = query(el, '[data-part="particles"]');
  const stay = query<HTMLButtonElement>(el, '[data-action="stay"]');
  const confirm = query<HTMLButtonElement>(el, '[data-action="confirm"]');
  const confirmLabel = query(el, '[data-part="confirm-label"]');
  const hint = query(el, '[data-part="hint"]');

  // Mini card with the user's name on it.
  const card = createCard({
    brand: 'unknown',
    number: '•••• •••• •••• ••••',
    holder: user.name.toUpperCase(),
    expiry: '12/30',
    className: 'w-full',
    decorative: true,
  });
  query(el, '[data-part="card-float"]').append(card.root);

  const app = document.getElementById('app');
  const previousOverflow = document.documentElement.style.overflow;
  let holdTimer = 0;
  let busy = false; // true once the exit sequence has started
  let removed = false;

  // ───── Open ─────

  document.body.append(el);
  document.documentElement.style.overflow = 'hidden';
  if (app) app.inert = true;
  stay.focus();

  // ───── Close / remove ─────

  /** Removes the modal and restores the page. */
  function remove(): void {
    if (removed) return;
    removed = true;
    window.clearTimeout(holdTimer);
    document.removeEventListener('keydown', onKeydown, true);
    el.remove();
    document.documentElement.style.overflow = previousOverflow;
    if (app) app.inert = false;
  }

  /** Cancels: plays the out-animation, then restores focus. */
  function cancel(): void {
    if (busy || removed) return;
    busy = true;
    cancelHold();

    const finish = (): void => {
      remove();
      returnFocus?.focus();
    };
    if (prefersReducedMotion()) {
      finish();
      return;
    }
    // A timer (not animationend) so the modal can never get stuck open.
    el.dataset.state = 'closing';
    window.setTimeout(finish, CLOSE_MS);
  }

  // ───── Hold to confirm ─────

  function startHold(): void {
    if (busy || confirm.hasAttribute('data-holding')) return;
    confirm.setAttribute('data-holding', '');
    confirmLabel.textContent = 'Keep holding…';
    holdTimer = window.setTimeout(() => void runExit(), HOLD_MS);
  }

  function cancelHold(): void {
    window.clearTimeout(holdTimer);
    confirm.removeAttribute('data-holding');
    if (!busy) confirmLabel.textContent = 'Hold to log out';
  }

  /**
   * Released too early (e.g. a normal click): cancel, and make it obvious the
   * button needs to be held — shake it and highlight the hint.
   */
  function releaseHold(): void {
    if (busy || !confirm.hasAttribute('data-holding')) return;
    cancelHold();
    shake(confirm);
    hint.textContent = 'Keep the button pressed until the bar fills up (about 1 second).';
    hint.classList.remove('is-nudged');
    void hint.offsetWidth; // restart the highlight animation
    hint.classList.add('is-nudged');
  }

  confirm.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault(); // keep focus styles stable and avoid text selection
    confirm.focus();
    startHold();
  });
  confirm.addEventListener('pointerup', releaseHold);
  confirm.addEventListener('pointerleave', cancelHold);
  confirm.addEventListener('pointercancel', cancelHold);
  confirm.addEventListener('contextmenu', (event) => event.preventDefault()); // long-press menu on touch

  confirm.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      // Keyboard users can confirm instantly.
      event.preventDefault();
      void runExit();
    } else if (event.key === ' ' && !event.repeat) {
      event.preventDefault();
      startHold();
    }
  });
  confirm.addEventListener('keyup', (event) => {
    if (event.key === ' ') releaseHold();
  });

  // ───── Cancel paths ─────

  stay.addEventListener('click', cancel);
  backdrop.addEventListener('click', cancel);

  /** Escape closes; Tab is trapped inside the dialog. */
  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled])'));
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (!dialog.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  }
  document.addEventListener('keydown', onKeydown, true);

  // ───── Exit sequence ─────

  /** Scatters brand-coloured particles from the wallet clasp. */
  function burst(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.4;
      const distance = 50 + Math.random() * 60;
      const particle = document.createElement('span');
      particle.className = 'particle';
      particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--dy', `${Math.sin(angle) * distance - 20}px`);
      particle.style.setProperty('--size', `${6 + Math.random() * 6}px`);
      particle.style.setProperty('--color', PARTICLE_COLORS[i % PARTICLE_COLORS.length] ?? '#a855f7');
      particles.append(particle);
    }
  }

  async function runExit(): Promise<void> {
    if (busy) return;
    busy = true;
    cancelHold();
    confirm.setAttribute('data-done', '');
    stay.disabled = true;
    confirm.setAttribute('aria-disabled', 'true');

    if (!prefersReducedMotion()) {
      stage.dataset.phase = 'wallet-in';
      await wait(PHASES.walletIn);
      stage.dataset.phase = 'insert';
      await wait(PHASES.insert);
      stage.dataset.phase = 'close';
      await wait(PHASES.close * 0.6);
      burst();
      await wait(PHASES.close * 0.4 + PHASES.settle);
    }

    el.dataset.state = 'leaving';
    await wait(prefersReducedMotion() ? 150 : PHASES.fadeOut);
    remove();
    onConfirm();
  }

  return { dismiss: remove };
}
