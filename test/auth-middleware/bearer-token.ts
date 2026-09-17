/**
 * The subset of a request this component reads. Structural on purpose: it
 * matches an Express request without importing Express, so the middleware can
 * be unit-tested with an object literal and carries no framework dependency.
 */
export type HeadersLike = Record<string, string | string[] | undefined>;

/**
 * Pull the bearer token out of an `Authorization` header.
 *
 * Tolerant about the things that are genuinely ambiguous — header casing, the
 * case of the `Bearer` keyword, extra spaces, an array-valued header from a
 * duplicated line — and strict about everything else. A `Basic` credential, a
 * bare token with no scheme, or an empty value all read as "no token", never
 * as a token that will then fail to verify.
 *
 * @returns the raw token, or undefined when the header carries no bearer.
 */
export function bearerTokenFrom(headers: HeadersLike | undefined): string | undefined {
  if (!headers) return undefined;
  const raw = headers.authorization ?? headers.Authorization;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return undefined;

  const match = /^\s*bearer\s+(\S+)\s*$/i.exec(value);
  return match?.[1];
}
