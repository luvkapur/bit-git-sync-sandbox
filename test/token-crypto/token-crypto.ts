import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * The environment variable that carries the auth signing secret.
 *
 * Nothing in this repository ever contains the value. Set it in your
 * deployment (a Kubernetes Secret, a `.env` you do not commit, your shell)
 * and keep it identical across every replica — tokens minted by one pod are
 * verified by the next one, so a per-pod value would sign users out at random.
 */
export const AUTH_SECRET_ENV = 'SKYLINE_AUTH_SECRET';

/**
 * The shortest secret we accept, in characters.
 *
 * 32 is not folklore: the secret keys an HMAC-SHA256, so anything shorter than
 * the 256-bit digest weakens the construction for no saving at all. Generate
 * one with `openssl rand -base64 48`.
 */
export const MIN_AUTH_SECRET_LENGTH = 32;

/** the number of random bytes behind every token we mint. */
export const TOKEN_BYTES = 32;

/**
 * Thrown when the signing secret is absent or too weak.
 *
 * It is deliberately a distinct class: the caller is expected to catch exactly
 * this at boot and fail closed — refuse to serve authentication at all —
 * rather than invent a fallback secret, which would quietly turn every session
 * into one an attacker can forge.
 */
export class MissingAuthSecretError extends Error {
  constructor(readonly detail: string) {
    super(
      `${detail} Set ${AUTH_SECRET_ENV} to at least ${MIN_AUTH_SECRET_LENGTH} characters ` +
        `(for example: openssl rand -base64 48). Authentication stays disabled until you do.`
    );
    this.name = 'MissingAuthSecretError';
  }
}

/**
 * Read the signing secret from the environment, or refuse.
 *
 * There is no default and there is no development fallback. A default secret
 * is worse than no authentication, because it looks like authentication.
 *
 * @param env the environment to read from. Defaults to `process.env`; the
 *            parameter exists so tests never have to mutate the real one.
 * @throws MissingAuthSecretError when the variable is unset, blank or short.
 */
export function readAuthSecret(env: Record<string, string | undefined> = process.env): string {
  const raw = env[AUTH_SECRET_ENV];
  if (raw === undefined || raw.trim() === '') {
    throw new MissingAuthSecretError(`${AUTH_SECRET_ENV} is not set.`);
  }
  const secret = raw.trim();
  if (secret.length < MIN_AUTH_SECRET_LENGTH) {
    throw new MissingAuthSecretError(
      `${AUTH_SECRET_ENV} is only ${secret.length} characters long.`
    );
  }
  return secret;
}

/**
 * Whether a usable signing secret is present, without throwing.
 *
 * Useful for a health endpoint that wants to report "auth disabled" rather
 * than crash the process that is also serving public data.
 */
export function hasAuthSecret(env: Record<string, string | undefined> = process.env): boolean {
  try {
    readAuthSecret(env);
    return true;
  } catch {
    return false;
  }
}

/**
 * Mint a fresh opaque token: 256 bits from the OS CSPRNG, base64url encoded.
 *
 * The value is returned once and never stored anywhere in this form — only its
 * HMAC ever reaches the database. Treat the return value as a password.
 */
export function mintRawToken(bytes: number = TOKEN_BYTES): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * Fingerprint a token for storage: HMAC-SHA256 of the token under the secret.
 *
 * Two properties matter here. A plain SHA-256 would be enough to stop a
 * database dump from being replayed only if tokens were unguessable, which
 * they are — but keying the digest means an attacker who reads the collection
 * still cannot recognise a token they later observe, and cannot pre-compute
 * anything without the secret, which lives outside the database entirely.
 *
 * @param rawToken the token as handed to the client.
 * @param secret   the value of {@link AUTH_SECRET_ENV}.
 * @returns a hex digest, safe to store and safe to index.
 */
export function hashToken(rawToken: string, secret: string): string {
  return createHmac('sha256', secret).update(rawToken).digest('hex');
}

/**
 * Compare two token fingerprints in constant time.
 *
 * Lookups in this codebase go through an indexed equality query, so this is
 * mostly here for callers that have both digests in hand and would otherwise
 * reach for `===`, which leaks the length of the common prefix through timing.
 */
export function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
