/**
 * App entry: mounts the page for the current hash route.
 *
 *   #/login, #/signup → auth view (one view; switching flips its panel)
 *   #/checkout        → checkout page (signed-in users only)
 */

import './style.css'; // also pulls in card.css
import { getCurrentUser, logOut } from './auth';
import { navigate, startRouter, type Route } from './router';
import { createAuthPage, type AuthPage } from './pages/auth';
import { createCheckoutPage } from './pages/checkout';
import type { Page } from './pages/types';
import { showToast } from './components/toast';
import { query } from './dom';

type View = { kind: 'auth'; page: AuthPage } | { kind: 'checkout'; page: Page };

const TITLES: Record<Route, string> = {
  login: 'Log in · Nova Pay',
  signup: 'Sign up · Nova Pay',
  checkout: 'Checkout · Nova Pay',
};

const app = query(document, '#app');
let view: View | null = null;
/** Set on logout so the next auth view plays its panel entrance. */
let playAuthEntrance = false;

/** Replaces the current view, moving focus to the new page's heading. */
function mount(next: View): void {
  const isFirstMount = view === null;
  view?.page.destroy();
  app.replaceChildren(next.page.el);
  view = next;

  if (!isFirstMount) {
    window.scrollTo(0, 0);
    // Focus the visible heading so screen readers announce the new page.
    const heading = Array.from(next.page.el.querySelectorAll<HTMLElement>('[data-page-heading]')).find(
      (h) => !h.closest('[inert]'),
    );
    heading?.focus({ preventScroll: true });
  }
}

/** Signed-out users can't reach checkout; signed-in users skip the auth pages. */
function guard(route: Route): Route {
  const signedIn = getCurrentUser() !== null;
  if (route === 'checkout') return signedIn ? 'checkout' : 'login';
  return signedIn ? 'checkout' : route;
}

function render(route: Route): void {
  document.title = TITLES[route];

  if (route === 'checkout') {
    const user = getCurrentUser();
    if (!user) {
      navigate('login', { replace: true });
      return;
    }
    if (view?.kind === 'checkout') return;

    mount({
      kind: 'checkout',
      page: createCheckoutPage(user, {
        onLogout() {
          // Clears the session from both storages; registered users are kept.
          logOut();
          const firstName = user.name.split(' ')[0] ?? user.name;
          showToast(`Logged out. See you soon, ${firstName}!`, { variant: 'success' });
          playAuthEntrance = true;
          navigate('login');
        },
      }),
    });
    return;
  }

  // Already on the auth view: just flip to the other face.
  if (view?.kind === 'auth') {
    view.page.show(route, { focus: true });
    return;
  }

  mount({
    kind: 'auth',
    page: createAuthPage(route, {
      onAuthenticated: () => navigate('checkout'),
      entrance: playAuthEntrance,
    }),
  });
  playAuthEntrance = false;
}

startRouter(render, guard);
