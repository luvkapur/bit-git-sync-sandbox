import { randomUUID } from 'node:crypto';
import { PlainUser, User } from '@luvktest/test.user';
import {
  authFailure,
  type AuthProvider,
  type AuthSession,
  type AuthTokens,
  type AuthUser,
  type ConfirmResult,
  type CurrentUserResult,
  type ResendResult,
  type SessionResult,
  type SignInInput,
  type SignOutResult,
  type SignUpInput,
  type SignupResult,
} from '@luvktest/test.auth-provider';
import {
  isAuthFailure as isSessionFailure,
  type IssuedSession,
  type SessionManager,
} from '@luvktest/test.session-manager';
import {
  isConfirmFailure,
  isRateLimited,
  type ConfirmationManager,
} from '@luvktest/test.email-confirmation';
import type { Mailer } from '@luvktest/test.mailer';
import {
  accountAlreadyExistsEmail,
  confirmationEmail,
  noAccountEmail,
} from '@luvktest/test.auth-emails';
import type { AccountStore } from './account-store.js';
import type { AuthLinks } from './auth-links.js';

/** the shortest password this provider accepts. */
export const MIN_PASSWORD_LENGTH = 8;

/** everything the provider is wired to. */
export type LocalAuthProviderDeps = {
  accounts: AccountStore;
  sessions: SessionManager;
  confirmations: ConfirmationManager;
  mailer: Mailer;
  links: AuthLinks;
  /** the product name in email subject lines. Defaults to `Skyline`. */
  appName?: string;
  /** injectable clock and id generator, for tests. */
  now?: () => Date;
  newId?: () => string;
};

/**
 * Deliberately loose. An address is valid if a mail server might accept it;
 * everything beyond that is a myth, and the real check is the confirmation
 * link — which is why the account cannot be used until it is clicked.
 */
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Authentication on your own infrastructure: your database, your password
 * hashes, your sessions, your mail.
 *
 * One implementation of {@link AuthProvider}. Everything downstream — the
 * middleware, the routes, the UI — depends on the interface, so replacing this
 * with a managed provider is configuration rather than a rewrite.
 *
 * @example
 * const auth = new LocalAuthProvider({
 *   accounts, sessions, confirmations, mailer, links: authLinksFrom(publicUrl),
 * });
 */
export class LocalAuthProvider implements AuthProvider {
  readonly name = 'local';

  private readonly now: () => Date;
  private readonly newId: () => string;
  private readonly appName: string;
  /** a real bcrypt hash to compare against when no account matched. See `signIn`. */
  private decoyHash?: string;

  constructor(private readonly deps: LocalAuthProviderDeps) {
    this.now = deps.now ?? (() => new Date());
    this.newId = deps.newId ?? randomUUID;
    this.appName = deps.appName ?? 'Skyline';
  }

  /**
   * Create an account, or quietly do nothing, and send mail either way.
   *
   * The two branches are the point. A new address gets an account and a
   * confirmation link. An address that already has an account gets no new
   * account and a "somebody tried to sign up as you" note. The caller receives
   * the identical answer in both cases, and the password is hashed in both
   * cases so the two take about the same time.
   *
   * What a refusal can say: the address is malformed, the password is too
   * short, or you have asked too often. Never anything about who exists.
   */
  async signUp(input: SignUpInput): Promise<SignupResult> {
    const email = this.normalize(input.email);
    if (!EMAIL_PATTERN.test(email)) return authFailure('invalid-email');
    if (input.password.length < MIN_PASSWORD_LENGTH) return authFailure('weak-password');

    const rate = await this.deps.confirmations.recordAttempt(email);
    if (isRateLimited(rate)) return authFailure('rate-limited', rate.retryAfterSeconds);

    // Hash before branching: bcrypt is the expensive part of this request, and
    // doing it on only one path would make the response time the answer.
    const passwordHash = User.hashPassword(input.password);
    const existing = await this.deps.accounts.findByEmail(email);

    try {
      if (existing) {
        await this.deps.mailer.send(
          accountAlreadyExistsEmail({
            to: email,
            name: existing.name,
            appName: this.appName,
            signInUrl: this.deps.links.signInUrl,
          })
        );
      } else {
        const user: PlainUser = {
          id: this.newId(),
          email,
          name: input.name.trim().slice(0, 60) || 'Anonymous',
          passwordHash,
          createdAt: this.now().toISOString(),
        };
        await this.deps.accounts.create(user);
        await this.sendConfirmation(user.id, email, user.name);
      }
    } catch (e) {
      // Delivery is best effort and MUST NOT change the answer.
      //
      // The original reasoning — both branches send mail, so an outage looks the
      // same either way — only holds if the transport fails symmetrically. It
      // does not. A sandboxed provider that only delivers to one address, a
      // per-domain block, greylisting: each fails for some recipients and not
      // others, and then the response itself tells an attacker which addresses
      // are registered. Observed for real: a known address answered 200 and an
      // unknown one answered 503.
      //
      // So: log it where an operator will see it, and tell the caller nothing.
      // The cost is a user who never gets a link and must press resend; the
      // alternative is an enumeration oracle, which is worse.
      this.warn(`confirmation mail failed for a signup: ${e instanceof Error ? e.message : String(e)}`);
    }

    return { ok: true, next: 'confirmation-sent' };
  }

