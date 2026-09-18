import { MIN_AUTH_SECRET_LENGTH } from '@luvktest/test.token-crypto';
import { MemorySessionStore } from './memory-session-store.js';
import { SessionManager } from './session-manager.js';
import { DEFAULT_SESSION_LIFETIMES } from './session-lifetimes.js';
import type { AuthFailure, IssuedSession } from './session-manager.js';

const SECRET = 's'.repeat(MIN_AUTH_SECRET_LENGTH);
const START = new Date('2026-09-17T12:00:00.000Z');

/** a manager with a clock we can wind forward and ids we can read. */
function harness() {
  const store = new MemorySessionStore();
  let now = new Date(START);
  let seq = 0;
  const sessions = new SessionManager(store, SECRET, {
    now: () => new Date(now),
    newId: () => `id-${(seq += 1)}`,
  });
  return {
    store,
    sessions,
    advance(ms: number) {
      now = new Date(now.getTime() + ms);
    },
    at: () => new Date(now),
  };
}

const minutes = (n: number) => n * 60 * 1000;
const days = (n: number) => n * 24 * 60 * minutes(1);

function failure(outcome: { ok: boolean }): AuthFailure {
  if (outcome.ok) throw new Error('expected a refusal, got a success');
  return outcome as AuthFailure;
}

function issued(outcome: { ok: boolean }): IssuedSession {
  if (!outcome.ok) throw new Error(`expected tokens, got ${(outcome as AuthFailure).code}`);
  return outcome as IssuedSession;
}

describe('signing in', () => {
  it('hands back a pair of tokens that are not each other', async () => {
    const h = harness();
    const s = await h.sessions.signIn('u1');
    expect(s.accessToken).not.toEqual(s.refreshToken);
    expect(s.tokenType).toEqual('Bearer');
  });

  it('never stores a raw token', async () => {
    const h = harness();
    const s = await h.sessions.signIn('u1');
    const stored = JSON.stringify(h.store.all());
    expect(stored).not.toContain(s.accessToken);
    expect(stored).not.toContain(s.refreshToken);
  });

  it('reports the access lifetime in seconds', async () => {
    const h = harness();
    const s = await h.sessions.signIn('u1');
    expect(s.expiresIn).toEqual(DEFAULT_SESSION_LIFETIMES.accessTtlMs / 1000);
  });

  it('gives two sign-ins separate families, so signing out of one keeps the other', async () => {
    const h = harness();
    const laptop = await h.sessions.signIn('u1');
    const phone = await h.sessions.signIn('u1');

    await h.sessions.signOut(laptop.refreshToken);

    expect(failure(await h.sessions.authenticate(laptop.accessToken)).code).toEqual('revoked');
    expect((await h.sessions.authenticate(phone.accessToken)).ok).toEqual(true);
  });
});

describe('authenticating', () => {
  it('identifies the user behind a fresh access token', async () => {
    const h = harness();
    const s = await h.sessions.signIn('u1');
    const who = await h.sessions.authenticate(s.accessToken);
    expect(who.ok && who.userId).toEqual('u1');
  });

  it('refuses a missing token', async () => {
    const h = harness();
    expect(failure(await h.sessions.authenticate(undefined)).code).toEqual('no-token');
  });

  it('refuses a token nobody issued', async () => {
    const h = harness();
    await h.sessions.signIn('u1');
    expect(failure(await h.sessions.authenticate('made-up')).code).toEqual('invalid-token');
  });

  it('refuses a token signed with a different secret', async () => {
    const h = harness();
    const s = await h.sessions.signIn('u1');
    const other = new SessionManager(h.store, `${SECRET}-different`);
    expect(failure(await other.authenticate(s.accessToken)).code).toEqual('invalid-token');
  });

  it('expires the access token after fifteen minutes, and says so distinctly', async () => {
    const h = harness();
    const s = await h.sessions.signIn('u1');
    h.advance(minutes(15) + 1);
    expect(failure(await h.sessions.authenticate(s.accessToken)).code).toEqual('expired-access-token');
  });

  it('still honours it one second before expiry', async () => {
    const h = harness();
    const s = await h.sessions.signIn('u1');
    h.advance(minutes(15) - 1000);
    expect((await h.sessions.authenticate(s.accessToken)).ok).toEqual(true);
  });
});

