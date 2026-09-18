import { authFailure, type AuthProvider, type CurrentUserResult } from '@luvktest/test.auth-provider';
import { bearerTokenFrom } from './bearer-token.js';
import { authOf, requireAuth, requireSelf } from './auth-middleware.js';
import type { AuthedRequest, AuthedResponse } from './auth-middleware.js';

/**
 * A provider that answers whatever the test wants.
 *
 * The middleware's job is to turn an answer into an HTTP response and to stop
 * the handler when the answer is no — not to authenticate anything itself, so
 * a real provider here would only slow the spec down.
 */
function providerAnswering(answer: (token: string) => CurrentUserResult): AuthProvider {
  const notUsed = () => {
    throw new Error('the middleware must not call this');
  };
  return {
    name: 'stub',
    signUp: notUsed,
    confirmEmail: notUsed,
    resendConfirmation: notUsed,
    signIn: notUsed,
    refresh: notUsed,
    signOut: notUsed,
    async currentUser(accessToken: string) {
      return answer(accessToken);
    },
  } as unknown as AuthProvider;
}

const pilot = { id: 'u1', email: 'pilot@skyline.test', name: 'Pilot', emailConfirmed: true };

/** the provider the real one behaves like: one good token, everything else no. */
function provider(goodToken = 'good-token') {
  return providerAnswering((token) => {
    if (!token) return authFailure('no-token');
    if (token !== goodToken) return authFailure('invalid-token');
    return { ok: true, user: pilot, sessionId: 's1', expiresInSeconds: 900 };
  });
}

/** a response double that records the status, body and headers it was given. */
function fakeResponse() {
  const sent: { status?: number; body?: unknown; headers: Record<string, string> } = { headers: {} };
  const res: AuthedResponse = {
    status(code: number) {
      sent.status = code;
      return res;
    },
    json(body: unknown) {
      sent.body = body;
      return body;
    },
    set(field: string, value: string) {
      sent.headers[field] = value;
      return res;
    },
  };
  return { res, sent };
}

function body(sent: { body?: unknown }): { error?: string; code?: string } {
  return (sent.body ?? {}) as { error?: string; code?: string };
}

describe('bearerTokenFrom', () => {
  it('reads a normal header', () => {
    expect(bearerTokenFrom({ authorization: 'Bearer abc123' })).toEqual('abc123');
  });

  it('does not care about the case of the scheme', () => {
    expect(bearerTokenFrom({ authorization: 'bearer abc123' })).toEqual('abc123');
  });

  it('tolerates the capitalised header name and a duplicated header line', () => {
    expect(bearerTokenFrom({ Authorization: 'Bearer abc' })).toEqual('abc');
    expect(bearerTokenFrom({ authorization: ['Bearer abc', 'Bearer def'] })).toEqual('abc');
  });

  it('ignores surrounding whitespace', () => {
    expect(bearerTokenFrom({ authorization: '  Bearer   abc  ' })).toEqual('abc');
  });

  it('reads a non-bearer credential as no token at all', () => {
    expect(bearerTokenFrom({ authorization: 'Basic dXNlcjpwYXNz' })).toEqual(undefined);
  });

  it('refuses a bare token with no scheme', () => {
    expect(bearerTokenFrom({ authorization: 'abc123' })).toEqual(undefined);
  });

  it('refuses an empty bearer', () => {
    expect(bearerTokenFrom({ authorization: 'Bearer ' })).toEqual(undefined);
  });

  it('survives a request with no headers at all', () => {
    expect(bearerTokenFrom(undefined)).toEqual(undefined);
    expect(bearerTokenFrom({})).toEqual(undefined);
  });
});

