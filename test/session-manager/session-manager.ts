import { randomUUID } from 'node:crypto';
import { PlainSession, Session } from '@luvktest/test.session';
import { hashToken, mintRawToken } from '@luvktest/test.token-crypto';
import type { SessionStore } from './session-store.js';
import { DEFAULT_SESSION_LIFETIMES, SessionLifetimes } from './session-lifetimes.js';

/**
 * Why a credential was refused.
 *
 * The codes exist for the client, not for the log: `expired-access-token` is
 * the one and only signal that means "refresh and try again", and a client
 * that cannot tell it apart from `invalid-token` has to guess, which in
 * practice means logging the user out for no reason.
 */
export type AuthFailureCode =
  /** nothing was presented. */
  | 'no-token'
  /** presented, but no such token. Also what a forged token looks like. */
  | 'invalid-token'
  /** it was real and it has expired. Refresh. */
  | 'expired-access-token'
  /** the refresh token itself has expired, or the session hit its ceiling. Sign in again. */
  | 'expired-session'
  /** this refresh token was already spent. The whole family has just been killed. */
  | 'token-reused'
  /** signed out, or killed by a reuse elsewhere in the family. */
  | 'revoked';

/** a refusal, with a code the client can branch on and a line it can show. */
export type AuthFailure = {
  ok: false;
  code: AuthFailureCode;
  message: string;
};

/** a successful authentication: who, on which session, for how much longer. */
export type Authenticated = {
  ok: true;
  userId: string;
  sessionId: string;
  familyId: string;
  expiresInSeconds: number;
};

/** the result of checking an access token. */
export type AuthOutcome = Authenticated | AuthFailure;

/**
 * A freshly minted pair of tokens.
 *
 * This is the only object in the system that ever contains a raw token, and it
 * exists for exactly one HTTP response. Do not log it, do not store it.
 */
export type IssuedSession = {
  ok: true;
  /** the account this session belongs to. */
  userId: string;
  /** send as `Authorization: Bearer <accessToken>`. Minutes of life. */
  accessToken: string;
  /** spend once, at `/auth/refresh`, to get a new pair. Weeks of life. */
  refreshToken: string;
  tokenType: 'Bearer';
  /** seconds until `accessToken` expires — refresh a little before this. */
  expiresIn: number;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  /** the session as a client may see it: no fingerprints. */
  session: ReturnType<Session['toPublic']>;
};

/** the result of exchanging a refresh token. */
export type RefreshOutcome = IssuedSession | AuthFailure;

const MESSAGES: Record<AuthFailureCode, string> = {
  'no-token': 'sign in first',
  'invalid-token': 'that session is not valid',
  'expired-access-token': 'your session needs refreshing',
  'expired-session': 'your session has expired — please sign in again',
  'token-reused': 'that session was ended for safety — please sign in again',
  revoked: 'that session has been signed out',
};

function refuse(code: AuthFailureCode): AuthFailure {
  return { ok: false, code, message: MESSAGES[code] };
}

/**
 * Narrow an outcome to a refusal.
 *
 * A plain `if (!outcome.ok)` is the obvious way to write this, and it is not
 * reliable here: the workspace compiles without `strictNullChecks`, where
 * truthiness on a boolean-literal discriminant does not narrow the union. An
 * explicit type predicate does, in both directions, under every setting — and
 * it reads no worse.
 *
 * @example
 * const outcome = await sessions.refresh(token);
 * if (isAuthFailure(outcome)) return res.status(401).json({ code: outcome.code });
 * outcome.accessToken; // narrowed to the success branch
 */
export function isAuthFailure<T extends { ok: true }>(
  outcome: T | AuthFailure
): outcome is AuthFailure {
  return outcome.ok === false;
}

/** the seams tests reach for: a clock and an id generator. */
export type SessionManagerOptions = {
  lifetimes?: SessionLifetimes;
  /** defaults to `() => new Date()`. */
  now?: () => Date;
  /** defaults to `randomUUID`. */
  newId?: () => string;
};

/**
 * Sessions: issuing them, checking them, rotating them, ending them.
 *
 * Every rule lives here and storage lives behind {@link SessionStore}, so the
 * behaviour below is exercised in memory by the spec and is identical against
 * Mongo in production.
 *
 * The model is a *family* of generations. Signing in starts a family.
 * Refreshing spends the current refresh token and writes the next generation.
 * Presenting a spent refresh token is not a mistake a healthy client makes —
 * it means someone has a copy — so it kills the entire family rather than just
 * refusing the call.
 *
 * @example
 * const sessions = new SessionManager(store, readAuthSecret());
 * const issued = await sessions.signIn(user.id);
 * const who = await sessions.authenticate(bearerToken);
 */
export class SessionManager {
  private readonly lifetimes: SessionLifetimes;
  private readonly now: () => Date;
  private readonly newId: () => string;

  constructor(
    private readonly store: SessionStore,
    /**
     * the value of `SKYLINE_AUTH_SECRET`. Read it with `readAuthSecret()` from
     * `@luvktest/test.token-crypto`, which refuses to invent one.
     */
    private readonly secret: string,
    options: SessionManagerOptions = {}
  ) {
    this.lifetimes = options.lifetimes ?? DEFAULT_SESSION_LIFETIMES;
    this.now = options.now ?? (() => new Date());
    this.newId = options.newId ?? randomUUID;
  }

  /**
   * Start a new session family for a user who has just proved who they are.
   *
   * Call this after a password check, never before.
   */
  async signIn(userId: string): Promise<IssuedSession> {
    const issuedAt = this.now();
    return this.issue({
      userId,
      familyId: this.newId(),
      generation: 0,
      issuedAt,
      absoluteExpiresAt: new Date(issuedAt.getTime() + this.lifetimes.absoluteTtlMs),
    });
  }

