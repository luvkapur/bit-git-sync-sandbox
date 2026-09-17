export { Confirmation } from './confirmation.js';
export type { PlainConfirmation } from './confirmation.js';
export {
  ConfirmationManager,
  DEFAULT_CONFIRMATION_POLICY,
  isConfirmFailure,
  isRateLimited,
} from './confirmation-manager.js';
export type {
  ConfirmFailure,
  ConfirmOutcome,
  ConfirmSuccess,
  RateAllowed,
  RateLimited,
  ConfirmationFailureCode,
  ConfirmationManagerOptions,
  ConfirmationPolicy,
  IssuedConfirmation,
  RateOutcome,
} from './confirmation-manager.js';
export type { AttemptWindow, ConfirmationStore } from './confirmation-store.js';
export { MemoryConfirmationStore } from './memory-confirmation-store.js';
