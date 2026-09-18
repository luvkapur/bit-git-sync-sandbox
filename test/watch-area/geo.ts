/** IUGG mean Earth radius. The globe is a sphere here; ellipsoid error is ~0.3%, well under the precision a hand-drawn watch area has. */
export const EARTH_RADIUS_KM = 6371.0088;

/** Half the great-circle circumference: the largest useful radius, a cap that swallows the whole globe. */
export const MAX_RADIUS_KM = Math.PI * EARTH_RADIUS_KM;

export type LatLon = { lat: number; lon: number };

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * Fold a longitude into [-180, 180).
 *
 * Users drag across the antimeridian and the globe hands us 181 or -190; those
 * are real positions, not errors. 180 folds to -180 so the two spellings of the
 * same meridian compare equal.
 */
export function normaliseLon(lon: number): number {
  if (!Number.isFinite(lon)) throw new RangeError(`longitude must be finite, got ${lon}`);
  const wrapped = ((lon + 180) % 360 + 360) % 360 - 180;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

/** Latitude has no wraparound — past the pole is a different point, not the same one — so it is rejected, not folded. */
export function assertLat(lat: number): number {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new RangeError(`latitude must be within [-90, 90], got ${lat}`);
  return lat;
}

/**
 * Great-circle distance in kilometres.
 *
 * Haversine rather than any flat-earth approximation, because the two cases
 * that break boxes are free here: the longitude term is sin²(Δλ/2), which is
 * periodic, so 179.9°E to 179.9°W is 22 km and not 40,000; and the cosφ factors
 * collapse near the poles, where a degree of longitude is worth almost nothing.
 */
export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = toRad(assertLat(b.lat) - assertLat(a.lat));
  const dLon = toRad(normaliseLon(b.lon) - normaliseLon(a.lon));
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  // clamp: rounding can push h a hair past 1 for antipodal points, and asin would return NaN
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, h)));
}

/**
 * The smallest lat/lon window that contains a cap.
 *
 * Only for coarse prefiltering — a spatial index or a SQL `WHERE` that narrows
 * candidates before `contains` decides. It is deliberately loose: a box around
 * a cap always over-selects at the corners.
 */
export type CapBounds = {
  north: number;
  south: number;
  /** west > east when the window crosses the antimeridian; the range is then two spans, [west, 180) and [-180, east] */
  west: number;
  east: number;
  crossesAntimeridian: boolean;
  /** when the cap reaches a pole every meridian is inside it and there is no usable longitude window */
  coversPole: boolean;
};

export function capBounds(centre: LatLon, radiusKm: number): CapBounds {
  const angular = Math.min(radiusKm, MAX_RADIUS_KM) / EARTH_RADIUS_KM;
  const lat = toRad(assertLat(centre.lat));
  const north = lat + angular;
  const south = lat - angular;

  // A cap that touches a pole contains every longitude at that end, so no
  // longitude window can exclude anything. This is the case box-shaped areas
  // get wrong: they keep a narrow lon range and silently drop half the traffic.
  const coversPole = north >= Math.PI / 2 || south <= -Math.PI / 2;
  if (coversPole) {
    return {
      north: Math.min(90, toDeg(north)),
      south: Math.max(-90, toDeg(south)),
      west: -180,
      east: 180,
      crossesAntimeridian: false,
      coversPole: true,
    };
  }

  const dLon = Math.asin(Math.min(1, Math.sin(angular) / Math.cos(lat)));
  const west = normaliseLon(centre.lon - toDeg(dLon));
  const east = normaliseLon(centre.lon + toDeg(dLon));
  return {
    north: toDeg(north),
    south: toDeg(south),
    west,
    east,
    crossesAntimeridian: west > east,
    coversPole: false,
  };
}

/** Whether a longitude falls in a bounds window, wraparound included. Callers that build their own SQL need the same two-span logic. */
export function lonInBounds(lon: number, bounds: CapBounds): boolean {
  const l = normaliseLon(lon);
  if (bounds.coversPole) return true;
  return bounds.crossesAntimeridian ? l >= bounds.west || l <= bounds.east : l >= bounds.west && l <= bounds.east;
}
