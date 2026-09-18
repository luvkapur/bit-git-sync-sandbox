import type { PlainUser, User } from '@luvktest/test.user';

/**
 * The account storage this provider needs.
 *
 * Four operations. No query language, no filters, no pagination — a provider
 * that needed those would be a database client wearing a costume.
 */
export interface AccountStore {
  /** find an account by its normalised (trimmed, lower-cased) address. */
  findByEmail(email: string): Promise<User | undefined>;

  findById(id: string): Promise<User | undefined>;

  /** persist a new account. The caller has already hashed the password. */
  create(user: PlainUser): Promise<void>;

  /**
   * Mark an address proved.
   *
   * @returns true if this call confirmed it, false if it was already confirmed
   *          or the account is gone.
   */
  markEmailConfirmed(userId: string, confirmedAt: string): Promise<boolean>;
}
