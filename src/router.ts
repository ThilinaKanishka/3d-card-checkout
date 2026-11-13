/**
 * Minimal typed hash router: #/login, #/signup, #/checkout.
 */

export type Route = 'login' | 'signup' | 'checkout';

export const ROUTES: readonly Route[] = ['login', 'signup', 'checkout'];
export const DEFAULT_ROUTE: Route = 'login';

/** Maps a requested route to the route that should actually be shown (e.g. auth redirects). */
export type RouteGuard = (requested: Route) => Route;
export type RouteRenderer = (route: Route) => void;

function isRoute(value: string): value is Route {
  return (ROUTES as readonly string[]).includes(value);
}

/** Parses "#/signup" → "signup". Returns null for anything unrecognised. */
export function parseHash(hash: string): Route | null {
  const match = /^#\/([a-z]+)\/?$/.exec(hash);
  const name = match?.[1];
  return name !== undefined && isRoute(name) ? name : null;
}

/** Builds the href for a route, e.g. "#/checkout". */
export function routeHref(route: Route): string {
  return `#/${route}`;
}

/**
 * Navigates to a route. With `replace`, the current history entry is
 * overwritten (used for redirects so Back doesn't bounce the user).
 */
export function navigate(route: Route, { replace = false }: { replace?: boolean } = {}): void {
  const href = routeHref(route);
  if (window.location.hash === href) return;

  if (replace) {
    history.replaceState(null, '', href);
    // replaceState doesn't fire hashchange, so notify the router ourselves.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = href;
  }
}

/**
 * Starts listening for hash changes and renders the current route.
 *
 * @returns A function that stops the router.
 */
export function startRouter(render: RouteRenderer, guard: RouteGuard): () => void {
  function resolve(): void {
    const requested = parseHash(window.location.hash) ?? DEFAULT_ROUTE;
    const allowed = guard(requested);

    // Redirect (unknown hash, or blocked by the guard). The replace triggers resolve() again.
    if (routeHref(allowed) !== window.location.hash) {
      navigate(allowed, { replace: true });
      return;
    }
    render(allowed);
  }

  window.addEventListener('hashchange', resolve);
  resolve();
  return () => window.removeEventListener('hashchange', resolve);
}
