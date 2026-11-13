/**
 * Profile chip + glass dropdown for the checkout header.
 *
 * Keyboard: Enter / Space / ArrowDown on the chip opens the menu and focuses
 * the first item; ArrowUp/Down/Home/End move between items; Escape closes and
 * returns focus to the chip; Tab closes and continues normally.
 */

import type { User } from '../auth';
import { createElement, query } from '../dom';

export interface ProfileMenuOptions {
  user: User;
  /** Called when "Log out" is chosen (the menu has already closed). */
  onLogoutRequest(): void;
}

export interface ProfileMenu {
  el: HTMLElement;
  /** The chip button — where focus should return after a dialog closes. */
  trigger: HTMLButtonElement;
  close(options?: { restoreFocus?: boolean }): void;
  destroy(): void;
}

/** "Ada Lovelace" → "AL" */
export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

const AVATAR_CLASSES =
  'grid shrink-0 place-items-center rounded-full bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 font-bold text-white shadow-md shadow-purple-900/50 ring-2 ring-white/10';

const TEMPLATE = `
<div class="relative">
  <button type="button" data-part="trigger" id="profile-trigger" aria-haspopup="menu" aria-expanded="false" aria-controls="profile-menu"
    class="group flex max-w-[15rem] items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-1 pr-3 pl-1 transition hover:border-white/20 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:outline-none aria-expanded:border-white/20 aria-expanded:bg-white/10">
    <span data-part="avatar" class="${AVATAR_CLASSES} size-8 text-xs" aria-hidden="true"></span>
    <span data-part="name" class="min-w-0 truncate text-sm font-medium"></span>
    <svg viewBox="0 0 20 20" class="size-4 shrink-0 fill-none stroke-slate-400 stroke-2 transition-transform duration-200 group-aria-expanded:rotate-180" aria-hidden="true">
      <path d="M6 8l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </button>

  <div id="profile-menu" data-part="menu" role="menu" aria-labelledby="profile-trigger"
    class="profile-menu absolute top-full right-0 z-30 mt-2 w-72 rounded-2xl border border-white/10 bg-slate-900/80 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl">
    <div role="none" class="flex items-center gap-3 px-3 pt-2.5 pb-3">
      <span data-part="menu-avatar" class="${AVATAR_CLASSES} size-11 text-sm" aria-hidden="true"></span>
      <span class="min-w-0">
        <span data-part="menu-name" class="block truncate text-sm font-semibold text-white"></span>
        <span data-part="menu-email" class="block truncate text-xs text-slate-400"></span>
      </span>
    </div>
    <div role="separator" class="mx-2 my-1 h-px bg-white/10"></div>
    <button type="button" role="menuitem" tabindex="-1" data-part="logout"
      class="group/item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200 focus:bg-rose-500/10 focus:text-rose-200 focus:outline-none">
      <span class="grid size-8 place-items-center rounded-lg bg-linear-to-br from-rose-500/20 to-pink-500/20 ring-1 ring-rose-400/20">
        <svg viewBox="0 0 24 24" class="size-4 fill-none stroke-current stroke-2 transition-transform group-hover/item:translate-x-0.5 group-focus/item:translate-x-0.5" aria-hidden="true">
          <path d="M14 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4M14 12H4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
      Log out
    </button>
  </div>
</div>`;

/** Builds the profile chip and its dropdown menu. */
export function createProfileMenu({ user, onLogoutRequest }: ProfileMenuOptions): ProfileMenu {
  const el = createElement(TEMPLATE);
  const trigger = query<HTMLButtonElement>(el, '[data-part="trigger"]');
  const menu = query(el, '[data-part="menu"]');
  const logoutItem = query<HTMLButtonElement>(el, '[data-part="logout"]');

  const userInitials = initials(user.name);
  query(el, '[data-part="avatar"]').textContent = userInitials;
  query(el, '[data-part="menu-avatar"]').textContent = userInitials;
  query(el, '[data-part="name"]').textContent = user.name;
  query(el, '[data-part="menu-name"]').textContent = user.name;
  query(el, '[data-part="menu-email"]').textContent = user.email;

  const items = (): HTMLElement[] => Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'));
  let isOpen = false;

  function open(focus: 'first' | 'last' = 'first'): void {
    isOpen = true;
    menu.dataset.open = '';
    trigger.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', onOutsidePointer);
    const list = items();
    (focus === 'first' ? list[0] : list[list.length - 1])?.focus();
  }

  function close({ restoreFocus = false }: { restoreFocus?: boolean } = {}): void {
    if (!isOpen) return;
    isOpen = false;
    delete menu.dataset.open;
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onOutsidePointer);
    if (restoreFocus) trigger.focus();
  }

  function onOutsidePointer(event: PointerEvent): void {
    if (event.target instanceof Node && !el.contains(event.target)) close();
  }

  trigger.addEventListener('click', () => (isOpen ? close() : open()));

  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open(event.key === 'ArrowDown' ? 'first' : 'last');
    } else if (event.key === 'Escape') {
      close();
    }
  });

  menu.addEventListener('keydown', (event) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number): void => list[(i + list.length) % list.length]?.focus();

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        close({ restoreFocus: true });
        break;
      case 'ArrowDown':
        event.preventDefault();
        focusAt(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusAt(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAt(0);
        break;
      case 'End':
        event.preventDefault();
        focusAt(list.length - 1);
        break;
      case 'Tab':
        close();
        break;
    }
  });

  logoutItem.addEventListener('click', () => {
    close();
    onLogoutRequest();
  });

  return {
    el,
    trigger,
    close,
    destroy: () => close(),
  };
}
