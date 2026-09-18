import { MIN_AUTH_SECRET_LENGTH } from '@luvktest/test.token-crypto';
import { MemorySessionStore, SessionManager } from '@luvktest/test.session-manager';
import { ConfirmationManager, MemoryConfirmationStore } from '@luvktest/test.email-confirmation';
import type { MailMessage, Mailer } from '@luvktest/test.mailer';
import {
  LocalAuthProvider,
  MemoryAccountStore,
  authLinksFrom,
} from '@luvktest/test.local-auth-provider';
import { registerAuthRoutes, WatchedAircraft, Watchlists } from './auth-routes.js';
import { AUTH_ROUTE_PATHS, registerAuthDisabledRoutes } from './auth-disabled.js';
import type { AppLike, RouteHandler, RouteRequest, RouteResponse } from './http-types.js';

const SECRET = 'r'.repeat(MIN_AUTH_SECRET_LENGTH);
const EMAIL = 'pilot@skyline.test';
const PASSWORD = 'correct-horse';

type Reply = { status: number; body: Record<string, unknown>; headers: Record<string, string> };

/**
 * The smallest thing that behaves like an Express app: it records the handler
 * chain per route and runs it, honouring `next()` and stopping the moment a
 * handler answers. Enough to prove that the middleware really does prevent a
 * handler from running, which is the property that matters here.
 */
function fakeApp() {
  const routes = new Map<string, RouteHandler[]>();
  const app: AppLike = {
    get(path: string, ...handlers: RouteHandler[]) {
      routes.set(`GET ${path}`, handlers);
      return app;
    },
    post(path: string, ...handlers: RouteHandler[]) {
      routes.set(`POST ${path}`, handlers);
      return app;
    },
  };

  async function request(
    key: string,
    options: {
      token?: string;
      body?: unknown;
      params?: Record<string, string>;
      query?: Record<string, unknown>;
    } = {}
  ): Promise<Reply> {
    const handlers = routes.get(key);
    if (!handlers) throw new Error(`no route registered for ${key}`);

    const req: RouteRequest = {
      headers: options.token ? { authorization: `Bearer ${options.token}` } : {},
      body: options.body,
      params: options.params,
      query: options.query,
    };
    const reply: Reply = { status: 200, body: {}, headers: {} };
    let answered = false;
    const res: RouteResponse = {
      status(code: number) {
        reply.status = code;
        return res;
      },
      json(value: unknown) {
        answered = true;
        reply.body = (value ?? {}) as Record<string, unknown>;
        return value;
      },
      set(field: string, value: string) {
        reply.headers[field] = value;
        return res;
      },
    };

    for (const handler of handlers) {
      let advanced = false;
      // eslint-disable-next-line no-await-in-loop
      await handler(req, res, () => {
        advanced = true;
      });
      if (answered) return reply;
      if (!advanced) break;
    }
    return reply;
  }

  return { app, request, paths: () => Array.from(routes.keys()) };
}

function recordingMailer() {
  const sent: MailMessage[] = [];
  const mailer: Mailer = {
    name: 'recording',
    isConfigured: () => true,
    async send(message) {
      sent.push(message);
    },
  };
  return { mailer, sent, last: () => sent[sent.length - 1] };
}

function fakeWatchlists() {
  const rows = new Map<string, WatchedAircraft[]>();
  const watchlists: Watchlists = {
    async watchlist(userId) {
      return rows.get(userId) ?? [];
    },
    async watch(userId, icao, callsign) {
      rows.set(userId, [...(rows.get(userId) ?? []).filter((it) => it.icao !== icao), { icao, callsign }]);
    },
    async unwatch(userId, icao) {
      rows.set(userId, (rows.get(userId) ?? []).filter((it) => it.icao !== icao));
    },
  };
  return { watchlists, seed: (userId: string, list: WatchedAircraft[]) => rows.set(userId, list) };
}

/**
 * The real stack behind the routes: real provider, real sessions, real
 * confirmations, real bcrypt — only storage and the mail transport are in
 * memory. What is being tested here is the wiring, and wiring against a stub
 * proves only that the stub was called.
 */
function harness() {
  const { app, request, paths } = fakeApp();
  const { watchlists, seed } = fakeWatchlists();
  const mail = recordingMailer();
  let now = new Date('2026-09-17T12:00:00.000Z');
  const clock = () => new Date(now);

  const auth = new LocalAuthProvider({
    accounts: new MemoryAccountStore(),
    sessions: new SessionManager(new MemorySessionStore(), SECRET, { now: clock }),
    confirmations: new ConfirmationManager(new MemoryConfirmationStore(), SECRET, { now: clock }),
    mailer: mail.mailer,
    links: authLinksFrom('https://skyline.test'),
    now: clock,
  });

  registerAuthRoutes(app, { auth, watchlists });

  return {
    request,
    paths,
    mail,
    seed,
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms);
    },
  };
}

