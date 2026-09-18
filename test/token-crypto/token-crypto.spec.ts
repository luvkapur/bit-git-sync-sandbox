import {
  AUTH_SECRET_ENV,
  MIN_AUTH_SECRET_LENGTH,
  MissingAuthSecretError,
  hasAuthSecret,
  hashToken,
  hashesMatch,
  mintRawToken,
  readAuthSecret,
} from './token-crypto.js';

const GOOD_SECRET = 'x'.repeat(MIN_AUTH_SECRET_LENGTH);

describe('readAuthSecret', () => {
  it('returns the secret when it is present and long enough', () => {
    expect(readAuthSecret({ [AUTH_SECRET_ENV]: GOOD_SECRET })).toEqual(GOOD_SECRET);
  });

  it('fails closed when the variable is missing', () => {
    expect(() => readAuthSecret({})).toThrow(MissingAuthSecretError);
  });

  it('fails closed on a blank value rather than signing with whitespace', () => {
    expect(() => readAuthSecret({ [AUTH_SECRET_ENV]: '   ' })).toThrow(MissingAuthSecretError);
  });

  it('rejects a secret shorter than the HMAC digest it keys', () => {
    expect(() => readAuthSecret({ [AUTH_SECRET_ENV]: 'too-short' })).toThrow(MissingAuthSecretError);
  });

  it('names the environment variable in the error, so the fix is obvious', () => {
    expect(() => readAuthSecret({})).toThrow(AUTH_SECRET_ENV);
  });

  it('reports availability without throwing', () => {
    expect(hasAuthSecret({})).toEqual(false);
    expect(hasAuthSecret({ [AUTH_SECRET_ENV]: GOOD_SECRET })).toEqual(true);
  });
});

describe('mintRawToken', () => {
  it('never repeats itself', () => {
    const minted = new Set(Array.from({ length: 500 }, () => mintRawToken()));
    expect(minted.size).toEqual(500);
  });

  it('is url-safe, so it survives a header and a query string', () => {
    expect(mintRawToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('carries at least 256 bits', () => {
    expect(mintRawToken().length).toBeGreaterThanOrEqual(43);
  });
});

describe('hashToken', () => {
  it('is deterministic for the same token and secret', () => {
    expect(hashToken('abc', GOOD_SECRET)).toEqual(hashToken('abc', GOOD_SECRET));
  });

  it('never returns the token itself', () => {
    expect(hashToken('abc', GOOD_SECRET)).not.toEqual('abc');
  });

  it('produces a different digest under a different secret', () => {
    expect(hashToken('abc', GOOD_SECRET)).not.toEqual(hashToken('abc', `${GOOD_SECRET}!`));
  });

  it('produces a hex sha256 digest', () => {
    expect(hashToken('abc', GOOD_SECRET)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('hashesMatch', () => {
  it('accepts identical digests', () => {
    const digest = hashToken('abc', GOOD_SECRET);
    expect(hashesMatch(digest, digest)).toEqual(true);
  });

  it('rejects different digests', () => {
    expect(hashesMatch(hashToken('abc', GOOD_SECRET), hashToken('abd', GOOD_SECRET))).toEqual(false);
  });

  it('rejects values of different lengths without throwing', () => {
    expect(hashesMatch('abc', 'abcd')).toEqual(false);
  });
});
