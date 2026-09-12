import bcrypt from 'bcryptjs';

export type PlainUser = {
  id: string;
  email: string;
  name: string;
  /** bcrypt hash. never the raw password. */
  passwordHash: string;
  createdAt: string;
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
    readonly createdAt: Date
  ) {}

  /** verify a raw password against the stored bcrypt hash. */
  async verifyPassword(rawPassword: string): Promise<boolean> {
    return bcrypt.compare(rawPassword, this.passwordHash);
  }

  /** the safe shape to send to a browser — never includes the hash. */
  toPublic() {
    return { id: this.id, email: this.email, name: this.name };
  }

  toObject(): PlainUser {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      passwordHash: this.passwordHash,
      createdAt: this.createdAt.toISOString(),
    };
  }

  static from(plain: PlainUser) {
    return new User(plain.id, plain.email, plain.name, plain.passwordHash, new Date(plain.createdAt));
  }

  /** hash a raw password at the cost factor we use everywhere. */
  static hashPassword(rawPassword: string): string {
    return bcrypt.hashSync(rawPassword, 10);
  }
}