const tokenFrom = (mail: ReturnType<typeof recordingMailer>) =>
  /token=([A-Za-z0-9_%-]+)/.exec(mail.last()?.text ?? '')?.[1] ?? '';

/** sign up, click the link, sign in — what most tests need to start from. */
async function signedIn(h: ReturnType<typeof harness>) {
  await h.request('POST /auth/signup', { body: { email: EMAIL, name: 'Pilot', password: PASSWORD } });
  await h.request('GET /auth/confirm', { query: { token: tokenFrom(h.mail) } });
  const reply = await h.request('POST /auth/login', { body: { email: EMAIL, password: PASSWORD } });
  return {
    userId: (reply.body.user as { id: string }).id,
    accessToken: reply.body.accessToken as string,
    refreshToken: reply.body.refreshToken as string,
  };
}

describe('signing up', () => {
  it('accepts the request and hands back no session at all', async () => {
    const h = harness();
    const reply = await h.request('POST /auth/signup', {
      body: { email: EMAIL, name: 'Pilot', password: PASSWORD },
    });

    expect(reply.status).toEqual(202);
    expect(reply.body).toEqual({ ok: true, next: 'confirmation-sent' });
    expect(JSON.stringify(reply.body)).not.toContain('accessToken');
  });

  it('emails a confirmation link', async () => {
    const h = harness();
    await h.request('POST /auth/signup', { body: { email: EMAIL, name: 'Pilot', password: PASSWORD } });
    expect(h.mail.last()?.text).toContain('https://skyline.test/auth/confirm?token=');
  });

  it('refuses a short password with a 400 and a reason', async () => {
    const h = harness();
    const reply = await h.request('POST /auth/signup', {
      body: { email: EMAIL, name: 'Pilot', password: 'short' },
    });
    expect(reply.status).toEqual(400);
    expect(reply.body.code).toEqual('weak-password');
  });

  it('answers an address that already exists exactly as it answers a new one', async () => {
    const h = harness();
    const first = await h.request('POST /auth/signup', {
      body: { email: EMAIL, name: 'Pilot', password: PASSWORD },
    });
    const second = await h.request('POST /auth/signup', {
      body: { email: EMAIL, name: 'Impostor', password: 'another-password' },
    });
    expect(second).toEqual(first);
  });

  it('survives a request with no body at all', async () => {
    const h = harness();
    expect((await h.request('POST /auth/signup', {})).status).toEqual(400);
  });

  it('still answers the old /signup path', async () => {
    const h = harness();
    expect(
      (await h.request('POST /signup', { body: { email: EMAIL, name: 'Pilot', password: PASSWORD } })).status
    ).toEqual(202);
  });
});

describe('confirming', () => {
  it('activates the account from a link in an email', async () => {
    const h = harness();
    await h.request('POST /auth/signup', { body: { email: EMAIL, name: 'Pilot', password: PASSWORD } });

    const reply = await h.request('GET /auth/confirm', { query: { token: tokenFrom(h.mail) } });
    expect(reply.status).toEqual(200);
    expect((reply.body.user as { emailConfirmed: boolean }).emailConfirmed).toEqual(true);
  });

  it('accepts the token in a post body too, for a confirmation page', async () => {
    const h = harness();
    await h.request('POST /auth/signup', { body: { email: EMAIL, name: 'Pilot', password: PASSWORD } });

    expect((await h.request('POST /auth/confirm', { body: { token: tokenFrom(h.mail) } })).status).toEqual(200);
  });

  it('answers 410 for a link that has already been used', async () => {
    const h = harness();
    await h.request('POST /auth/signup', { body: { email: EMAIL, name: 'Pilot', password: PASSWORD } });
    const token = tokenFrom(h.mail);
    await h.request('GET /auth/confirm', { query: { token } });

    const again = await h.request('GET /auth/confirm', { query: { token } });
    expect(again.status).toEqual(410);
    expect(again.body.code).toEqual('confirmation-already-used');
  });

  it('answers 410 with a different code for one that has expired', async () => {
    const h = harness();
    await h.request('POST /auth/signup', { body: { email: EMAIL, name: 'Pilot', password: PASSWORD } });
    const token = tokenFrom(h.mail);
    h.advance(25 * 60 * 60 * 1000);

    const reply = await h.request('GET /auth/confirm', { query: { token } });
    expect(reply.status).toEqual(410);
    expect(reply.body.code).toEqual('expired-confirmation');
  });

  it('answers 400 for a link that is not one', async () => {
    const h = harness();
    const reply = await h.request('GET /auth/confirm', { query: { token: 'made-up' } });
    expect(reply.status).toEqual(400);
    expect(reply.body.code).toEqual('invalid-confirmation');
  });
});

