import { authFailure, isAuthFailure, statusForAuthError } from './auth-provider.js';
import type { AuthProvider } from './auth-provider.js';
import {
  AUTH_PROVIDER_ENV,
  UnknownAuthProviderError,
  selectAuthProvider,
} from './select-auth-provider.js';
import type { AuthErrorCode } from './auth-types.js';

const ALL_CODES: AuthErrorCode[] = [
  'no-token',
  'invalid-token',
  'expired-access-token',
  'expired-session',
  'token-reused',
  'revoked',
  'invalid-credentials',
  'email-not-confirmed',
  'invalid-confirmation',
  'expired-confirmation',
  'confirmation-already-used',
  'invalid-email',
  'weak-password',
  'rate-limited',
  'not-supported',
  'unavailable',
];

function namedProvider(name: string): AuthProvider {
  return { name } as AuthProvider;
}

describe('failures', () => {
  it('gives every code a sentence a person can read', () => {
    for (const code of ALL_CODES) {
      const failure = authFailure(code);
      expect(failure.ok).toEqual(false);
      expect(failure.message.length).toBeGreaterThan(0);
      expect(failure.message).not.toEqual(code);
    }
  });

  it('carries a retry hint only when there is one', () => {
    expect(authFailure('rate-limited', 90).retryAfterSeconds).toEqual(90);
    expect(Object.keys(authFailure('invalid-token'))).not.toContain('retryAfterSeconds');
  });

  it('says nothing about who exists in the credential refusal', () => {
    expect(authFailure('invalid-credentials').message).toEqual('invalid email or password');
  });

  it('narrows a result to its refusal branch', () => {
    const failed = isAuthFailure(authFailure('revoked'));
    const passed = isAuthFailure({ ok: true as const, user: null });
    expect([failed, passed]).toEqual([true, false]);
  });
});

describe('http statuses', () => {
  it('maps every code to a status', () => {
    for (const code of ALL_CODES) {
      expect(statusForAuthError(code)).toBeGreaterThanOrEqual(400);
    }
  });

  it('answers a token problem with 401 and a forbidden account with 403', () => {
    expect(statusForAuthError('expired-access-token')).toEqual(401);
    expect(statusForAuthError('email-not-confirmed')).toEqual(403);
  });

  it('answers a spent or stale confirmation link with 410, not 404', () => {
    expect(statusForAuthError('confirmation-already-used')).toEqual(410);
    expect(statusForAuthError('expired-confirmation')).toEqual(410);
  });

  it('answers too many attempts with 429 and a broken provider with 503', () => {
    expect(statusForAuthError('rate-limited')).toEqual(429);
    expect(statusForAuthError('unavailable')).toEqual(503);
  });
});

describe('choosing an implementation', () => {
  const registry = {
    local: () => namedProvider('local'),
    clerk: () => namedProvider('clerk'),
  };

  it('defaults to the local implementation', () => {
    expect(selectAuthProvider(registry, {}).name).toEqual('local');
  });

  it('switches on an environment variable alone', () => {
    expect(selectAuthProvider(registry, { [AUTH_PROVIDER_ENV]: 'clerk' }).name).toEqual('clerk');
  });

  it('ignores surrounding whitespace and an empty value', () => {
    expect(selectAuthProvider(registry, { [AUTH_PROVIDER_ENV]: ' clerk ' }).name).toEqual('clerk');
    expect(selectAuthProvider(registry, { [AUTH_PROVIDER_ENV]: '   ' }).name).toEqual('local');
  });

  it('refuses a name nobody registered rather than quietly using the default', () => {
    expect(() => selectAuthProvider(registry, { [AUTH_PROVIDER_ENV]: 'auth0' })).toThrow(
      UnknownAuthProviderError
    );
  });

  it('lists what was available, so the fix is in the error', () => {
    try {
      selectAuthProvider(registry, { [AUTH_PROVIDER_ENV]: 'auth0' });
      throw new Error('expected it to throw');
    } catch (e) {
      expect((e as Error).message).toContain('local, clerk');
      expect((e as Error).message).toContain(AUTH_PROVIDER_ENV);
    }
  });

  it('builds only the provider that was chosen', () => {
    let builtClerk = false;
    selectAuthProvider(
      {
        local: () => namedProvider('local'),
        clerk: () => {
          builtClerk = true;
          return namedProvider('clerk');
        },
      },
      {}
    );
    expect(builtClerk).toEqual(false);
  });
});
