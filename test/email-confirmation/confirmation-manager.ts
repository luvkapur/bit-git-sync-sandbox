import { randomUUID } from 'node:crypto';
import { hashToken, mintRawToken } from '@luvktest/test.token-crypto';
import { Confirmation, PlainConfirmation } from './confirmation.js';
import type { ConfirmationStore } from './confirmation-store.js';

/** how long a confirmation link lives, and how often one may be asked for. */
export type ConfirmationPolicy = {
  /** link lifetime. */
  ttlMs: number;
  /** how many links one address may ask for inside the window. */
  maxPerWindow: number;
  /** the rate-limiting window. */
  windowMs: number;
};

/**
 * The defaults.
 *
 * **24 hours** is long enough to survive a night, a commute and a mail client
 * that delivers late, and short enough that a link left in an archived inbox
 * is not a standing key to an account.
 *
 * **3 requests per 15 minutes** is generous for a person who did not receive
 * the first mail and tight enough that the endpoint is not a free way to send
 * mail to a stranger.
 */
export const DEFAULT_CONFIRMATION_POLICY: ConfirmationPolicy = {
  ttlMs: 24 * 60 * 60 * 1000,
  maxPerWindow: 3,
  windowMs: 15 * 60 * 1000,
};

/** why a confirmation link was refused. */
export type ConfirmationFailureCode =
  | 'invalid-confirmation'
  | 'expired-confirmation'
  | 'confirmation-already-used';

/** a link that worked, and what it proved. */
export type ConfirmSuccess = { ok: true; userId: string; email: string };

/** a link that did not work, and which of the three reasons applies. */
export type ConfirmFailure = { ok: false; code: ConfirmationFailureCode };

/** the result of clicking a link. */
export type ConfirmOutcome = ConfirmSuccess | ConfirmFailure;

/** the address may ask for another link. */
export type RateAllowed = { allowed: true };

/** the address has asked too often, and when it may ask again. */
export type RateLimited = { allowed: false; retryAfterSeconds: number };

/** the result of asking whether an address may request another link. */
export type RateOutcome = RateAllowed | RateLimited;

/**
 * Narrow a confirmation outcome to its refusal.
 *
 * A predicate rather than `if (!outcome.ok)`: this workspace compiles without
 * `strictNullChecks`, where truthiness on a boolean-literal discriminant does
 * not narrow a union.
 */
export function isConfirmFailure(outcome: ConfirmOutcome): outcome is ConfirmFailure {
  return outcome.ok === false;
}

/** Narrow a rate outcome to its refusal. Same reason as above. */
export function isRateLimited(outcome: RateOutcome): outcome is RateLimited {
  return outcome.allowed === false;
}

/** a freshly issued link. The token appears here and in one email, nowhere else. */
export type IssuedConfirmation = {
  token: string;
  expiresAt: string;
};

/** the seams tests reach for. */
export type ConfirmationManagerOptions = {
  policy?: ConfirmationPolicy;
  now?: () => Date;
  newId?: () => string;
};

/**
 * Issuing, rate limiting and spending email-confirmation links.
 *
 * It knows nothing about users beyond an id and an address, and nothing about
 * email beyond handing back a token for somebody else to put in one. That is
 * what lets the leak-free signup flow live in one place above it.
 */
export class ConfirmationManager {
  private readonly policy: ConfirmationPolicy;
  private readonly now: () => Date;
  private readonly newId: () => string;

  constructor(
    private readonly store: ConfirmationStore,
    /** the value of `SKYLINE_AUTH_SECRET` — the same one the sessions use. */
    private readonly secret: string,
    options: ConfirmationManagerOptions = {}
  ) {
    this.policy = options.policy ?? DEFAULT_CONFIRMATION_POLICY;
    this.now = options.now ?? (() => new Date());
    this.newId = options.newId ?? randomUUID;
  }

  /**
   * Count an attempt against an address and say whether it may proceed.
   *
   * Call this for **every** signup and resend, before looking the address up —
   * including for addresses that turn out not to exist. A limiter that only
   * counts real accounts answers "does this person have an account?" with a
   * 429, which is the question the whole flow is trying not to answer.
   *
   * The address is fingerprinted before it is stored, so the attempt table
   * does not become a list of addresses that have been tried.
   */
  async recordAttempt(email: string): Promise<RateOutcome> {
    const at = this.now();
    const windowStart = new Date(at.getTime() - this.policy.windowMs);
    const window = await this.store.recordAttempt(
      this.fingerprint(this.normalize(email)),
      at.toISOString(),
      windowStart.toISOString()
    );

    if (window.count <= this.policy.maxPerWindow) return { allowed: true };

    const freeAt = new Date(new Date(window.oldestAt).getTime() + this.policy.windowMs);
    const retryAfterSeconds = Math.max(1, Math.ceil((freeAt.getTime() - at.getTime()) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  /**
   * Issue a link for a user, retiring any that are outstanding.
   *
   * Retiring the old ones matters: without it every resend leaves another live
   * key in another inbox, and the user's mailbox slowly becomes a set of
   * working credentials.
   *
   * @returns the raw token. It exists here and in exactly one email.
   */
  async issue(userId: string, email: string): Promise<IssuedConfirmation> {
    const at = this.now();
    await this.store.expireAllForUser(userId, at.toISOString());

    const token = mintRawToken();
    const record: PlainConfirmation = {
      id: this.newId(),
      userId,
      email: this.normalize(email),
      tokenHash: this.fingerprint(token),
      issuedAt: at.toISOString(),
      expiresAt: new Date(at.getTime() + this.policy.ttlMs).toISOString(),
    };
    await this.store.insert(record);
    return { token, expiresAt: record.expiresAt };
  }

  /**
   * Spend a link.
   *
   * The three refusals are kept apart on purpose. To the person holding the
   * link, "this is not a link" , "this link is too old" and "you have already
   * used this" are three different problems with three different next steps,
   * and collapsing them into one message is how a confirmed user ends up
   * convinced that signup is broken.
   */
  async confirm(token: string): Promise<ConfirmOutcome> {
    if (!token) return { ok: false, code: 'invalid-confirmation' };

    const record = await this.store.findByTokenHash(this.fingerprint(token));
    if (!record) return { ok: false, code: 'invalid-confirmation' };

    const confirmation = Confirmation.from(record);
    if (confirmation.isUsed()) return { ok: false, code: 'confirmation-already-used' };

    const at = this.now();
    if (confirmation.isExpiredAt(at)) return { ok: false, code: 'expired-confirmation' };

    // Compare-and-set: of two clicks arriving together, only one confirms.
    const won = await this.store.markUsed(confirmation.id, at.toISOString());
    if (!won) return { ok: false, code: 'confirmation-already-used' };

    return { ok: true, userId: confirmation.userId, email: confirmation.email };
  }

  /** housekeeping: drop links that are past their expiry. */
  async purgeExpired(): Promise<number> {
    return this.store.deleteExpiredBefore(this.now().toISOString());
  }

  /** the address, as it is compared and stored. */
  private normalize(email: string): string {
    return email.trim().toLowerCase();
  }

  private fingerprint(value: string): string {
    return hashToken(value, this.secret);
  }
}