describe('resending', () => {
  it('answers the same for a known and an unknown address', async () => {
    const h = harness();
    await h.request('POST /auth/signup', { body: { email: EMAIL, name: 'Pilot', password: PASSWORD } });

    const known = await h.request('POST /auth/resend-confirmation', { body: { email: EMAIL } });
    const unknown = await h.request('POST /auth/resend-confirmation', { body: { email: 'nobody@skyline.test' } });
    expect(known).toEqual(unknown);
    expect(known.status).toEqual(200);
  });

  it('answers 429 with a Retry-After once the limit is hit', async () => {
    const h = harness();
    await h.request('POST /auth/signup', { body: { email: EMAIL, name: 'Pilot', password: PASSWORD } });
    await h.request('POST /auth/resend-confirmation', { body: { email: EMAIL } });
    await h.request('POST /auth/resend-confirmation', { body: { email: EMAIL } });

    const limited = await h.request('POST /auth/resend-confirmation', { body: { email: EMAIL } });
    expect(limited.status).toEqual(429);
    expect(limited.body.code).toEqual('rate-limited');
    expect(Number(limited.headers['Retry-After'])).toBeGreaterThan(0);
  });
});

describe('signing in', () => {
  it('refuses an unconfirmed account with 403 and says why', async () => {
    const h = harness();
    await h.request('POST /auth/signup', { body: { email: EMAIL, name: 'Pilot', password: PASSWORD } });

    const reply = await h.request('POST /auth/login', { body: { email: EMAIL, password: PASSWORD } });
    expect(reply.status).toEqual(403);
    expect(reply.body.code).toEqual('email-not-confirmed');
    expect(reply.body.accessToken).toEqual(undefined);
  });

  it('hands back a session once the link has been clicked', async () => {
    const h = harness();
    const me = await signedIn(h);
    expect(typeof me.accessToken).toEqual('string');
    expect(typeof me.refreshToken).toEqual('string');
  });

  it('answers a wrong password exactly as it answers an unknown address', async () => {
    const h = harness();
    await signedIn(h);
    const wrong = await h.request('POST /auth/login', { body: { email: EMAIL, password: 'wrong' } });
    const missing = await h.request('POST /auth/login', {
      body: { email: 'nobody@skyline.test', password: 'wrong' },
    });
    expect(wrong).toEqual(missing);
    expect(wrong.status).toEqual(401);
  });
});

describe('the watchlist belongs to the token, not to the path', () => {
  it('refuses an unauthenticated read', async () => {
    const h = harness();
    const reply = await h.request('GET /me/watchlist');
    expect(reply.status).toEqual(401);
    expect(reply.body.code).toEqual('no-token');
  });

  it('serves the caller their own list', async () => {
    const h = harness();
    const me = await signedIn(h);
    h.seed(me.userId, [{ icao: 'a48850', callsign: 'UPS257' }]);

    const reply = await h.request('GET /me/watchlist', { token: me.accessToken });
    expect(reply.status).toEqual(200);
    expect(reply.body.watching).toEqual([{ icao: 'a48850', callsign: 'UPS257' }]);
  });

  it('refuses to serve somebody else even to a perfectly valid token', async () => {
    const h = harness();
    const me = await signedIn(h);
    h.seed('someone-else', [{ icao: 'secret', callsign: 'SECRET1' }]);

    const reply = await h.request('GET /watchlist/:userId', {
      token: me.accessToken,
      params: { userId: 'someone-else' },
    });
    expect(reply.status).toEqual(403);
    expect(reply.body.watching).toEqual(undefined);
  });

  it('still serves the legacy path when the id is the caller’s own', async () => {
    const h = harness();
    const me = await signedIn(h);
    h.seed(me.userId, [{ icao: 'a48850', callsign: 'UPS257' }]);

    const reply = await h.request('GET /watchlist/:userId', {
      token: me.accessToken,
      params: { userId: me.userId },
    });
    expect(reply.status).toEqual(200);
  });

  it('ignores a user id in the body of a watch — the token decides', async () => {
    const h = harness();
    const me = await signedIn(h);

    const reply = await h.request('POST /watch', {
      token: me.accessToken,
      body: { userId: 'someone-else', icao: 'a48850', callsign: 'UPS257' },
    });

    expect(reply.status).toEqual(201);
    expect(reply.body.watching).toEqual([{ icao: 'a48850', callsign: 'UPS257' }]);
  });

  it('refuses an unauthenticated watch, and asks which aircraft when told nothing', async () => {
    const h = harness();
    expect((await h.request('POST /me/watch', { body: { icao: 'a48850' } })).status).toEqual(401);

    const me = await signedIn(h);
    expect((await h.request('POST /me/watch', { token: me.accessToken, body: {} })).status).toEqual(400);
  });

  it('unwatches', async () => {
    const h = harness();
    const me = await signedIn(h);
    await h.request('POST /me/watch', { token: me.accessToken, body: { icao: 'a48850' } });

    const reply = await h.request('POST /me/unwatch', { token: me.accessToken, body: { icao: 'a48850' } });
    expect(reply.status).toEqual(200);
    expect(reply.body.watching).toEqual([]);
  });
});

