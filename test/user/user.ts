import bcrypt from 'bcryptjs';

export type PlainUser = {
  id: string;
  email: string;
  name: string;
  /** bcrypt hash. never the raw password. */
  passwordHash: string;
  createdAt: string;
  /**
   * when the address was proved, if it has been.
   *
   * Absent means unconfirmed, and an unconfirmed account cannot sign in. It is
   * optional rather than required so that a row written before confirmation
   * existed still reads — such a row is treated as unconfirmed, which is the
   * safe reading, and its owner can ask for a link.
   */
  confirmedAt?: string;
};

/**
 * A user of the CRM.
 *
 * Note what this is: an ordinary class in your own codebase, stored in your own
 * database. The password is a bcrypt hash in a field you declared. No platform
 * is holding these accounts on your behalf, which is why there is nothing to
 * migrate if you leave.
 */
export class User {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly name: string,
    readonly passwordHash: string,
    readonly createdAt: Date,
    readonly confirmedAt?: Date
  ) {}

  /** whether the address on this account has been proved. */
  isEmailConfirmed(): boolean {
    return this.confirmedAt !== undefined;
  }

  /** the same user, with their address proved at the given moment. */
  confirmed(at: Date): User {
    return new User(this.id, this.email, this.name, this.passwordHash, this.createdAt, at);
  }

  /** verify a raw password against the stored bcrypt hash. */
  async verifyPassword(rawPassword: string): Promise<boolean> {
    return bcrypt.compare(rawPassword, this.passwordHash);
  }

  /** the safe shape to send to a browser — never includes the hash. */
  toPublic() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      emailConfirmed: this.isEmailConfirmed(),
    };
  }

  toObject(): PlainUser {
    const plain: PlainUser = {
      id: this.id,
      email: this.email,
      name: this.name,
      passwordHash: this.passwordHash,
      createdAt: this.createdAt.toISOString(),
    };
    if (this.confirmedAt) plain.confirmedAt = this.confirmedAt.toISOString();
    return plain;
  }

  static from(plain: PlainUser) {
    return new User(
      plain.id,
      plain.email,
      plain.name,
      plain.passwordHash,
      new Date(plain.createdAt),
      plain.confirmedAt ? new Date(plain.confirmedAt) : undefined
    );
  }

  /** hash a raw password at the cost factor we use everywhere. */
  static hashPassword(rawPassword: string): string {
    return bcrypt.hashSync(rawPassword, 10);
  }
}
