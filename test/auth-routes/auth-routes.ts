import {
  isAuthFailure,
  statusForAuthError,
  type AuthFailure,
  type AuthProvider,
  type AuthSession,
  type AuthUser,
} from '@luvktest/test.auth-provider';
import { authOf, requireAuth, requireSelf } from '@luvktest/test.auth-middleware';
import { AppLike, RouteRequest, RouteResponse, stringField } from './http-types.js';

/** one watched aircraft, as a client sees it. */
export type WatchedAircraft = {
  icao: string;
  callsign: string;
};

/**
 * The watchlist operations these routes need.
 *
 * Every method takes a user id, and the routes only ever pass the one that
 * came out of a verified token.
 */
export type Watchlists = {
  watchlist(userId: string): Promise<WatchedAircraft[]>;
  watch(userId: string, icao: string, callsign: string): Promise<void>;
  unwatch(userId: string, icao: string): Promise<void>;
};

/**
 * Everything the routes are wired to.
 *
 * `auth` is the interface, never an implementation — which is what makes
 * moving from your own sessions to a managed provider a change in a
 * deployment manifest rather than in this file.
 */
export type AuthRoutesDeps = {
  auth: AuthProvider;
  watchlists: Watchlists;
};

/** what a client gets back when it is handed a session. */
export type SessionResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  accessExpiresAt: string;
  refreshExpiresAt: string;
};

function sessionResponse(session: AuthSession): SessionResponse {
  return {
    user: session.user,
    accessToken: session.tokens.accessToken,
    refreshToken: session.tokens.refreshToken,
    tokenType: session.tokens.tokenType,
    expiresIn: session.tokens.expiresIn,
    accessExpiresAt: session.tokens.accessExpiresAt,
    refreshExpiresAt: session.tokens.refreshExpiresAt,
  };
}

/**
 * Wrap a handler so a rejected promise becomes an answer rather than an
 * unhandled rejection. Express 5 forwards async errors to `next`, but these
 * handlers are also driven directly by the spec, and a route that silently
 * hangs is worse than one that says it broke.
 */
function guarded(handler: (req: RouteRequest, res: RouteResponse) => Promise<void>) {
  return async (req: RouteRequest, res: RouteResponse): Promise<void> => {
    try {
      await handler(req, res);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'something went wrong';
      res.status(500).json({ error: message, code: 'unavailable' });
    }
  };
}

/**
 * Mount the authentication and watchlist routes on an Express app.
 *
 * The shape of the thing, in one paragraph. `/auth/signup` creates an account
 * and emails a confirmation link; it hands back **no session**, because the
 * account is not usable yet. `/auth/confirm` spends the link. `/auth/login`
 * then hands back an access token (minutes) and a refresh token (a fortnight).
 * `/auth/refresh` exchanges the refresh token for a new pair and retires the
 * old one. `/auth/logout` kills both immediately. Everything under `/me`
 * requires a valid access token and serves the user in that token, nobody else.
 *
 * `/signup`, `/login`, `/watch`, `/unwatch` and `/watchlist/:userId` are kept
 * as aliases for older clients — but they are not a way around the rules:
 * `/watchlist/:userId` answers 403 unless the id is the caller's own, and
 * `/watch` ignores any `userId` in the body entirely.
 *
 * @example
 * registerAuthRoutes(app, { auth, watchlists: sky });
 */
