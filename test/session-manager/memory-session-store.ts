import type { PlainSession, SessionRevocationReason } from '@luvktest/test.session';
import type { SessionStore } from './session-store.js';

/**
 * A `SessionStore` that keeps everything in a Map.
 *
 * It exists so the rules in `SessionManager` — rotation, replay detection,
 * every expiry boundary — can be tested without a database, and so the docs
 * have something runnable. It is deliberately *not* a fallback for production:
 * a process restart signs everybody out, and two replicas would not agree on
 * who is signed in.
 */
export class MemorySessionStore implements SessionStore {
  private readonly rows = new Map<string, PlainSession>();

  async insert(session: PlainSession): Promise<void> {
    this.rows.set(session.id, { ...session });
  }

  async findByAccessTokenHash(accessTokenHash: string): Promise<PlainSession | undefined> {
    return this.find((row) => row.accessTokenHash === accessTokenHash);
  }

  async findByRefreshTokenHash(refreshTokenHash: string): Promise<PlainSession | undefined> {
    return this.find((row) => row.refreshTokenHash === refreshTokenHash);
  }

  async markRotated(id: string, rotatedAt: string): Promise<boolean> {
    const row = this.rows.get(id);
    if (!row || row.rotatedAt) return false;
    this.rows.set(id, { ...row, rotatedAt });
    return true;
  }

  async revokeFamily(
    familyId: string,
    revokedAt: string,
    reason: SessionRevocationReason
  ): Promise<number> {
    return this.revokeWhere((row) => row.familyId === familyId, revokedAt, reason);
  }

  async revokeAllForUser(
    userId: string,
    revokedAt: string,
    reason: SessionRevocationReason
  ): Promise<number> {
    return this.revokeWhere((row) => row.userId === userId, revokedAt, reason);
  }

  async deleteExpiredBefore(absoluteExpiresBefore: string): Promise<number> {
    let removed = 0;
    for (const [id, row] of this.rows) {
      if (row.absoluteExpiresAt < absoluteExpiresBefore) {
        this.rows.delete(id);
        removed += 1;
      }
    }
    return removed;
  }

  /** every stored record, for assertions. Not part of `SessionStore`. */
  all(): PlainSession[] {
    return Array.from(this.rows.values()).map((row) => ({ ...row }));
  }

  private find(predicate: (row: PlainSession) => boolean): PlainSession | undefined {
    for (const row of this.rows.values()) {
      if (predicate(row)) return { ...row };
    }
    return undefined;
  }

  private revokeWhere(
    predicate: (row: PlainSession) => boolean,
    revokedAt: string,
    reason: SessionRevocationReason
  ): number {
    let revoked = 0;
    for (const [id, row] of this.rows) {
      if (!predicate(row) || row.revokedAt) continue;
      this.rows.set(id, { ...row, revokedAt, revokedReason: reason });
      revoked += 1;
    }
    return revoked;
  }
}
