export { authFailure, isAuthFailure, statusForAuthError } from './auth-provider.js';
export type { AuthProvider, SignInInput, SignUpInput } from './auth-provider.js';
export {
  AUTH_PROVIDER_ENV,
  DEFAULT_AUTH_PROVIDER,
  UnknownAuthProviderError,
  selectAuthProvider,
} from './select-auth-provider.js';
export type { AuthProviderRegistry } from './select-auth-provider.js';
export type {
  AuthErrorCode,
  AuthFailure,
  AuthSession,
  AuthTokens,
  AuthUser,
  ConfirmResult,
  CurrentUserResult,
  ResendResult,
  SessionResult,
  SignOutResult,
  SignupResult,
} from './auth-types.js';
