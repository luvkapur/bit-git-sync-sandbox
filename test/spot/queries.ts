import type { Spot } from './spot.js';

/** What a first page of a live feed holds. Callers that page further pass their own limit. */
export const DEFAULT_LIMIT = 50;

/**
 * Newest first, with the id breaking ties.
 *
 * Two spots can share a millisecond, and a feed that reorders equal rows between
 * polls makes items jump under the reader's thumb.
 */
export function byRecency(a: Spot, b: Spot): number {
  const delta = Date.parse(b.d.spottedAt) - Date.parse(a.d.spottedAt);
  return delta !== 0 ? delta : a.d.id.localeCompare(b.d.id);
}

const page = (spots: readonly Spot[], limit: number) => [...spots].sort(byRecency).slice(0, Math.max(0, limit));

/** Everything anyone spotted — the global "happening now" column. */
export function recentSpots(spots: readonly Spot[], limit: number = DEFAULT_LIMIT): Spot[] {
  return page(spots, limit);
}

/** One spotter's log, which is the public page an account is for. */
export function spotsBySpotter(spots: readonly Spot[], spotterId: string, limit: number = DEFAULT_LIMIT): Spot[] {
  return page(spots.filter((s) => s.d.spotterId === spotterId), limit);
}

/** The following feed. Ids are taken as a set because a real caller has already loaded the follow list. */
export function spotsFromFollowing(spots: readonly Spot[], spotterIds: Iterable<string>, limit: number = DEFAULT_LIMIT): Spot[] {
  const ids = new Set(spotterIds);
  return page(spots.filter((s) => ids.has(s.d.spotterId)), limit);
}

/**
 * Everything newer than a cursor, oldest first.
 *
 * This is the shape a socket needs on reconnect: hand back the timestamp of the
 * last spot you rendered and get what you missed, in the order it happened. The
 * page is taken from the oldest end, so a client behind by more than one page
 * advances its cursor and asks again instead of skipping the middle.
 */
export function spotsSince(spots: readonly Spot[], since: Date, limit: number = DEFAULT_LIMIT): Spot[] {
  const cutoff = since.getTime();
  const missed = [...spots].filter((s) => Date.parse(s.d.spottedAt) > cutoff).sort(byRecency).reverse();
  return missed.slice(0, Math.max(0, limit));
}