  /**
   * Check an access token.
   *
   * @param accessToken the bearer token, or undefined when the header was absent.
   */
  async authenticate(accessToken: string | undefined): Promise<AuthOutcome> {
    if (!accessToken) return refuse('no-token');
    const record = await this.store.findByAccessTokenHash(this.fingerprint(accessToken));
    if (!record) return refuse('invalid-token');

    const session = Session.from(record);
    const at = this.now();
    if (session.isRevoked()) return refuse('revoked');
    // A rotated generation is not an error the user caused — their client has
    // a newer token and simply used the old one. Say "refresh", not "invalid".
    if (session.isRotated()) return refuse('expired-access-token');
    if (at >= session.absoluteExpiresAt) return refuse('expired-session');
    if (!session.isAccessValidAt(at)) return refuse('expired-access-token');

    return {
      ok: true,
      userId: session.userId,
      sessionId: session.id,
      familyId: session.familyId,
      expiresInSeconds: session.accessExpiresInSeconds(at),
    };
  }

  /**
   * Exchange a refresh token for a new pair, and retire the old one.
   *
   * Three things can go wrong, and they are not the same thing:
   *
   * - **unknown token** — refused, nothing else happens.
   * - **expired token or session** — refused, sign in again.
   * - **already-spent token** — the family is revoked on the spot. Either a
   *   copy of the token is in circulation, or the legitimate client lost the
   *   response to its last refresh. Both are resolved by signing in again, and
   *   only one of them is safe to ignore, so we treat both as the unsafe one.
   */
  async refresh(refreshToken: string | undefined): Promise<RefreshOutcome> {
    if (!refreshToken) return refuse('no-token');
    const record = await this.store.findByRefreshTokenHash(this.fingerprint(refreshToken));
    if (!record) return refuse('invalid-token');

    const session = Session.from(record);
    const at = this.now();
    if (session.isRevoked()) return refuse('revoked');

    if (session.isRotated()) {
      await this.store.revokeFamily(session.familyId, at.toISOString(), 'token-reuse');
      return refuse('token-reused');
    }

    if (at >= session.refreshExpiresAt || at >= session.absoluteExpiresAt) {
      return refuse('expired-session');
    }

    // Compare-and-set. If another request spent this token between the read
    // above and this line, we lost the race — which is the same replay case.
    const won = await this.store.markRotated(session.id, at.toISOString());
    if (!won) {
      await this.store.revokeFamily(session.familyId, at.toISOString(), 'token-reuse');
      return refuse('token-reused');
    }

    return this.issue({
      userId: session.userId,
      familyId: session.familyId,
      generation: session.generation + 1,
      issuedAt: at,
      absoluteExpiresAt: session.absoluteExpiresAt,
    });
  }

  /**
   * Sign out: kill the family this refresh token belongs to.
   *
   * Both tokens stop working immediately — that is the whole point of keeping
   * session state server-side, and it is what a signed token cannot give you.
   *
   * @returns true if a live session was ended. False means the token was
   *          unknown or already dead, which the caller should still report as
   *          success: "signed out" is the honest answer either way.
   */
  async signOut(refreshToken: string | undefined): Promise<boolean> {
    if (!refreshToken) return false;
    const record = await this.store.findByRefreshTokenHash(this.fingerprint(refreshToken));
    if (!record) return false;
    const revoked = await this.store.revokeFamily(record.familyId, this.now().toISOString(), 'logout');
    return revoked > 0;
  }

  /**
   * Sign a user out of every device.
   *
   * The call to make after a password change, or from an account page.
   *
   * @returns how many live generations were killed.
   */
  async signOutEverywhere(userId: string): Promise<number> {
    return this.store.revokeAllForUser(userId, this.now().toISOString(), 'logout-all');
  }

  /**
   * Drop records that are past their absolute ceiling.
   *
   * Housekeeping only — those records are already refused by the rules above.
   */
  async purgeExpired(): Promise<number> {
    return this.store.deleteExpiredBefore(this.now().toISOString());
  }

  private fingerprint(rawToken: string): string {
    return hashToken(rawToken, this.secret);
  }

  /** mint a pair, persist the generation, hand back the only copy of the tokens. */
  private async issue(seed: {
    userId: string;
    familyId: string;
    generation: number;
    issuedAt: Date;
    absoluteExpiresAt: Date;
  }): Promise<IssuedSession> {
    const accessToken = mintRawToken();
    const refreshToken = mintRawToken();
    const { issuedAt } = seed;

    // Never let a token outlive the family ceiling, even by a second.
    const capped = (ms: number): Date =>
      new Date(Math.min(issuedAt.getTime() + ms, seed.absoluteExpiresAt.getTime()));

    const record: PlainSession = {
      id: this.newId(),
      userId: seed.userId,
      familyId: seed.familyId,
      accessTokenHash: this.fingerprint(accessToken),
      refreshTokenHash: this.fingerprint(refreshToken),
      generation: seed.generation,
      issuedAt: issuedAt.toISOString(),
      accessExpiresAt: capped(this.lifetimes.accessTtlMs).toISOString(),
      refreshExpiresAt: capped(this.lifetimes.refreshTtlMs).toISOString(),
      absoluteExpiresAt: seed.absoluteExpiresAt.toISOString(),
    };

    await this.store.insert(record);
    const session = Session.from(record);

    return {
      ok: true,
      userId: record.userId,
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: session.accessExpiresInSeconds(issuedAt),
      accessExpiresAt: record.accessExpiresAt,
      refreshExpiresAt: record.refreshExpiresAt,
      session: session.toPublic(),
    };
  }
}
