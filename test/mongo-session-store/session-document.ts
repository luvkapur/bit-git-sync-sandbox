import type { PlainSession, SessionRevocationReason } from '@luvktest/test.session';

/**
 * What a `lean()` query hands back: the fields we wrote, plus whatever Mongo
 * adds, all of it `unknown` until we have looked.
 */
export type SessionDocument = Record<string, unknown>;

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function optionalStr(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

const REASONS: SessionRevocationReason[] = ['logout', 'logout-all', 'token-reuse'];

function reason(value: unknown): SessionRevocationReason | undefined {
  const found = REASONS.find((candidate) => candidate === value);
  return found;
}

/**
 * Turn a Mongo document into a `PlainSession`.
 *
 * Explicit field by field rather than a cast. A document read out of a
 * database is input like any other — it may predate a field, or have been
 * edited by hand — and a cast would let `undefined` reach date arithmetic and
 * quietly produce an `Invalid Date`, which compares false against everything
 * and would wave a dead session through.
 *
 * Returns undefined when the document is missing the fields that make a
 * session a session, so a corrupt row reads as "no such session".
 */
export function toPlainSession(doc: SessionDocument | null | undefined): PlainSession | undefined {
  if (!doc) return undefined;

  const id = str(doc.id);
  const userId = str(doc.userId);
  const familyId = str(doc.familyId);
  const accessTokenHash = str(doc.accessTokenHash);
  const refreshTokenHash = str(doc.refreshTokenHash);
  const issuedAt = str(doc.issuedAt);
  const accessExpiresAt = str(doc.accessExpiresAt);
  const refreshExpiresAt = str(doc.refreshExpiresAt);
  const absoluteExpiresAt = str(doc.absoluteExpiresAt);

  if (
    !id ||
    !userId ||
    !familyId ||
    !accessTokenHash ||
    !refreshTokenHash ||
    !issuedAt ||
    !accessExpiresAt ||
    !refreshExpiresAt ||
    !absoluteExpiresAt
  ) {
    return undefined;
  }

  const session: PlainSession = {
    id,
    userId,
    familyId,
    accessTokenHash,
    refreshTokenHash,
    generation: typeof doc.generation === 'number' ? doc.generation : 0,
    issuedAt,
    accessExpiresAt,
    refreshExpiresAt,
    absoluteExpiresAt,
  };

  const rotatedAt = optionalStr(doc.rotatedAt);
  const revokedAt = optionalStr(doc.revokedAt);
  const revokedReason = reason(doc.revokedReason);
  if (rotatedAt) session.rotatedAt = rotatedAt;
  if (revokedAt) session.revokedAt = revokedAt;
  if (revokedReason) session.revokedReason = revokedReason;

  return session;
}
