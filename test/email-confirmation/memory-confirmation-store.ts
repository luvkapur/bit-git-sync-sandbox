import type { PlainConfirmation } from './confirmation.js';
import type { AttemptWindow, ConfirmationStore } from './confirmation-store.js';

/**
 * A `ConfirmationStore` in two Maps.
 *
 * What the spec runs on, and what the docs can demonstrate. Not a production
 * store: a restart forgets every outstanding link and every rate limit, and
 * two replicas would not agree about either.
 */
export class MemoryConfirmationStore implements ConfirmationStore {
  private readonly rows = new Map<string, PlainConfirmation>();
  private readonly attempts = new Map<string, string[]>();

  async insert(confirmation: PlainConfirmation): Promise<void> {
    this.rows.set(confirmation.id, { ...confirmation });
  }

  async findByTokenHash(tokenHash: string): Promise<PlainConfirmation | undefined> {
    for (const row of this.rows.values()) {
      if (row.tokenHash === tokenHash) return { ...row };
    }
    return undefined;
  }

  async markUsed(id: string, usedAt: string): Promise<boolean> {
    const row = this.rows.get(id);
    if (!row || row.usedAt) return false;
    this.rows.set(id, { ...row, usedAt });
    return true;
  }

  async expireAllForUser(userId: string, expiredAt: string): Promise<number> {
    let retired = 0;
    for (const [id, row] of this.rows) {
      if (row.userId !== userId || row.usedAt || row.expiresAt <= expiredAt) continue;
      this.rows.set(id, { ...row, expiresAt: expiredAt });
      retired += 1;
    }
    return retired;
  }

  async recordAttempt(emailKey: string, at: string, windowStart: string): Promise<AttemptWindow> {
    const kept = (this.attempts.get(emailKey) ?? []).filter((stamp) => stamp >= windowStart);
    kept.push(at);
    kept.sort();
    this.attempts.set(emailKey, kept);
    return { count: kept.length, oldestAt: kept[0] ?? at };
  }

  async deleteExpiredBefore(before: string): Promise<number> {
    let removed = 0;
    for (const [id, row] of this.rows) {
      if (row.expiresAt < before) {
        this.rows.delete(id);
        removed += 1;
      }
    }
    for (const [key, stamps] of this.attempts) {
      const kept = stamps.filter((stamp) => stamp >= before);
      if (kept.length) this.attempts.set(key, kept);
      else this.attempts.delete(key);
    }
    return removed;
  }

  /** every stored link, for assertions. Not part of `ConfirmationStore`. */
  all(): PlainConfirmation[] {
    return Array.from(this.rows.values()).map((row) => ({ ...row }));
  }
}
