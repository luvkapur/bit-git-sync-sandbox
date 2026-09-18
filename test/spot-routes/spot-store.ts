import type { PlainSpot } from '@luvktest/test.spot';

/**
 * The spot ledger as these routes need it.
 *
 * Five operations, each of which a database can answer off an index. Every
 * rule about *whether* a spot counts lives in `SpotLog`; this port only stores
 * and retrieves, which is what keeps those rules testable without a database
 * and this component testable without Mongo.
 */
export type SpotStore = {
  /**
   * Write a spot, once.
   *
   * @param timeBucket the value of {@link timeBucketOf} for this spot. An
   *        implementation is required to hold `(spotterId, icao, timeBucket)`
   *        unique, so that of two concurrent attempts exactly one lands.
   * @returns false when that key was already taken — the caller lost the race
   *          and owes the client a 409, not a 500.
   */
  insert(spot: PlainSpot, timeBucket: number): Promise<boolean>;

  /** The most recent spot of this airframe by this spotter, for the cooldown check. */
  lastSpotOf(spotterId: string, icao: string): Promise<PlainSpot | undefined>;

  /** The newest `limit` spots by anyone. */
  recent(limit: number): Promise<PlainSpot[]>;

  /** The oldest `limit` spots taken after `cursor` — the catch-up page. */
  since(cursor: Date, limit: number): Promise<PlainSpot[]>;

  /** The newest `limit` spots by one spotter. */
  bySpotter(spotterId: string, limit: number): Promise<PlainSpot[]>;
};

/**
 * Which cooldown window a moment falls in.
 *
 * This is the third column of the store's unique key, and it exists because the
 * cooldown check in `SpotLog` is a read followed by a write. Two requests that
 * arrive together both read "no previous spot", both pass the rule, and both
 * write — and the ledger ends up with two spots of one aircraft inside a window
 * that is supposed to allow one. A unique index cannot express "no other row
 * within six hours", but it can express "no other row in the same six-hour
 * bucket", and two simultaneous requests are in the same bucket in every case
 * that matters.
 *
 * The bucket is deliberately *not* the rule. It is coarse in both directions —
 * two spots five hours apart across a boundary sit in different buckets, and
 * two spots a minute apart share one — and `SpotLog` is what decides. This is
 * the backstop underneath it, for the window where the rule cannot see.
 */
export function timeBucketOf(spottedAt: string | Date, cooldownMs: number): number {
  const at = spottedAt instanceof Date ? spottedAt.getTime() : Date.parse(spottedAt);
  if (!Number.isFinite(at) || !Number.isFinite(cooldownMs) || cooldownMs <= 0) return 0;
  return Math.floor(at / cooldownMs);
}
