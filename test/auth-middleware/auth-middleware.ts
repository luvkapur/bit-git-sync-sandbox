import {
  isAuthFailure,
  statusForAuthError,
  type AuthErrorCode,
  type AuthProvider,
  type AuthUser,
} from '@luvktest/test.auth-provider';
import { bearerTokenFrom, HeadersLike } from './bearer-token.js';

/**
 * Who the caller is, once a token has checked out.
 *
 * This — and only this — is what downstream handlers may use to decide whose
 * data they are touching. Never a path parameter, never a field in the body.
 */
export type AuthContext = {
  user: AuthUser;
  /** the provider's id for this session, for logs. */
  sessionId: string;
  /** seconds of access-token life left, handy for a warning header. */
  expiresInSeconds: number;
};

/** the request fields this middleware touches. Structurally an Express request. */
export type AuthedRequest = {
  headers?: HeadersLike;
  auth?: AuthContext;
};

/** the response fields this middleware touches. Structurally an Express response. */
export type AuthedResponse = {
  status(code: number): AuthedResponse;
  json(body: unknown): unknown;
  set?(field: string, value: string): unknown;
};

/** Express's `next`, without importing Express. */
export type NextFunction = (error?: unknown) => void;

/** the shape of a refusal on the wire. */
export type AuthErrorBody = {
  error: string;
  code: AuthErrorCode;
};

/**
 * Read the authenticated caller off a request.
 *
 * Returns undefined if `requireAuth` did not run, which is why handlers should
 * narrow rather than assume.
 */
export function authOf(req: AuthedRequest): AuthContext | undefined {
  return req.auth;
}

/**
 * Express middleware: require a valid access token, or refuse the request.
 *
 * It depends on {@link AuthProvider}, not on any implementation — the same
 * middleware works over your own sessions or a managed provider, and swapping
 * between them changes nothing here.
 *
 * On success it attaches {@link AuthContext} to `req.auth` and calls `next`.
 * On failure it answers — 401 for most refusals — and calls nothing else, so
 * there is no path on which a handler reads an identity that was not proved.
 *
 * @example
 * app.get('/me/watchlist', requireAuth(auth), async (req, res) => {
 *   res.json({ watching: await sky.watchlist(req.auth.user.id) });
 * });
 */
export function requireAuth(auth: AuthProvider) {
  return async function authenticate(
    req: AuthedRequest,
    res: AuthedResponse,
    next: NextFunction
  ): Promise<void> {
    const outcome = await auth.currentUser(bearerTokenFrom(req.headers) ?? '');

    if (isAuthFailure(outcome)) {
      // RFC 6750: a 401 owes the client a challenge, and naming the reason in
      // it is what lets a generic HTTP client tell "refresh me" from "I am
      // simply not welcome here".
      res.set?.('WWW-Authenticate', `Bearer error="${outcome.code}"`);
      const body: AuthErrorBody = { error: outcome.message, code: outcome.code };
      res.status(statusForAuthError(outcome.code)).json(body);
      return;
    }

    req.auth = {
      user: outcome.user,
      sessionId: outcome.sessionId,
      expiresInSeconds: outcome.expiresInSeconds,
    };
    next();
  };
}

/**
 * Refuse a request that is authenticated as somebody else.
 *
 * Authentication says who is calling; this says whether they may touch the
 * thing they named. Kept separate because conflating the two is exactly the
 * bug this replaces — a route that trusted `:userId` was authenticated and
 * still let anyone read anyone's data.
 *
 * @returns true if the request may proceed. When it returns false it has
 *          already answered 403, and the caller must return immediately.
 */
export function requireSelf(
  req: AuthedRequest,
  res: AuthedResponse,
  userId: string | undefined
): boolean {
  const auth = authOf(req);
  if (auth && userId && auth.user.id === userId) return true;
  res.status(403).json({ error: 'that is not your account', code: 'forbidden' });
  return false;
}
