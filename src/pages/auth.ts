/**
 * Auth view: an animated 3D scene of floating cards on the left, and a glass
 * panel on the right whose front is Login and back is Sign Up. Switching
 * between #/login and #/signup flips the panel instead of re-rendering.
 */

import type { User } from '../auth';
import type { CardBrand } from '../cardType';
import { createElement, query } from '../dom';
import { attachTilt } from '../tilt';
import { brandMarkTemplate } from '../components/brand';
import { createCard } from '../components/card';
import { createLoginForm } from './login';
import { createSignupForm } from './signup';
import type { Page } from './types';

export type AuthRoute = 'login' | 'signup';

export interface AuthPage extends Page {
  /** Shows a face, flipping the panel if needed. */
  show(route: AuthRoute, options?: { focus?: boolean }): void;
}

export interface AuthPageOptions {
  onAuthenticated(user: User): void;
  /** Slide the panel up and fade it in (used after logging out). */
  entrance?: boolean;
}

/** A decorative card in the scene. */
interface FloatingCard {
  brand: CardBrand;
  number: string;
  holder: string;
  expiry: string;
  /** Parallax strength: far cards move less. */
  depth: number;
  /** Position/size within the cards area, plus float-animation tuning. */
  style: string;
  far?: boolean;
}

const FLOATING_CARDS: readonly FloatingCard[] = [
  {
    brand: 'amex',
    number: '3782 822463 10005',
    holder: 'GRACE HOPPER',
    expiry: '03/30',
    depth: 0.5,
    far: true,
    style: 'width:min(44cqw,90cqh,300px); right:6%; top:0%; --rz:8deg; --spin-from:14deg; --spin-to:-6deg; --float-duration:13s; --float-delay:-4s;',
  },
  {
    brand: 'visa',
    number: '4242 4242 4242 4242',
    holder: 'ADA LOVELACE',
    expiry: '08/29',
    depth: 0.8,
    style: 'width:min(50cqw,100cqh,340px); left:6%; top:6%; --rz:-9deg; --spin-from:-16deg; --spin-to:8deg; --float-duration:11s; --float-delay:-1s;',
  },
  {
    brand: 'mastercard',
    number: '5555 5555 5555 4444',
    holder: 'ALAN TURING',
    expiry: '11/27',
    depth: 1.3,
    style: 'width:min(56cqw,95cqh,390px); left:27%; top:38%; --rz:-3deg; --spin-from:-10deg; --spin-to:12deg; --float-duration:12s; --float-delay:-7s;',
  },
];

const TEMPLATE = `
<div class="page-enter grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
  <!-- ───── Left: animated scene ───── -->
  <!-- On desktop the scene stays pinned to the viewport while the form column scrolls. -->
  <section data-part="scene" class="auth-scene relative min-h-115 overflow-hidden border-b border-white/10 sm:min-h-135 lg:sticky lg:top-0 lg:h-screen lg:min-h-0 lg:border-r lg:border-b-0">
    <div class="auth-grid absolute inset-0" aria-hidden="true"></div>
    <div class="blob top-[8%] left-[6%] size-72 bg-indigo-600/50" style="--blob-x:60px; --blob-y:40px; --blob-duration:16s" aria-hidden="true"></div>
    <div class="blob top-[30%] right-[4%] size-80 bg-fuchsia-600/40" style="--blob-x:-70px; --blob-y:50px; --blob-duration:20s" aria-hidden="true"></div>
    <div class="blob bottom-[4%] left-[30%] size-64 bg-cyan-500/30" style="--blob-x:50px; --blob-y:-60px; --blob-duration:18s" aria-hidden="true"></div>

    <div class="absolute top-6 left-6 z-10 sm:top-8 sm:left-10">${brandMarkTemplate()}</div>

    <!-- Size container, so card widths can respect both width (cqw) and height (cqh). -->
    <div data-part="cards" class="absolute inset-x-0 top-[16%] bottom-[30%] [container-type:size]" aria-hidden="true"></div>

    <div class="absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-slate-950 via-slate-950/80 to-transparent px-6 pt-16 pb-8 sm:px-10 sm:pb-12">
      <p class="font-bank text-3xl leading-tight font-extrabold tracking-tight text-white sm:text-4xl xl:text-5xl">
        Pay smarter.<br />
        <span class="bg-linear-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">Checkout in seconds.</span>
      </p>
      <p class="mt-3 max-w-md text-sm text-slate-400">
        One account for every card. Encrypted, effortless, and beautifully simple.
      </p>
    </div>
  </section>

  <!-- ───── Right: flipping auth panel ───── -->
  <section class="flex items-center justify-center px-4 py-10 sm:px-8">
    <div data-part="flip" class="auth-flip w-full max-w-md">
      <div data-part="panel" class="auth-panel">
        <div data-face="login" class="auth-face glass-panel"></div>
        <div data-face="signup" class="auth-face auth-face-back glass-panel"></div>
      </div>
    </div>
  </section>
</div>`;

/** Builds the auth view, initially showing `initial`. */
export function createAuthPage(initial: AuthRoute, { onAuthenticated, entrance = false }: AuthPageOptions): AuthPage {
  const el = createElement(TEMPLATE);
  const scene = query(el, '[data-part="scene"]');
  const cardsArea = query(el, '[data-part="cards"]');
  const panel = query(el, '[data-part="panel"]');

  // After logout, the panel slides up and fades in.
  if (entrance) query(el, '[data-part="flip"]').classList.add('auth-entrance');
  const loginFace = query(el, '[data-face="login"]');
  const signupFace = query(el, '[data-face="signup"]');

  // Floating cards: each sits in a wrapper that floats (CSS animation) and
  // drifts with the mouse by its depth (parallax). Inner tilt + glare read the
  // same --rx/--ry/--gx/--gy variables that attachTilt sets on the scene.
  for (const spec of FLOATING_CARDS) {
    const wrapper = document.createElement('div');
    wrapper.className = 'float-card';
    wrapper.setAttribute('style', `${spec.style} --depth:${spec.depth};`);
    if (spec.far) wrapper.dataset.depth = 'far';

    const card = createCard({
      brand: spec.brand,
      number: spec.number,
      holder: spec.holder,
      expiry: spec.expiry,
      className: 'w-full',
      decorative: true,
    });
    wrapper.append(card.root);
    cardsArea.append(wrapper);
  }

  const detachTilt = attachTilt(scene, { maxTilt: 10 });

  const login = createLoginForm({ onSuccess: onAuthenticated });
  const signup = createSignupForm({ onSuccess: onAuthenticated });
  loginFace.append(login.el);
  signupFace.append(signup.el);

  function show(route: AuthRoute, { focus = false }: { focus?: boolean } = {}): void {
    const isSignup = route === 'signup';
    panel.classList.toggle('is-flipped', isSignup);
    // The hidden face must not be reachable by Tab, clicks or screen readers.
    loginFace.inert = isSignup;
    signupFace.inert = !isSignup;
    if (focus) (isSignup ? signup : login).focusFirst();
  }

  show(initial);

  return {
    el,
    show,
    destroy: detachTilt,
  };
}
