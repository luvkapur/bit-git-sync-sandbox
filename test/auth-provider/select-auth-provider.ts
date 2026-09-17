import type { AuthProvider } from './auth-provider.js';

/**
 * The environment variable that chooses an implementation.
 *
 * This is the whole switching mechanism. Moving from a managed provider to
 * your own infrastructure is a value in a deployment manifest, not a change in
 * the application — which is only true because nothing downstream imports an
 * implementation.
 */
export const AUTH_PROVIDER_ENV = 'SKYLINE_AUTH_PROVIDER';

/** the name used when the variable is unset. */
export const DEFAULT_AUTH_PROVIDER = 'local';

/**
 * A map of provider name to a factory that builds it.
 *
 * Factories rather than instances so that choosing `local` never constructs
 * the machinery a hosted provider would need, and vice versa.
 */
export type AuthProviderRegistry = Record<string, () => AuthProvider>;

/** thrown when the environment names a provider that was not registered. */
export class UnknownAuthProviderError extends Error {
  constructor(readonly requested: string, readonly available: string[]) {
    super(
      `${AUTH_PROVIDER_ENV} is set to "${requested}", which is not one of: ${available.join(', ')}. ` +
        `Either register that provider or correct the variable.`
    );
    this.name = 'UnknownAuthProviderError';
  }
}

/**
 * Pick the implementation the environment asks for.
 *
 * Fails loudly on an unknown name rather than falling back to the default: a
 * deployment that meant to use a hosted provider and quietly used the local
 * one instead would be storing passwords nobody expected it to store.
 *
 * @example
 * const auth = selectAuthProvider({
 *   local: () => new LocalAuthProvider(deps),
 *   clerk: () => new ClerkAuthProvider(clerkDeps),
 * });
 */
export function selectAuthProvider(
  registry: AuthProviderRegistry,
  env: Record<string, string | undefined> = process.env
): AuthProvider {
  const requested = (env[AUTH_PROVIDER_ENV] ?? DEFAULT_AUTH_PROVIDER).trim() || DEFAULT_AUTH_PROVIDER;
  const build = registry[requested];
  if (!build) throw new UnknownAuthProviderError(requested, Object.keys(registry));
  return build();
}