export function registerAuthRoutes(app: AppLike, deps: AuthRoutesDeps): void {
  const { auth, watchlists } = deps;
  const authed = requireAuth(auth);

  /** the caller's id, proved. Handlers run behind `authed`, so it is always set. */
  const callerId = (req: RouteRequest): string => authOf(req)?.user.id ?? '';

  /**
   * Answer a provider refusal with the status it deserves.
   *
   * The mapping lives in the provider component, not here, so every transport
   * answers the same way and a new code cannot be added without deciding what
   * it means on the wire.
   */
  const refuse = (res: RouteResponse, failure: AuthFailure): void => {
    if (failure.retryAfterSeconds !== undefined) {
      res.set?.('Retry-After', String(failure.retryAfterSeconds));
    }
    res.status(statusForAuthError(failure.code)).json({
      error: failure.message,
      code: failure.code,
      retryAfterSeconds: failure.retryAfterSeconds,
    });
  };

  const signup = guarded(async (req, res) => {
    const result = await auth.signUp({
      email: stringField(req.body, 'email'),
      name: stringField(req.body, 'name'),
      password: stringField(req.body, 'password'),
    });
    if (isAuthFailure(result)) {
      refuse(res, result);
      return;
    }
    // 202: we have accepted the request, and the account does not exist as far
    // as anyone is concerned until the link in the email is clicked.
    res.status(202).json({ ok: true, next: result.next });
  });

  const login = guarded(async (req, res) => {
    const result = await auth.signIn({
      email: stringField(req.body, 'email'),
      password: stringField(req.body, 'password'),
    });
    if (isAuthFailure(result)) {
      refuse(res, result);
      return;
    }
    res.status(200).json(sessionResponse(result));
  });

  const confirm = guarded(async (req, res) => {
    // A link carries the token in the query; a confirmation page posts it.
    const token = stringField(req.body, 'token') || String(req.query?.token ?? '');
    const result = await auth.confirmEmail(token);
    if (isAuthFailure(result)) {
      refuse(res, result);
      return;
    }
    res.status(200).json({ ok: true, user: result.user });
  });

  app.post('/auth/signup', signup);
  app.post('/signup', signup);
  app.post('/auth/login', login);
  app.post('/login', login);
  app.get('/auth/confirm', confirm);
  app.post('/auth/confirm', confirm);

  app.post(
    '/auth/resend-confirmation',
    guarded(async (req, res) => {
      const result = await auth.resendConfirmation(stringField(req.body, 'email'));
      if (isAuthFailure(result)) {
        refuse(res, result);
        return;
      }
      res.status(200).json({ ok: true });
    })
  );

  app.post(
    '/auth/refresh',
    guarded(async (req, res) => {
      const result = await auth.refresh(stringField(req.body, 'refreshToken'));
      if (isAuthFailure(result)) {
        refuse(res, result);
        return;
      }
      res.status(200).json(sessionResponse(result));
    })
  );

  app.post(
    '/auth/logout',
    guarded(async (req, res) => {
      // Always 200. Whether the token was live, already dead or never existed
      // is not the client's business, and "sign me out" has one honest answer.
      await auth.signOut(stringField(req.body, 'refreshToken'));
      res.status(200).json({ ok: true });
    })
  );

  app.get(
    '/auth/me',
    authed,
    guarded(async (req, res) => {
      res.status(200).json({ user: authOf(req)?.user });
    })
  );

  const readWatchlist = guarded(async (req, res) => {
    res.status(200).json({ watching: await watchlists.watchlist(callerId(req)) });
  });

  app.get('/me/watchlist', authed, readWatchlist);

  // Kept for older clients. The id in the path is now checked against the
  // token rather than trusted — previously any id at all was served.
  app.get(
    '/watchlist/:userId',
    authed,
    guarded(async (req, res) => {
      if (!requireSelf(req, res, req.params?.userId)) return;
      await readWatchlist(req, res);
    })
  );

  const watch = guarded(async (req, res) => {
    const icao = stringField(req.body, 'icao');
    if (!icao) {
      res.status(400).json({ error: 'which aircraft?', code: 'bad-request' });
      return;
    }
    // Note what is not read here: any user id from the body. The token decides.
    await watchlists.watch(callerId(req), icao, stringField(req.body, 'callsign'));
    res.status(201).json({ watching: await watchlists.watchlist(callerId(req)) });
  });

  const unwatch = guarded(async (req, res) => {
    const icao = stringField(req.body, 'icao');
    if (!icao) {
      res.status(400).json({ error: 'which aircraft?', code: 'bad-request' });
      return;
    }
    await watchlists.unwatch(callerId(req), icao);
    res.status(200).json({ watching: await watchlists.watchlist(callerId(req)) });
  });

  app.post('/me/watch', authed, watch);
  app.post('/watch', authed, watch);
  app.post('/me/unwatch', authed, unwatch);
  app.post('/unwatch', authed, unwatch);
}
