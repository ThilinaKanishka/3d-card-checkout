/**
 * Shared page / form contracts.
 */

import type { User } from '../auth';

/** A mounted view. `destroy` releases listeners and timers that outlive the DOM. */
export interface Page {
  el: HTMLElement;
  destroy(): void;
}

/** One face of the auth panel (login or sign up). */
export interface AuthForm {
  el: HTMLFormElement;
  /** Moves focus to the first input (used after flipping to this face). */
  focusFirst(): void;
}

export interface AuthFormOptions {
  /** Called after the success animation has played. */
  onSuccess(user: User): void;
}
