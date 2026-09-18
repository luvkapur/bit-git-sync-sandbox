import type { PlainSpot, RarityBand, RarityScore, Confidence } from '@luvktest/test.spot';

/** what a `lean()` query hands back: the fields we wrote, plus whatever Mongo adds. */
export type SpotDocument = Record<string, unknown>;

const BANDS: RarityBand[] = ['unknown', 'common', 'uncommon', 'rare', 'exceptional'];
const CONFIDENCES: Confidence[] = ['none', 'low', 'medium', 'high'];

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : NaN;
}

/**
 * The frozen score, read back defensively.
 *
 * A stored score is display data — it cannot deny anyone anything — so a field
 * that has gone missing reads as the honest "we do not know" rather than
 * failing the row: an `unknown` band with no sample behind it. What it must not
 * do is hand a `NaN` to the UI, which renders as a blank where a number should
 * be and looks like a bug in the browser.
 */
function rarity(value: unknown): RarityScore {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  const band = BANDS.find((b) => b === raw.band) ?? 'unknown';
  const confidence = CONFIDENCES.find((c) => c === raw.confidence) ?? 'none';
  const number = (v: unknown) => (Number.isFinite(num(v)) ? num(v) : 0);
  return {
    score: number(raw.score),
    band,
    confidence,
    observed: number(raw.observed),
    frequency: number(raw.frequency),
    sampleSize: number(raw.sampleSize),
  };
}

/**
 * Turn a Mongo document into a `PlainSpot`.
 *
 * Field by field rather than a cast, for the reason every store here does it:
 * a row out of a database is input like any other. It may predate a field or
 * have been edited by hand, and a cast would let `undefined` reach `new Date()`
 * and produce an `Invalid Date` that sorts randomly through the feed.
 *
 * `timeBucket` is deliberately not carried out: it is the store's own key, not
 * part of what a spot is, and nothing above this layer should learn to read it.
 *
 * Returns undefined when the document is missing what makes a spot a spot.
 */
export function toPlainSpot(doc: SpotDocument | null | undefined): PlainSpot | undefined {
  if (!doc) return undefined;

  const id = str(doc.id);
  const spotterId = str(doc.spotterId);
  const icao = str(doc.icao);
  const spottedAt = str(doc.spottedAt);
  const lat = num(doc.lat);
  const lon = num(doc.lon);
  const altitude = num(doc.altitude);

  if (!id || !spotterId || !icao || !spottedAt || Number.isNaN(Date.parse(spottedAt))) return undefined;
  if (Number.isNaN(lat) || Number.isNaN(lon) || Number.isNaN(altitude)) return undefined;

  const spot: PlainSpot = {
    id,
    spotterId,
    icao,
    callsign: str(doc.callsign) || icao.toUpperCase(),
    lat,
    lon,
    altitude,
    spottedAt,
    rarity: rarity(doc.rarity),
  };

  const aircraftType = str(doc.aircraftType);
  const note = str(doc.note);
  if (aircraftType) spot.aircraftType = aircraftType;
  if (note) spot.note = note;

  return spot;
}

/**
 * Whether an error is Mongo refusing a second row on a unique key.
 *
 * 11000 is the only outcome of `insert` that is not a failure: it means
 * somebody else got there first, which is an answer the route knows how to
 * give. Every other error still throws, because a store that swallowed them
 * would report a spot as a duplicate when the database was simply down.
 */
export function isDuplicateKey(e: unknown): boolean {
  const code = (e as { code?: unknown })?.code;
  return code === 11000 || code === 11001;
}