  /**
   * Send the confirmation link again.
   *
   * Three internal cases, one external answer, and a message in every case —
   * including for an address with no account, which receives a "there is no
   * account here" note. Inbox activity is part of the observable behaviour: an
   * attacker who controls the address would otherwise learn from silence.
   */
  async resendConfirmation(email: string): Promise<ResendResult> {
    const normalized = this.normalize(email);
    if (!EMAIL_PATTERN.test(normalized)) return authFailure('invalid-email');

    const rate = await this.deps.confirmations.recordAttempt(normalized);
    if (isRateLimited(rate)) return authFailure('rate-limited', rate.retryAfterSeconds);

    const user = await this.deps.accounts.findByEmail(normalized);
    try {
      if (!user) {
        await this.deps.mailer.send(
          noAccountEmail({ to: normalized, appName: this.appName, signUpUrl: this.deps.links.signUpUrl })
        );
      } else if (user.isEmailConfirmed()) {
        await this.deps.mailer.send(
          accountAlreadyExistsEmail({
            to: normalized,
            name: user.name,
            appName: this.appName,
            signInUrl: this.deps.links.signInUrl,
          })
        );
      } else {
        await this.sendConfirmation(user.id, normalized, user.name);
      }
    } catch (e) {
      // Same rule as signup: a transport failure is ours to notice, not the
      // caller's to learn from. See the note there.
      this.warn(`confirmation mail failed for a resend: ${e instanceof Error ? e.message : String(e)}`);
    }

    return { ok: true };
  }

  /**
   * Spend a confirmation link and activate the account.
   *
   * Does not return a session. A link that sat in an inbox is weaker evidence
   * than a password, and mail clients prefetch links — so confirming turns the
   * account on and then asks the person to sign in.
   */
  async confirmEmail(token: string): Promise<ConfirmResult> {
    const outcome = await this.deps.confirmations.confirm(token);
    if (isConfirmFailure(outcome)) return authFailure(outcome.code);

    const at = this.now().toISOString();
    await this.deps.accounts.markEmailConfirmed(outcome.userId, at);
    const user = await this.deps.accounts.findById(outcome.userId);
    // The link was good and the account has gone. Nothing useful to say beyond
    // "this link no longer means anything".
    if (!user) return authFailure('invalid-confirmation');

    // Confirming signs you in.
    //
    // It did not, and the reasoning was sound on paper: mail clients and click
    // trackers prefetch links, so a link that creates a session creates one for
    // a robot. But the person who just proved they control the address is then
    // told to go and type a password, and in testing that read as "it didn't
    // work" every single time.
    //
    // The prefetch is handled where it belongs — the emailed URL points at a
    // page, and the page confirms on a POST that a human has to trigger. A
    // prefetcher issuing a GET spends nothing. So the session is safe to issue
    // here, and it goes to the browser that actually asked.
    const session = await this.sessionFor(user, await this.deps.sessions.signIn(user.id));
    // If issuing the session failed, the address is still confirmed — that part
    // already happened and must not be undone. Answer without tokens and let the
    // caller fall back to the sign-in form.
    return session.ok
      ? { ok: true, user: this.toAuthUser(user), tokens: session.tokens }
      : { ok: true, user: this.toAuthUser(user) };
  }

