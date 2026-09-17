import type {
  AuthErrorCode,
  AuthFailure,
  ConfirmResult,
  CurrentUserResult,
  ResendResult,
  SessionResult,
  SignOutResult,
  SignupResult,
} from './auth-types.js';


/** what a caller hands over to create an account. */
export type SignUpInput = {
  email: string;
  name: string;
  password: string;
};

/** what a caller hands over to sign in. */
export type SignInInput = {
  email: string;
  password: string;
};

/**
 * Authentication, as an interface.
 *
 * Six operations, no more. Everything downstream — the middleware, the routes,
 * eventually the UI — depends on this and never on an implementation, which is
 * what makes moving from a managed provider to your own infrastructure a swap
 * rather than a rewrite.
 *
 * The narrowness is the feature. Nothing here mentions a database, a JWT, a
 * cookie, a bcrypt cost factor or a vendor. Every string that crosses this
 * boundary is either something a person typed or an opaque token the caller
 * may only store and hand back.
 *
 * ## The one operation that does not travel well
 *
 * `confirmEmail` assumes the confirmation link comes back to *us*. A managed
 * provider that sends its own verification mail and hosts its own landing page
 * owns that step end to end, and for such a provider `signUp` answers
 * `confirmation-handled-by-provider` and `confirmEmail` answers
 * `not-supported`. Callers must handle both, which is why `SignupResult` says
 * where the user should go next rather than assuming.
 */
export interface AuthProvider {
  /**
   * A stable name for logs and for the health endpoint — `'local'`, `'clerk'`.
   * Never used for branching: if a caller needs to know which provider it has,
   * the interface is wrong.
   */
  readonly name: string;

  /**
   * Create an account and start the confirmation flow.
   *
   * **This must not reveal whether the address is already registered.** An
   * existing address and a new one produce the same result, in the same time,
   * with an email sent either way — a "you already have an account" note to
   * the one, a confirmation link to the other. Anything else turns the signup
   * form into a list of your users.
   *
   * Refusals are only ever about the *input*: `invalid-email`, `weak-password`,
   * `rate-limited`.
   */
  signUp(input: SignUpInput): Promise<SignupResult>;

  /**
   * Spend a confirmation token and activate the account.
   *
   * Single use. A second click on the same link answers
   * `confirmation-already-used`, an old one `expired-confirmation`, and a
   * forged one `invalid-confirmation` — three different sentences, because to
   * the person holding the link they are three different problems.
   *
   * Does not sign the user in: a link in an inbox is a weaker thing than a
   * password, and mail clients prefetch. The user confirms, then signs in.
   */
  confirmEmail(token: string): Promise<ConfirmResult>;

  /**
   * Send the confirmation link again.
   *
   * Rate limited, and — like `signUp` — identical from the outside whether or
   * not the address exists. That means the limit is keyed on the address as
   * typed, not on an account, or the 429 itself would answer the question.
   */
  resendConfirmation(email: string): Promise<ResendResult>;

  /**
   * Exchange a password for a session.
   *
   * An unconfirmed account is refused with `email-not-confirmed`, not with
   * `invalid-credentials`. The distinction leaks that the address is
   * registered — to somebody who has just typed its correct password, which
   * is a person who already knows.
   */
  signIn(input: SignInInput): Promise<SessionResult>;

  /**
   * Exchange a refresh token for a new session.
   *
   * Implementations that support rotation must retire the presented token and
   * fail closed on a second use.
   */
  refresh(refreshToken: string): Promise<SessionResult>;

  /**
   * End a session.
   *
   * Always succeeds. Whether the token was live, already dead or never existed
   * is not the caller's business, and "am I signed out?" has one honest answer.
   */
  signOut(refreshToken: string): Promise<SignOutResult>;

  /**
   * Identify the holder of an access token.
   *
   * The only way anything downstream learns who is calling. A path parameter
   * is not an identity.
   */
  currentUser(accessToken: string): Promise<CurrentUserResult>;
}

/** the sentences shown to a person for each refusal. */
const MESSAGES: Record<AuthErrorCode, string> = {
  'no-token': 'sign in first',
  'invalid-token': 'that session is not valid',
  'expired-access-token': 'your session needs refreshing',
  'expired-session': 'your session has expired — please sign in again',
  'token-reused': 'that session was ended for safety — please sign in again',
  revoked: 'that session has been signed out',
  'invalid-credentials': 'invalid email or password',
  'email-not-confirmed': 'please confirm your email address first — check your inbox',
  'invalid-confirmation': 'that confirmation link is not valid',
  'expired-confirmation': 'that confirmation link has expired — request a new one',
  'confirmation-already-used': 'that link has already been used — try signing in',
  'invalid-email': 'that email does not look right',
  'weak-password': 'password must be at least 8 characters',
  'rate-limited': 'too many attempts — please wait a moment',
  'not-supported': 'this provider does not support that',
  unavailable: 'authentication is not available right now',
};

/**
 * Build a refusal with the standard sentence for a code.
 *
 * Centralised so two implementations of {@link AuthProvider} cannot describe
 * the same refusal differently, which would let a client tell them apart.
 */
export function authFailure(code: AuthErrorCode, retryAfterSeconds?: number): AuthFailure {
  const failure: AuthFailure = { ok: false, code, message: MESSAGES[code] };
  if (retryAfterSeconds !== undefined) failure.retryAfterSeconds = retryAfterSeconds;
  return failure;
}

/**
 * Narrow any provider result to its refusal branch.
 *
 * A plain `if (!result.ok)` is the obvious spelling and is not reliable in
 * this workspace, which compiles without `strictNullChecks` — truthiness on a
 * boolean-literal discriminant does not narrow there. An explicit predicate
 * does, under every setting.
 *
 * @example
 * const session = await auth.signIn(input);
 * if (isAuthFailure(session)) return res.status(401).json({ code: session.code });
 * session.tokens.accessToken; // narrowed
 */
export function isAuthFailure<T extends { ok: true }>(
  result: T | AuthFailure
): result is AuthFailure {
  return result.ok === false;
}

/** the HTTP status each refusal deserves. */
const STATUS: Record<AuthErrorCode, number> = {
  'no-token': 401,
  'invalid-token': 401,
  'expired-access-token': 401,
  'expired-session': 401,
  'token-reused': 401,
  revoked: 401,
  'invalid-credentials': 401,
  'email-not-confirmed': 403,
  'invalid-confirmation': 400,
  'expired-confirmation': 410,
  'confirmation-already-used': 410,
  'invalid-email': 400,
  'weak-password': 400,
  'rate-limited': 429,
  'not-supported': 501,
  unavailable: 503,
};

/**
 * Map a refusal to an HTTP status.
 *
 * Kept here rather than in the routes so that every transport answers the same
 * way, and so a new code cannot be added without deciding what it means on the
 * wire.
 */
export function statusForAuthError(code: AuthErrorCode): number {
  return STATUS[code];
}
