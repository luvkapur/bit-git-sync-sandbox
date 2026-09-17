import { Schema } from 'mongoose';
import type { PlainConfirmation } from '@luvktest/test.email-confirmation';

/**
 * The confirmation links collection.
 *
 * Fingerprints, never tokens — a dump of this collection cannot be used to
 * confirm anybody's address, because the HMAC key lives in the environment.
 */
export const confirmationSchema = new Schema<PlainConfirmation>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  email: { type: String, required: true },
  tokenHash: { type: String, required: true, unique: true },
  issuedAt: { type: String, required: true },
  expiresAt: { type: String, required: true, index: true },
  usedAt: { type: String, required: false },
});

/** one recorded signup or resend attempt, for rate limiting. */
export type PlainAuthAttempt = {
  /** HMAC of the address as typed. Never the address itself. */
  emailKey: string;
  at: string;
};

/**
 * The attempt counter.
 *
 * Keyed on a fingerprint rather than an address on purpose: the table exists
 * to throttle requests, not to become a list of every address anybody has
 * ever typed into the signup form.
 */
export const authAttemptSchema = new Schema<PlainAuthAttempt>({
  emailKey: { type: String, required: true, index: true },
  at: { type: String, required: true, index: true },
});

export const CONFIRMATION_MODEL_NAME = 'Confirmation';
export const AUTH_ATTEMPT_MODEL_NAME = 'AuthAttempt';