describe('requireAuth', () => {
  it('attaches the caller and continues on a good token', async () => {
    const req: AuthedRequest = { headers: { authorization: 'Bearer good-token' } };
    const { res, sent } = fakeResponse();
    let continued = false;

    await requireAuth(provider())(req, res, () => {
      continued = true;
    });

    expect(continued).toEqual(true);
    expect(authOf(req)?.user.id).toEqual('u1');
    expect(authOf(req)?.sessionId).toEqual('s1');
    expect(sent.status).toEqual(undefined);
  });

  it('refuses with 401 and never calls the handler when there is no token', async () => {
    const { res, sent } = fakeResponse();
    let continued = false;

    await requireAuth(provider())({ headers: {} }, res, () => {
      continued = true;
    });

    expect(continued).toEqual(false);
    expect(sent.status).toEqual(401);
    expect(body(sent).code).toEqual('no-token');
  });

  it('refuses a forged token', async () => {
    const { res, sent } = fakeResponse();
    await requireAuth(provider())({ headers: { authorization: 'Bearer made-up' } }, res, () => {});
    expect(sent.status).toEqual(401);
    expect(body(sent).code).toEqual('invalid-token');
  });

  it('passes the provider’s code straight through, so a client can branch on it', async () => {
    const { res, sent } = fakeResponse();
    const expired = providerAnswering(() => authFailure('expired-access-token'));
    await requireAuth(expired)({ headers: { authorization: 'Bearer stale' } }, res, () => {});

    expect(sent.status).toEqual(401);
    expect(body(sent).code).toEqual('expired-access-token');
  });

  it('uses the status the refusal deserves, not always 401', async () => {
    const { res, sent } = fakeResponse();
    const unconfirmed = providerAnswering(() => authFailure('email-not-confirmed'));
    await requireAuth(unconfirmed)({ headers: { authorization: 'Bearer x' } }, res, () => {});
    expect(sent.status).toEqual(403);

    const { res: res2, sent: sent2 } = fakeResponse();
    const broken = providerAnswering(() => authFailure('unavailable'));
    await requireAuth(broken)({ headers: { authorization: 'Bearer x' } }, res2, () => {});
    expect(sent2.status).toEqual(503);
  });

  it('sends a WWW-Authenticate challenge naming the reason', async () => {
    const { res, sent } = fakeResponse();
    await requireAuth(provider())({ headers: {} }, res, () => {});
    expect(sent.headers['WWW-Authenticate']).toEqual('Bearer error="no-token"');
  });

  it('never echoes the token it refused', async () => {
    const { res, sent } = fakeResponse();
    await requireAuth(provider())({ headers: { authorization: 'Bearer hunter2' } }, res, () => {});
    expect(JSON.stringify(sent)).not.toContain('hunter2');
  });

  it('works when a response has no set() — the challenge is optional, the refusal is not', async () => {
    let status = 0;
    const bare = {
      status(code: number) {
        status = code;
        return bare;
      },
      json(value: unknown) {
        return value;
      },
    };
    await requireAuth(provider())({ headers: {} }, bare, () => {});
    expect(status).toEqual(401);
  });
});

describe('requireSelf', () => {
  const caller: AuthedRequest = {
    auth: { user: pilot, sessionId: 's1', expiresInSeconds: 900 },
  };

  it('lets a user touch their own account', () => {
    const { res, sent } = fakeResponse();
    expect(requireSelf(caller, res, 'u1')).toEqual(true);
    expect(sent.status).toEqual(undefined);
  });

  it('answers 403 when the path names somebody else', () => {
    const { res, sent } = fakeResponse();
    expect(requireSelf(caller, res, 'u2')).toEqual(false);
    expect(sent.status).toEqual(403);
    expect(body(sent).code).toEqual('forbidden');
  });

  it('refuses when nothing authenticated the request at all', () => {
    const { res, sent } = fakeResponse();
    expect(requireSelf({}, res, 'u1')).toEqual(false);
    expect(sent.status).toEqual(403);
  });

  it('refuses a missing target rather than treating it as a match', () => {
    const { res } = fakeResponse();
    expect(requireSelf(caller, res, undefined)).toEqual(false);
    expect(requireSelf(caller, res, '')).toEqual(false);
  });
});
