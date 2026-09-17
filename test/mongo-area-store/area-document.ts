import type { PlainWatchArea, Visibility } from '@luvktest/test.watch-area';

/** what a `lean()` query hands back: the fields we wrote, plus whatever Mongo adds. */
export type AreaDocument = Record<string, unknown>;

const VISIBILITIES: Visibility[] = ['private', 'shared'];

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : NaN;
}

/**
 * Turn a Mongo document into a `PlainWatchArea`.
 *
 * Field by field, and strict about the one field that decides who may read the
 * area: an unrecognised `visibility` reads as `private`, never as shared. A
 * row edited by hand, or written by a future version that added a third
 * value, must fail closed — the alternative is a typo in a database publishing
 * somebody's home.
 *
 * Returns undefined when the document is missing what makes an area an area;
 * `WatchArea`'s constructor then gets the final say on what it means.
 */
export function toPlainArea(doc: AreaDocument | null | undefined): PlainWatchArea | undefined {
  if (!doc) return undefined;

  const id = str(doc.id);
  const ownerId = str(doc.ownerId);
  const name = str(doc.name);
  const createdAt = str(doc.createdAt);
  const lat = num(doc.lat);
  const lon = num(doc.lon);
  const radiusKm = num(doc.radiusKm);

  if (!id || !ownerId || !name || !createdAt) return undefined;
  if (Number.isNaN(lat) || Number.isNaN(lon) || Number.isNaN(radiusKm)) return undefined;

  return {
    id,
    ownerId,
    name,
    lat,
    lon,
    radiusKm,
    visibility: VISIBILITIES.find((v) => v === doc.visibility) ?? 'private',
    createdAt,
  };
}
