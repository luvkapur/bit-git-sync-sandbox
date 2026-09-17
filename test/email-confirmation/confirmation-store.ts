import type { PlainConfirmation } from './confirmation.js';

/** what an attempt counter answers. */
export type AttemptWindow = {
  /** how many attempts fall inside the window, including the one just recorded. */
  count: number;
  /** when the oldest attempt in the window happened, so a caller can say "try again at". */
  oldestAt: string;
};

/**
 * The storage the confirmation flow needs.
 *
 * Two collections' worth of behaviour, for one reason: the attempt counter is
 * keyed on a *fingerprint of the address as typed*, not on an account. Rate
 * limiting only the addresses that exist would make the 429 itself the answer
 * to "does this person have an account?".
 */
export interface ConfirmationStore {
  insert(confirmation: PlainConfirmation): Promise<void>;

  findByTokenHash(tokenHash: string): Promise<PlainConfirmation | undefined>;

  /**
   * Spend a link, atomically.
   *
   * Must be a compare-and-set — "set usedAt where id matches and usedAt is
   * absent" — so two clicks arriving together cannot both succeed.
   *
   * @returns true if this call spent it, false if it was already spent.
   */
  markUsed(id: string, usedAt: string): Promise<boolean>;

  /**
   * Retire every outstanding link for a user.
   *
   * Called before issuing a new one, so that asking for a fresh link kills the
   * old one — otherwise every resend leaves another live key in another inbox.
   *
   * @returns how many were still outstanding.
   */
  expireAllForUser(userId: string, expiredAt: string): Promise<number>;

  /**
   * Record an attempt against an address fingerprint and report the window.
   *
   * Called for every request, whether or not the address belongs to anyone.
   */
  recordAttempt(emailKey: string, at: string, windowStart: string): Promise<AttemptWindow>;

  /** housekeeping: drop links and attempts older than the given instant. */
  deleteExpiredBefore(before: string): Promise<number>;
}
