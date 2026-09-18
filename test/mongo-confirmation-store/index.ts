export { MongoConfirmationStore } from './mongo-confirmation-store.js';
export {
  confirmationSchema,
  authAttemptSchema,
  CONFIRMATION_MODEL_NAME,
  AUTH_ATTEMPT_MODEL_NAME,
} from './confirmation-schemas.js';
export type { PlainAuthAttempt } from './confirmation-schemas.js';
export { toPlainConfirmation } from './confirmation-document.js';
export type { ConfirmationDocument } from './confirmation-document.js';
