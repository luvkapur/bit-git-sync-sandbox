import mongoose, { Model } from 'mongoose';
import type { PlainSession, SessionRevocationReason } from '@luvktest/test.session';
import type { SessionStore } from '@luvktest/test.session-manager';
import { SESSION_MODEL_NAME, sessionSchema } from './session-schema.js';
import { toPlainSession } from './session-document.js';

/**
 * The sessions collection, behind the `SessionStore` port.
 *
 * Deliberately thin: it stores records and answers two indexed lookups. Every
 * rule about rotation, replay and expiry lives in `SessionManager`, which is
 * why those rules are tested without a database at all.
 *
 * @example
 * const store = MongoSessionStore.usingDefaultConnection();
 * const sessions = new SessionManager(store, readAuthSecret());
 */
export class MongoSessionStore implements SessionStore {
  constructor(private readonly sessions: Model<PlainSession>) {}

  async insert(session: PlainSession): Promise<void> {
    await this.sessions.create(session);
  }

  async findByAccessTokenHash(accessTokenHash: string): Promise<PlainSession | undefined> {
    const doc = await this.sessions.findOne({ accessTokenHash }).lean();
    return toPlainSession(doc as Record<string, unknown> | null);
  }

  async findByRefreshTokenHash(refreshTokenHash: string): Promise<PlainSession | undefined> {
    const doc = await this.sessions.findOne({ refreshTokenHash }).lean();
    return toPlainSession(doc as Record<string, unknown> | null);
  }

  /**
   * Spend a refresh token, atomically.
   *
   * The `rotatedAt: { $exists: false }` in the filter is what makes this a
   * compare-and-set: Mongo matches at most one document, so of two concurrent
   * refreshes carrying the same token exactly one gets `modifiedCount === 1`
   * and the other is told it lost — which `SessionManager` treats as replay.
   *
   * A read-then-write here would let both through and hand out two live
   * sessions from one token.
   */
  async markRotated(id: string, rotatedAt: string): Promise<boolean> {
    const result = await this.sessions.updateOne(
      { id, rotatedAt: { $exists: false } },
      { $set: { rotatedAt } }
    );
    return result.modifiedCount === 1;
  }

  async revokeFamily(
    familyId: string,
    revokedAt: string,
    reason: SessionRevocationReason
  ): Promise<number> {
    const result = await this.sessions.updateMany(
      { familyId, revokedAt: { $exists: false } },
      { $set: { revokedAt, revokedReason: reason } }
    );
    return result.modifiedCount;
  }

  async revokeAllForUser(
    userId: string,
    revokedAt: string,
    reason: SessionRevocationReason
  ): Promise<number> {
    const result = await this.sessions.updateMany(
      { userId, revokedAt: { $exists: false } },
      { $set: { revokedAt, revokedReason: reason } }
    );
    return result.modifiedCount;
  }

  async deleteExpiredBefore(absoluteExpiresBefore: string): Promise<number> {
    const result = await this.sessions.deleteMany({
      absoluteExpiresAt: { $lt: absoluteExpiresBefore },
    });
    return result.deletedCount ?? 0;
  }

  /**
   * Build a store on the mongoose connection the process already has.
   *
   * Reuses an existing `Session` model if one is registered — registering the
   * same model twice is a fatal error in mongoose, and in a workspace where a
   * module can be imported down two paths that is not hypothetical.
   */
  static usingDefaultConnection(): MongoSessionStore {
    const existing = mongoose.models[SESSION_MODEL_NAME] as Model<PlainSession> | undefined;
    const model = existing ?? mongoose.model<PlainSession>(SESSION_MODEL_NAME, sessionSchema);
    return new MongoSessionStore(model);
  }
}
