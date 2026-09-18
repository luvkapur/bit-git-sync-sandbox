import { Schema } from 'mongoose';
import type { PlainSession } from '@luvktest/test.session';

/**
 * The sessions collection.
 *
 * What is *not* here is the point: no token, only fingerprints. A dump of this
 * collection lets an attacker see that sessions exist and when they end, and
 * nothing else — the HMAC key lives in the environment, not in the database.
 *
 * Both hashes are unique indexes, so the two hot lookups (every authenticated
 * request, every refresh) are single-key hits rather than scans.
 */
export const sessionSchema = new Schema<PlainSession>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  familyId: { type: String, required: true, index: true },
  accessTokenHash: { type: String, required: true, unique: true },
  refreshTokenHash: { type: String, required: true, unique: true },
  generation: { type: Number, required: true },
  issuedAt: { type: String, required: true },
  accessExpiresAt: { type: String, required: true },
  refreshExpiresAt: { type: String, required: true },
  absoluteExpiresAt: { type: String, required: true, index: true },
  rotatedAt: { type: String, required: false },
  revokedAt: { type: String, required: false },
  revokedReason: { type: String, required: false },
});

/** the model name, so a caller can reuse an already-registered model. */
export const SESSION_MODEL_NAME = 'Session';