describe('refreshing', () => {
  it('lets an expired access token be replaced without a password', async () => {
    const h = harness();
    const me = await signedIn(h);
    h.advance(16 * 60 * 1000);

    const stale = await h.request('GET /me/watchlist', { token: me.accessToken });
    expect(stale.status).toEqual(401);
    expect(stale.body.code).toEqual('expired-access-token');

    const refreshed = await h.request('POST /auth/refresh', { body: { refreshToken: me.refreshToken } });
    expect(refreshed.status).toEqual(200);
    expect(refreshed.body.refreshToken).not.toEqual(me.refreshToken);

    const retried = await h.request('GET /me/watchlist', { token: refreshed.body.accessToken as string });
    expect(retried.status).toEqual(200);
  });

  it('fails closed when a spent refresh token comes back, and ends the session', async () => {
    const h = harness();
    const me = await signedIn(h);
    const refreshed = await h.request('POST /auth/refresh', { body: { refreshToken: me.refreshToken } });

    const replay = await h.request('POST /auth/refresh', { body: { refreshToken: me.refreshToken } });
    expect(replay.status).toEqual(401);
    expect(replay.body.code).toEqual('token-reused');

    const after = await h.request('GET /me/watchlist', { token: refreshed.body.accessToken as string });
    expect(after.status).toEqual(401);
    expect(after.body.code).toEqual('revoked');
  });

  it('refuses a refresh token nobody issued', async () => {
    const h = harness();
    const reply = await h.request('POST /auth/refresh', { body: { refreshToken: 'made-up' } });
    expect(reply.status).toEqual(401);
    expect(reply.body.code).toEqual('invalid-token');
  });
});

describe('signing out', () => {
  it('kills the access token immediately, not in fifteen minutes', async () => {
    const h = harness();
    const me = await signedIn(h);

    expect((await h.request('POST /auth/logout', { body: { refreshToken: me.refreshToken } })).status).toEqual(200);

    const after = await h.request('GET /me/watchlist', { token: me.accessToken });
    expect(after.status).toEqual(401);
    expect(after.body.code).toEqual('revoked');
  });

  it('answers the same for a token it has never seen', async () => {
    const h = harness();
    const reply = await h.request('POST /auth/logout', { body: { refreshToken: 'made-up' } });
    expect(reply.status).toEqual(200);
    expect(reply.body).toEqual({ ok: true });
  });
});

describe('who am i', () => {
  it('answers with the account behind the token', async () => {
    const h = harness();
    const me = await signedIn(h);
    const reply = await h.request('GET /auth/me', { token: me.accessToken });
    expect((reply.body.user as { id: string }).id).toEqual(me.userId);
  });

  it('refuses without one', async () => {
    const h = harness();
    expect((await h.request('GET /auth/me')).status).toEqual(401);
  });
});

describe('when the signing secret is missing', () => {
  it('answers 503 on every route the real wiring would have claimed', async () => {
    const { app, request, paths } = fakeApp();
    registerAuthDisabledRoutes(app, 'SKYLINE_AUTH_SECRET is not set.');

    expect(paths().length).toEqual(AUTH_ROUTE_PATHS.length);
    for (const key of paths()) {
      // eslint-disable-next-line no-await-in-loop
      const reply = await request(key, { body: { email: EMAIL, password: PASSWORD } });
      expect(reply.status).toEqual(503);
      expect(reply.body.code).toEqual('auth-unavailable');
    }
  });

  it('covers exactly the paths the live routes register', async () => {
    const live = harness();
    const disabled = fakeApp();
    registerAuthDisabledRoutes(disabled.app, 'nope');
    expect(disabled.paths().sort()).toEqual(live.paths().sort());
  });
});
