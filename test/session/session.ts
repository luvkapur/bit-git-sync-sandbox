/**
 * Why a session was killed. Stored so that an incident can be read back out of
 * the database months later, when nobody remembers what happened.
 */
export type SessionRevocationReason =
  /** the user pressed "sign out" */
  | 'logout'
  /** the user signed out everywhere, or changed their password */
  | 'logout-all'
  /** a refresh token was presented twice — see the reuse rule in session-manager */
  | 'token-reuse';

/**
 * One generation of a session, as stored.
 *
 * Every field is a primitive so the record round-trips through JSON, Mongo and
 * a test fixture without a serializer. Timestamps are ISO-8601 strings for the
 * same reason: they compare correctly as strings and read correctly in a shell.
 */
export type PlainSession = {
  /** unique id of this generation. */
  id: string;
  /** the account this session belongs to. */
  userId: string;
  /**
   * the chain this generation belongs to.
   *
   * Every rotation creates a new record with the same `familyId`. Revoking a
   * family is what "sign out" and "someone replayed a token" both do.
   */
  familyId: string;
  /** HMAC of the access token issued alongside this generation. Never the token. */
  accessTokenHash: string;
  /** HMAC of the refresh token issued for this generation. Never the token. */
  refreshTokenHash: string;
  /** 0 for a fresh login, incremented by every refresh. */
  generation: number;
  /** when this generation was issued. */
  issuedAt: string;
  /** when the access token stops being accepted. Minutes away, by design. */
  accessExpiresAt: string;
  /** when the refresh token stops being accepted. */
  refreshExpiresAt: string;
  /**
   * the ceiling for the whole family, carried unchanged across rotations.
   *
   * Without it, a session that refreshes often never ends — each rotation
   * would push the horizon out again and a stolen token could be kept alive
   * indefinitely.
   */
  absoluteExpiresAt: string;
  /** set the moment this refresh token is exchanged. A second exchange is an attack. */
  rotatedAt?: string;
  /** set when the family was killed. */
  revokedAt?: string;
  /** why, if it was. */
  revokedReason?: SessionRevocationReason;
};

/**
 * One generation of a signed-in session.
 *
 * The class holds no tokens — only their fingerprints — so an instance of it
 * is safe to log. All the questions the server needs to ask ("is this access
 * token still good?", "has this refresh token already been spent?") are
 * methods here rather than inline date arithmetic at the call site.
 */
export class Session {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly familyId: string,
    readonly accessTokenHash: string,
    readonly refreshTokenHash: string,
    readonly generation: number,
    readonly issuedAt: Date,
    readonly accessExpiresAt: Date,
    readonly refreshExpiresAt: Date,
    readonly absoluteExpiresAt: Date,
    readonly rotatedAt?: Date,
    readonly revokedAt?: Date,
    readonly revokedReason?: SessionRevocationReason
  ) {}

  /** whether this refresh token has already been exchanged for a newer one. */
  isRotated(): boolean {
    return this.rotatedAt !== undefined;
  }

  /** whether the family this generation belongs to has been killed. */
  isRevoked(): boolean {
    return this.revokedAt !== undefined;
  }

  /**
   * whether the access token of this generation should be honoured.
   *
   * Rotation invalidates it on purpose: a client that has just refreshed holds
   * a newer one, so continuing to accept the old token only widens the window
   * in which a copy of it is useful.
   */
  isAccessValidAt(now: Date = new Date()): boolean {
    if (this.isRevoked() || this.isRotated()) return false;
    if (now >= this.accessExpiresAt) return false;
    return now < this.absoluteExpiresAt;
  }

  /**
   * whether this refresh token should be accepted for an exchange.
   *
   * Note what is *not* here: a rotated token returns `false`, but the caller
   * must treat that case as an attack rather than as a plain refusal. See
   * `SessionManager.refresh`.
   */
  isRefreshValidAt(now: Date = new Date()): boolean {
    if (this.isRevoked() || this.isRotated()) return false;
    if (now >= this.refreshExpiresAt) return false;
    return now < this.absoluteExpiresAt;
  }

  /** seconds until the access token expires, floored at zero. */
  accessExpiresInSeconds(now: Date = new Date()): number {
    return Math.max(0, Math.floor((this.accessExpiresAt.getTime() - now.getTime()) / 1000));
  }

  /** the shape a client may see: no fingerprints, no user id it did not already know. */
  toPublic() {
    return {
      id: this.id,
      issuedAt: this.issuedAt.toISOString(),
      accessExpiresAt: this.accessExpiresAt.toISOString(),
      refreshExpiresAt: this.refreshExpiresAt.toISOString(),
    };
  }

  /** serialize into a plain, storable object. */
  toObject(): PlainSession {
    const plain: PlainSession = {
      id: this.id,
      userId: this.userId,
      familyId: this.familyId,
      accessTokenHash: this.accessTokenHash,
      refreshTokenHash: this.refreshTokenHash,
      generation: this.generation,
      issuedAt: this.issuedAt.toISOString(),
      accessExpiresAt: this.accessExpiresAt.toISOString(),
      refreshExpiresAt: this.refreshExpiresAt.toISOString(),
      absoluteExpiresAt: this.absoluteExpiresAt.toISOString(),
    };
    if (this.rotatedAt) plain.rotatedAt = this.rotatedAt.toISOString();
    if (this.revokedAt) plain.revokedAt = this.revokedAt.toISOString();
    if (this.revokedReason) plain.revokedReason = this.revokedReason;
    return plain;
  }

  /** create a Session from a plain object. */
  static from(plain: PlainSession): Session {
    return new Session(
      plain.id,
      plain.userId,
      plain.familyId,
      plain.accessTokenHash,
      plain.refreshTokenHash,
      plain.generation,
      new Date(plain.issuedAt),
      new Date(plain.accessExpiresAt),
      new Date(plain.refreshExpiresAt),
      new Date(plain.absoluteExpiresAt),
      plain.rotatedAt ? new Date(plain.rotatedAt) : undefined,
      plain.revokedAt ? new Date(plain.revokedAt) : undefined,
      plain.revokedReason
    );
  }
}
