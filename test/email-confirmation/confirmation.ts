/**
 * One confirmation link, as stored.
 *
 * Primitives only, so the record round-trips through JSON, Mongo and a test
 * fixture without a serializer.
 */
export type PlainConfirmation = {
  id: string;
  userId: string;
  /**
   * the address this link proves, as it was when the link was issued.
   *
   * Stored rather than looked up, so that changing your email address
   * invalidates a link that is still in an inbox — it would otherwise confirm
   * an address nobody has proved.
   */
  email: string;
  /** HMAC of the token. Never the token. */
  tokenHash: string;
  issuedAt: string;
  expiresAt: string;
  /** set the moment the link is used. A second use is not a mistake we forgive. */
  usedAt?: string;
};

/**
 * A single-use, expiring proof that somebody can read a mailbox.
 *
 * Deliberately not a session: it is weaker than a password, it travels through
 * a medium that is often logged and sometimes prefetched, and it is worth
 * exactly one thing — turning an account on.
 */
export class Confirmation {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly email: string,
    readonly tokenHash: string,
    readonly issuedAt: Date,
    readonly expiresAt: Date,
    readonly usedAt?: Date
  ) {}

  /** whether the link has already been clicked. */
  isUsed(): boolean {
    return this.usedAt !== undefined;
  }

  /** whether the link is too old. */
  isExpiredAt(now: Date = new Date()): boolean {
    return now >= this.expiresAt;
  }

  /** whether the link would work right now. */
  isUsableAt(now: Date = new Date()): boolean {
    return !this.isUsed() && !this.isExpiredAt(now);
  }

  toObject(): PlainConfirmation {
    const plain: PlainConfirmation = {
      id: this.id,
      userId: this.userId,
      email: this.email,
      tokenHash: this.tokenHash,
      issuedAt: this.issuedAt.toISOString(),
      expiresAt: this.expiresAt.toISOString(),
    };
    if (this.usedAt) plain.usedAt = this.usedAt.toISOString();
    return plain;
  }

  static from(plain: PlainConfirmation): Confirmation {
    return new Confirmation(
      plain.id,
      plain.userId,
      plain.email,
      plain.tokenHash,
      new Date(plain.issuedAt),
      new Date(plain.expiresAt),
      plain.usedAt ? new Date(plain.usedAt) : undefined
    );
  }
}
