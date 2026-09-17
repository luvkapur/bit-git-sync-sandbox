import type { PlainSpot } from '@luvktest/test.spot';

/**
 * A spot as the feed shows it: the ledger row, plus who took it.
 *
 * `PlainSpot` carries `spotterId` and nothing else about the person, which is
 * right for a ledger and useless for a feed — a column of opaque ids is not
 * something anyone wants an account for. The name is joined on the way out.
 * Nothing else is: id and name only, never the address.
 */
export type WireSpot = PlainSpot & { spotter: { id: string; name: string } };

/**
 * Display names for a set of spotter ids.
 *
 * A directory, not the user store: the only thing these routes may learn about
 * a person is what they are called. An id with no answer is not an error — an
 * account can be deleted while its spots remain — so it is simply absent from
 * the result and reads as {@link UNKNOWN_SPOTTER}.
 */
export type SpotterDirectory = {
  namesOf(ids: readonly string[]): Promise<Record<string, string>>;
};

/** what a spot whose spotter no longer exists is attributed to. */
export const UNKNOWN_SPOTTER = 'unknown spotter';

/**
 * Join names onto a page of spots, in one lookup rather than one per row.
 *
 * The page is already bounded by `limit`, so this is a single indexed `$in`
 * against at most that many ids — the alternative is the N+1 that turns a
 * fifty-row feed into fifty-one round trips.
 */
export async function toWireSpots(
  spots: readonly PlainSpot[],
  directory: SpotterDirectory
): Promise<WireSpot[]> {
  if (!spots.length) return [];
  const names = await directory.namesOf([...new Set(spots.map((s) => s.spotterId))]);
  return spots.map((s) => ({ ...s, spotter: { id: s.spotterId, name: names[s.spotterId] || UNKNOWN_SPOTTER } }));
}
