import type { PlainConfirmation } from '@luvktest/test.email-confirmation';

/** what a `lean()` query hands back. */
export type ConfirmationDocument = Record<string, unknown>;

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Turn a Mongo document into a `PlainConfirmation`.
 *
 * Field by field rather than a cast: a row that predates a field, or that
 * somebody edited by hand, would otherwise feed `undefined` into date
 * arithmetic and produce an `Invalid Date`, which compares false against
 * everything — including "is this expired?".
 *
 * A row missing anything essential reads as no row at all.
 */
export function toPlainConfirmation(
  doc: ConfirmationDocument | null | undefined
): PlainConfirmation | undefined {
  if (!doc) return undefined;

  const id = str(doc.id);
  const userId = str(doc.userId);
  const email = str(doc.email);
  const tokenHash = str(doc.tokenHash);
  const issuedAt = str(doc.issuedAt);
  const expiresAt = str(doc.expiresAt);
  if (!id || !userId || !email || !tokenHash || !issuedAt || !expiresAt) return undefined;

  const confirmation: PlainConfirmation = { id, userId, email, tokenHash, issuedAt, expiresAt };
  const usedAt = str(doc.usedAt);
  if (usedAt) confirmation.usedAt = usedAt;
  return confirmation;
}
