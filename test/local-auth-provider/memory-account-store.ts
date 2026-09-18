import { PlainUser, User } from '@luvktest/test.user';
import type { AccountStore } from './account-store.js';

/**
 * An `AccountStore` in a Map.
 *
 * What the spec runs on. Not a production store — it forgets everything on
 * restart, which for an accounts table is not a trade-off, it is a bug.
 */
export class MemoryAccountStore implements AccountStore {
  private readonly rows = new Map<string, PlainUser>();

  async findByEmail(email: string): Promise<User | undefined> {
    for (const row of this.rows.values()) {
      if (row.email === email) return User.from({ ...row });
    }
    return undefined;
  }

  async findById(id: string): Promise<User | undefined> {
    const row = this.rows.get(id);
    return row ? User.from({ ...row }) : undefined;
  }

  async create(user: PlainUser): Promise<void> {
    this.rows.set(user.id, { ...user });
  }

  async markEmailConfirmed(userId: string, confirmedAt: string): Promise<boolean> {
    const row = this.rows.get(userId);
    if (!row || row.confirmedAt) return false;
    this.rows.set(userId, { ...row, confirmedAt });
    return true;
  }

  /** every stored account, for assertions. Not part of `AccountStore`. */
  all(): PlainUser[] {
    return Array.from(this.rows.values()).map((row) => ({ ...row }));
  }

  /** forget an account, to test what happens to a session that outlives one. */
  delete(id: string): void {
    this.rows.delete(id);
  }
}
