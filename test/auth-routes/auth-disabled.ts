import type { AppLike, RouteHandler } from './http-types.js';

/**
 * Every path `registerAuthRoutes` claims.
 *
 * Kept next to the routes themselves so the disabled variant cannot drift out
 * of step and leave one path unguarded.
 */
export const AUTH_ROUTE_PATHS: { method: 'get' | 'post'; path: string }[] = [
  { method: 'post', path: '/auth/signup' },
  { method: 'post', path: '/signup' },
  { method: 'post', path: '/auth/login' },
  { method: 'post', path: '/login' },
  { method: 'get', path: '/auth/confirm' },
  { method: 'post', path: '/auth/confirm' },
  { method: 'post', path: '/auth/resend-confirmation' },
  { method: 'post', path: '/auth/refresh' },
  { method: 'post', path: '/auth/logout' },
  { method: 'get', path: '/auth/me' },
  { method: 'get', path: '/me/watchlist' },
  { method: 'get', path: '/watchlist/:userId' },
  { method: 'post', path: '/me/watch' },
  { method: 'post', path: '/watch' },
  { method: 'post', path: '/me/unwatch' },
  { method: 'post', path: '/unwatch' },
];

/**
 * Mount the same paths, all answering 503.
 *
 * This is what fail-closed looks like when the signing secret is missing. The
 * alternative — booting with a generated or default secret — would produce an
 * app that appears to authenticate people and does not, which is strictly
 * worse than one that says it cannot.
 *
 * Public routes are untouched: the flight map still works, nobody can sign in,
 * and no request is ever served as a user.
 *
 * @param reason the message from `MissingAuthSecretError`, so the operator can
 *               read the fix out of the response instead of out of the source.
 */
export function registerAuthDisabledRoutes(app: AppLike, reason: string): void {
  const unavailable: RouteHandler = (_req, res) => {
    res.status(503).json({ error: 'authentication is not configured', code: 'auth-unavailable', reason });
  };

  for (const route of AUTH_ROUTE_PATHS) {
    if (route.method === 'get') app.get(route.path, unavailable);
    else app.post(route.path, unavailable);
  }
}
