import type { PlainSession, SessionRevocationReason } from '@luvktest/test.session';

/**
 * The storage this layer needs, and nothing more.
 *
 * It is a port on purpose. `SessionManager` holds every rule about rotation,
 * replay and expiry; an implementation of this interface only has to store
 * records and answer two indexed lookups. That is what makes the rules
 * testable in memory and makes swapping Mongo for anything else a one-file job.
 */
export interface SessionStore {
  /** persist a newly issued generation. */
  insert(session: PlainSession): Promise<void>;

  /** find the generation that issued this access token fingerprint. */
  findByAccessTokenHash(accessTokenHash: string): Promise<PlainSession | undefined>;

  /** find the generation that issued this refresh token fingerprint. */
  findByRefreshTokenHash(refreshTokenHash: string): Promise<PlainSession | undefined>;

  /**
   * Mark a generation as spent — atomically.
   *
   * This is the one operation that cannot be a read followed by a write. Two
   * requests arriving with the same refresh token must not both succeed, so
   * the implementation has to be a compare-and-set ("set rotatedAt where id
   * matches **and** rotatedAt is absent") and report whether it was the one
   * that won.
   *
   * @returns true if this call spent the token, false if it was already spent.
   */
  markRotated(id: string, rotatedAt: string): Promise<boolean>;

  /** kill every generation in a family. Returns how many were still alive. */
  revokeFamily(familyId: string, revokedAt: string, reason: SessionRevocationReason): Promise<number>;

  /** kill every family belonging to a user. Returns how many were still alive. */
  revokeAllForUser(userId: string, revokedAt: string, reason: SessionRevocationReason): Promise<number>;

  /**
   * Drop records whose absolute ceiling is in the past.
   *
   * Housekeeping, not security: an expired record is already refused by the
   * rules. This only stops the collection growing forever.
   */
  deleteExpiredBefore(absoluteExpiresBefore: string): Promise<number>;
}
