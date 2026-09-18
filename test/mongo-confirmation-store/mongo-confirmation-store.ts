import mongoose, { Model } from 'mongoose';
import type {
  AttemptWindow,
  ConfirmationStore,
  PlainConfirmation,
} from '@luvktest/test.email-confirmation';
import {
  AUTH_ATTEMPT_MODEL_NAME,
  CONFIRMATION_MODEL_NAME,
  PlainAuthAttempt,
  authAttemptSchema,
  confirmationSchema,
} from './confirmation-schemas.js';
import { toPlainConfirmation } from './confirmation-document.js';

/**
 * Confirmation links and attempt counters, in MongoDB.
 *
 * Thin by design: every rule about expiry, single use and rate limits lives in
 * `ConfirmationManager`, which is why those rules are tested without a database.
 *
 * @example
 * const store = MongoConfirmationStore.usingDefaultConnection();
 * const confirmations = new ConfirmationManager(store, readAuthSecret());
 */
export class MongoConfirmationStore implements ConfirmationStore {
  constructor(
    private readonly confirmations: Model<PlainConfirmation>,
    private readonly attempts: Model<PlainAuthAttempt>
  ) {}

  async insert(confirmation: PlainConfirmation): Promise<void> {
    await this.confirmations.create(confirmation);
  }

  async findByTokenHash(tokenHash: string): Promise<PlainConfirmation | undefined> {
    const doc = await this.confirmations.findOne({ tokenHash }).lean();
    return toPlainConfirmation(doc as Record<string, unknown> | null);
  }

  /**
   * Spend a link, atomically.
   *
   * `usedAt: { $exists: false }` in the filter is what makes this safe against
   * two clicks arriving together — a read followed by a write would let both
   * through, and a single-use link that can be used twice is not single use.
   */
  async markUsed(id: string, usedAt: string): Promise<boolean> {
    const result = await this.confirmations.updateOne(
      { id, usedAt: { $exists: false } },
      { $set: { usedAt } }
    );
    return result.modifiedCount === 1;
  }

  async expireAllForUser(userId: string, expiredAt: string): Promise<number> {
    const result = await this.confirmations.updateMany(
      { userId, usedAt: { $exists: false }, expiresAt: { $gt: expiredAt } },
      { $set: { expiresAt: expiredAt } }
    );
    return result.modifiedCount;
  }

  async recordAttempt(emailKey: string, at: string, windowStart: string): Promise<AttemptWindow> {
    await this.attempts.create({ emailKey, at });
    const inWindow = await this.attempts
      .find({ emailKey, at: { $gte: windowStart } })
      .sort({ at: 1 })
      .lean();
    const oldest = inWindow[0] as { at?: string } | undefined;
    return { count: inWindow.length, oldestAt: oldest?.at ?? at };
  }

  async deleteExpiredBefore(before: string): Promise<number> {
    const links = await this.confirmations.deleteMany({ expiresAt: { $lt: before } });
    await this.attempts.deleteMany({ at: { $lt: before } });
    return links.deletedCount ?? 0;
  }

  /** build a store on the mongoose connection the process already has. */
  static usingDefaultConnection(): MongoConfirmationStore {
    const confirmations =
      (mongoose.models[CONFIRMATION_MODEL_NAME] as Model<PlainConfirmation> | undefined) ??
      mongoose.model<PlainConfirmation>(CONFIRMATION_MODEL_NAME, confirmationSchema);
    const attempts =
      (mongoose.models[AUTH_ATTEMPT_MODEL_NAME] as Model<PlainAuthAttempt> | undefined) ??
      mongoose.model<PlainAuthAttempt>(AUTH_ATTEMPT_MODEL_NAME, authAttemptSchema);
    return new MongoConfirmationStore(confirmations, attempts);
  }
}
