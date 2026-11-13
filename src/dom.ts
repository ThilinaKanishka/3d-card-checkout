/**
 * Small DOM utilities shared by pages and components.
 */

/** Finds an element inside `root`, failing loudly if the markup is out of sync. */
export function query<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
}

/** Builds a single element from an HTML string. */
export function createElement<T extends HTMLElement = HTMLElement>(markup: string): T {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  const el = template.content.firstElementChild;
  if (!el) throw new Error('createElement: markup produced no element');
  return el as T;
}

/** True when the user has asked the OS to minimise animation. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Resolves after `ms` milliseconds. */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