describe('refreshing', () => {
  it('lets an expired access token be replaced without a password', async () => {
    const h = harness();
    const first = await h.sessions.signIn('u1');
    h.advance(minutes(20));
    expect(failure(await h.sessions.authenticate(first.accessToken)).code).toEqual('expired-access-token');

    const second = issued(await h.sessions.refresh(first.refreshToken));
    const who = await h.sessions.authenticate(second.accessToken);
    expect(who.ok && who.userId).toEqual('u1');
  });

  it('rotates: the new pair is new, and the old access token is dead at once', async () => {
    const h = harness();
    const first = await h.sessions.signIn('u1');
    h.advance(minutes(1));
    const second = issued(await h.sessions.refresh(first.refreshToken));

    expect(second.accessToken).not.toEqual(first.accessToken);
    expect(second.refreshToken).not.toEqual(first.refreshToken);
    expect(failure(await h.sessions.authenticate(first.accessToken)).code).toEqual('expired-access-token');
  });

  it('keeps the session in one family across rotations', async () => {
    const h = harness();
    const first = await h.sessions.signIn('u1');
    const second = issued(await h.sessions.refresh(first.refreshToken));
    issued(await h.sessions.refresh(second.refreshToken));

    const families = new Set(h.store.all().map((row) => row.familyId));
    expect(families.size).toEqual(1);
    expect(h.store.all().map((row) => row.generation)).toEqual([0, 1, 2]);
  });

  it('refuses a refresh token nobody issued', async () => {
    const h = harness();
    expect(failure(await h.sessions.refresh('made-up')).code).toEqual('invalid-token');
  });

  it('refuses once the refresh token is a fortnight old', async () => {
    const h = harness();
    const s = await h.sessions.signIn('u1');
    h.advance(days(14) + 1000);
    expect(failure(await h.sessions.refresh(s.refreshToken)).code).toEqual('expired-session');
  });

  it('stops at the ninety-day ceiling however diligently it refreshed', async () => {
    const h = harness();
    let current = await h.sessions.signIn('u1');
    // a client that dutifully refreshes every ten days, well inside the
    // fortnight, still reaches the end of the road at ninety days.
    for (let i = 0; i < 8; i += 1) {
      h.advance(days(10));
      current = issued(await h.sessions.refresh(current.refreshToken));
    }
    h.advance(days(10) + 1000);
    expect(failure(await h.sessions.refresh(current.refreshToken)).code).toEqual('expired-session');
  });

  it('never issues a token that outlives the ceiling', async () => {
    const h = harness();
    let current = await h.sessions.signIn('u1');
    for (let i = 0; i < 8; i += 1) {
      h.advance(days(10));
      current = issued(await h.sessions.refresh(current.refreshToken));
    }
    // day eighty: a fresh fortnight would run to day ninety-four, so the
    // ceiling has to clip it back to ninety.
    const ceiling = new Date(START.getTime() + DEFAULT_SESSION_LIFETIMES.absoluteTtlMs);
    expect(new Date(current.refreshExpiresAt).getTime()).toEqual(ceiling.getTime());
    expect(new Date(current.accessExpiresAt).getTime()).toBeLessThan(ceiling.getTime());
  });
});

describe('replay of a refresh token', () => {
  it('refuses the second use and says the session was ended', async () => {
    const h = harness();
    const first = await h.sessions.signIn('u1');
    issued(await h.sessions.refresh(first.refreshToken));

    expect(failure(await h.sessions.refresh(first.refreshToken)).code).toEqual('token-reused');
  });

  it('kills the whole family, including the generation the thief did not have', async () => {
    const h = harness();
    const first = await h.sessions.signIn('u1');
    const second = issued(await h.sessions.refresh(first.refreshToken));

    // the attacker replays the token they copied earlier
    await h.sessions.refresh(first.refreshToken);

    // the legitimate client is now signed out too — which is the point
    expect(failure(await h.sessions.authenticate(second.accessToken)).code).toEqual('revoked');
    expect(failure(await h.sessions.refresh(second.refreshToken)).code).toEqual('revoked');
  });

  it('records why, so the incident can be read back out of the database', async () => {
    const h = harness();
    const first = await h.sessions.signIn('u1');
    issued(await h.sessions.refresh(first.refreshToken));
    await h.sessions.refresh(first.refreshToken);

    expect(h.store.all().every((row) => row.revokedReason === 'token-reuse')).toEqual(true);
  });

  it('lets only one of two simultaneous refreshes win', async () => {
    const h = harness();
    const first = await h.sessions.signIn('u1');
    const [a, b] = await Promise.all([
      h.sessions.refresh(first.refreshToken),
      h.sessions.refresh(first.refreshToken),
    ]);
    expect([a.ok, b.ok].filter(Boolean).length).toEqual(1);
  });
});

describe('signing out', () => {
  it('kills both tokens immediately, not when they expire', async () => {
    const h = harness();
    const s = await h.sessions.signIn('u1');
    expect(await h.sessions.signOut(s.refreshToken)).toEqual(true);

    expect(failure(await h.sessions.authenticate(s.accessToken)).code).toEqual('revoked');
    expect(failure(await h.sessions.refresh(s.refreshToken)).code).toEqual('revoked');
  });

  it('is idempotent, and does not throw on a token it has never seen', async () => {
    const h = harness();
    const s = await h.sessions.signIn('u1');
    await h.sessions.signOut(s.refreshToken);
    expect(await h.sessions.signOut(s.refreshToken)).toEqual(false);
    expect(await h.sessions.signOut('made-up')).toEqual(false);
    expect(await h.sessions.signOut(undefined)).toEqual(false);
  });

  it('signs out every device at once when asked, and leaves other users alone', async () => {
    const h = harness();
    const laptop = await h.sessions.signIn('u1');
    const phone = await h.sessions.signIn('u1');
    const someoneElse = await h.sessions.signIn('u2');

    expect(await h.sessions.signOutEverywhere('u1')).toEqual(2);
    expect(failure(await h.sessions.authenticate(laptop.accessToken)).code).toEqual('revoked');
    expect(failure(await h.sessions.authenticate(phone.accessToken)).code).toEqual('revoked');
    expect((await h.sessions.authenticate(someoneElse.accessToken)).ok).toEqual(true);
  });
});

describe('housekeeping', () => {
  it('drops records past the ceiling and keeps live ones', async () => {
    const h = harness();
    await h.sessions.signIn('u1');
    h.advance(days(91));
    const live = await h.sessions.signIn('u2');

    expect(await h.sessions.purgeExpired()).toEqual(1);
    expect((await h.sessions.authenticate(live.accessToken)).ok).toEqual(true);
  });
});
