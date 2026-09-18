/**
 * A user, as every consumer of authentication sees one.
 *
 * Four fields, all of them meaningful to a UI. Notably absent: anything about
 * how the account is stored, which provider holds it, or what a session looks
 * like. A provider that needs to carry its own identifiers does so privately.
 */
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  /** whether the address has been proved. An unconfirmed account cannot sign in. */
  emailConfirmed: boolean;
};

/**
 * A pair of credentials for a signed-in client.
 *
 * Both are opaque strings. Whether they are random values in a database, a
 * signed JWT, or a handle a managed provider understands is the provider's
 * business — callers may only store them and send them back.
 */
export type AuthTokens = {
  /** send as `Authorization: Bearer <accessToken>`. */
  accessToken: string;
  /** exchange at refresh. Single use where the provider supports rotation. */
  refreshToken: string;
  tokenType: 'Bearer';
  /** seconds until `accessToken` expires. */
  expiresIn: number;
  accessExpiresAt: string;
  refreshExpiresAt: string;
};

/** a signed-in user and the credentials that prove it. */
export type AuthSession = {
  user: AuthUser;
  tokens: AuthTokens;
};

/**
 * Every way authentication can say no.
 *
 * One flat list rather than per-method unions, so a client can switch on it
 * once. Codes are stable strings — they are part of the wire contract and a
 * UI branches on them.
 */
export type AuthErrorCode =
  /** nothing was presented. */
  | 'no-token'
  /** presented, but no such token — or a forgery. */
  | 'invalid-token'
  /** real, and past its expiry. Refresh and retry. */
  | 'expired-access-token'
  /** the refresh token or the whole session has expired. Sign in again. */
  | 'expired-session'
  /** a refresh token came back a second time. The session was ended. */
  | 'token-reused'
  /** signed out. */
  | 'revoked'
  /** wrong password, or no such account. Deliberately indistinguishable. */
  | 'invalid-credentials'
  /** the account exists and its address has not been proved yet. */
  | 'email-not-confirmed'
  /** the confirmation token is unknown or malformed. */
  | 'invalid-confirmation'
  /** the confirmation token was valid and is now too old. */
  | 'expired-confirmation'
  /** the confirmation token has already been spent. */
  | 'confirmation-already-used'
  /** the address is not an address. */
  | 'invalid-email'
  /** the password is too short or too obvious. */
  | 'weak-password'
  /** too many attempts. See `retryAfterSeconds`. */
  | 'rate-limited'
  /** this provider does not implement this operation. See the note on confirmEmail. */
  | 'not-supported'
  /** the provider is misconfigured — a missing secret, usually. */
  | 'unavailable';

/**
 * A refusal.
 *
 * `code` is for the client to branch on, `message` is for a person to read,
 * and neither ever contains a token, a hash or a hint about whether an
 * address is registered.
 */
export type AuthFailure = {
  ok: false;
  code: AuthErrorCode;
  message: string;
  /** set on `rate-limited`, so a client can say "try again in a minute". */
  retryAfterSeconds?: number;
};

/**
 * What happened to a signup request.
 *
 * There is no session here, on purpose: an account is not usable until its
 * address is proved. There is also no way to tell from the outside whether
 * the address was already registered — see `AuthProvider.signUp`.
 */
export type SignupResult =
  | {
      ok: true;
      /**
       * where the user should go next.
       *
       * - `confirmation-sent` — we emailed a link; the user clicks it and then
       *   signs in.
       * - `confirmation-handled-by-provider` — a managed provider owns the
       *   flow and has sent its own message; `confirmEmail` will not be called.
       */
      next: 'confirmation-sent' | 'confirmation-handled-by-provider';
    }
  | AuthFailure;

/** what happened to a confirmation link. */
/**
 * Confirming an address also signs you in.
 *
 * The session is optional because not every provider can do it — a hosted
 * provider that owns its own confirmation page will answer with the user and no
 * tokens — so a caller must handle its absence rather than assume it.
 */
export type ConfirmResult = ({ ok: true; user: AuthUser } & Partial<AuthSession>) | AuthFailure;

/** what happened to a sign-in, a refresh, or anything that yields a session. */
export type SessionResult = ({ ok: true } & AuthSession) | AuthFailure;

/** who is behind an access token. */
export type CurrentUserResult =
  | {
      ok: true;
      user: AuthUser;
      /** the provider's id for this session, for logs and for signing it out. */
      sessionId: string;
      /** seconds of access-token life left. */
      expiresInSeconds: number;
    }
  | AuthFailure;

/** signing out always succeeds, so this carries no failure branch. */
export type SignOutResult = { ok: true };

/** what a resend request answers. Identical whether or not the address exists. */
export type ResendResult = { ok: true } | AuthFailure;