  /**
   * Exchange a password for a session.
   *
   * An unknown address is compared against a decoy hash so that "no such
   * account" costs the same as "wrong password" — otherwise the sign-in form
   * answers, by stopwatch, the question the signup form refuses to answer.
   *
   * An unconfirmed account is told so *after* its password checks out. That
   * reveals the account exists, to someone who has just proved they know its
   * password; the alternative is telling a legitimate user that their correct
   * password is wrong, which sends them to support convinced signup is broken.
   */
  async signIn(input: SignInInput): Promise<SessionResult> {
    const email = this.normalize(input.email);
    const user = await this.deps.accounts.findByEmail(email);

    if (!user) {
      await this.burnTime(input.password);
      return authFailure('invalid-credentials');
    }

    if (!(await user.verifyPassword(input.password))) return authFailure('invalid-credentials');
    if (!user.isEmailConfirmed()) return authFailure('email-not-confirmed');

    return this.sessionFor(user, await this.deps.sessions.signIn(user.id));
  }

  /** Exchange a refresh token for a new pair, retiring the old one. */
  async refresh(refreshToken: string): Promise<SessionResult> {
    const issued = await this.deps.sessions.refresh(refreshToken);
    if (isSessionFailure(issued)) return authFailure(issued.code);

    const user = await this.deps.accounts.findById(issued.userId);
    if (!user) return authFailure('invalid-token');
    // An account can be un-confirmed again only by an administrator; if that
    // has happened, a live session should not outlive it.
    if (!user.isEmailConfirmed()) return authFailure('email-not-confirmed');

    return this.sessionFor(user, issued);
  }

  /** End a session. Both tokens stop working at once. */
  async signOut(refreshToken: string): Promise<SignOutResult> {
    await this.deps.sessions.signOut(refreshToken);
    return { ok: true };
  }

  /** Identify the holder of an access token. */
  async currentUser(accessToken: string): Promise<CurrentUserResult> {
    const outcome = await this.deps.sessions.authenticate(accessToken);
    if (isSessionFailure(outcome)) return authFailure(outcome.code);

    const user = await this.deps.accounts.findById(outcome.userId);
    if (!user) return authFailure('invalid-token');

    return {
      ok: true,
      user: this.toAuthUser(user),
      sessionId: outcome.sessionId,
      expiresInSeconds: outcome.expiresInSeconds,
    };
  }

  private async sendConfirmation(userId: string, email: string, name: string): Promise<void> {
    const issued = await this.deps.confirmations.issue(userId, email);
    await this.deps.mailer.send(
      confirmationEmail({
        to: email,
        name,
        appName: this.appName,
        confirmUrl: this.deps.links.confirmUrl(issued.token),
      })
    );
  }

  private sessionFor(user: User, issued: IssuedSession): SessionResult {
    const tokens: AuthTokens = {
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
      tokenType: issued.tokenType,
      expiresIn: issued.expiresIn,
      accessExpiresAt: issued.accessExpiresAt,
      refreshExpiresAt: issued.refreshExpiresAt,
    };
    const session: AuthSession = { user: this.toAuthUser(user), tokens };
    return { ok: true, ...session };
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailConfirmed: user.isEmailConfirmed(),
    };
  }

  /**
   * Spend roughly one password check against a hash of our own.
   *
   * Computed once, lazily — a real bcrypt comparison, because the point is to
   * cost what a real one costs.
   */
  private async burnTime(password: string): Promise<void> {
    if (!this.decoyHash) this.decoyHash = User.hashPassword(`decoy-${this.newId()}`);
    const decoy = User.from({
      id: 'decoy',
      email: 'decoy@invalid',
      name: 'decoy',
      passwordHash: this.decoyHash,
      createdAt: this.now().toISOString(),
    });
    await decoy.verifyPassword(password);
  }

  /**
   * Report a problem the caller must not be told about.
   *
   * Everything routed through here is something an operator needs to see and an
   * attacker must not infer. Keep it on stderr and keep the response constant.
   */
  private warn(message: string): void {
    console.warn(`[auth] ${message}`);
  }

  private normalize(email: string): string {
    return email.trim().toLowerCase();
  }
}
