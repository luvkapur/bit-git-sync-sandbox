import { capBounds, distanceKm, normaliseLon, assertLat, MAX_RADIUS_KM } from './geo.js';
import type { CapBounds, LatLon } from './geo.js';

/** `private` is owner-only. `shared` is readable by anyone; there is no per-user share list yet, and inventing one before the product asks would be guessing. */
export type Visibility = 'private' | 'shared';

export type PlainWatchArea = {
  id: string;
  ownerId: string;
  name: string;
  /** centre of the cap */
  lat: number;
  lon: number;
  radiusKm: number;
  visibility: Visibility;
  /** ISO 8601 */
  createdAt: string;
};

export type NewWatchArea = {
  id: string;
  ownerId: string;
  name: string;
  centre: LatLon;
  radiusKm: number;
  visibility?: Visibility;
  createdAt?: Date;
};

const MAX_NAME_LENGTH = 60;

/**
 * A named region of the globe: a centre and a radius — a spherical cap.
 *
 * A cap, not a lat/lon box, for one reason: on a sphere a cap is a single
 * inequality, `distance(centre, point) <= radius`, and that inequality is
 * already correct at the antimeridian and at the poles. A box needs a wraparound
 * branch for `west > east`, and near a pole it describes a shape that is not the
 * one the user drew — a 100 km "square" at 85°N spans 20° of longitude at its
 * south edge and 40° at its north. A circle on an orthographic globe is also
 * what the drag gesture actually produces: press a point, drag a radius.
 *
 * The cost is honest: you cannot express "the rectangle of airspace between
 * these two corners". If that becomes a real request it should be a second
 * shape type, not a reinterpretation of this one.
 */
export class WatchArea {
  readonly d: PlainWatchArea;

  constructor(plain: PlainWatchArea) {
    const name = plain.name.trim();
    if (!plain.id) throw new RangeError('watch area needs an id');
    if (!plain.ownerId) throw new RangeError('watch area needs an owner');
    if (!name) throw new RangeError('watch area needs a name');
    if (name.length > MAX_NAME_LENGTH) throw new RangeError(`name must be at most ${MAX_NAME_LENGTH} characters`);
    if (!Number.isFinite(plain.radiusKm) || plain.radiusKm <= 0) throw new RangeError(`radius must be positive, got ${plain.radiusKm}`);
    if (Number.isNaN(Date.parse(plain.createdAt))) throw new RangeError(`createdAt must be an ISO date, got ${plain.createdAt}`);

    this.d = {
      ...plain,
      name,
      lat: assertLat(plain.lat),
      lon: normaliseLon(plain.lon),
      // a larger radius is not an error, it is just the whole globe; clamping keeps bounds() sane
      radiusKm: Math.min(plain.radiusKm, MAX_RADIUS_KM),
    };
  }

  get id() { return this.d.id; }
  get ownerId() { return this.d.ownerId; }
  get name() { return this.d.name; }
  get radiusKm() { return this.d.radiusKm; }
  get visibility() { return this.d.visibility; }
  get centre(): LatLon { return { lat: this.d.lat, lon: this.d.lon }; }
  get createdAt() { return new Date(this.d.createdAt); }
  get isShared() { return this.d.visibility === 'shared'; }

  /** km from the centre along the surface. Exposed because a UI that says "42 km outside your area" is better than one that just says no. */
  distanceFromCentreKm(lat: number, lon: number): number {
    return distanceKm(this.centre, { lat, lon });
  }

  contains(lat: number, lon: number): boolean {
    return this.distanceFromCentreKm(lat, lon) <= this.d.radiusKm;
  }

  containsPoint(point: LatLon): boolean {
    return this.contains(point.lat, point.lon);
  }

  /** Keeps the caller's own object type, so a list of flights comes back as flights. */
  filter<T extends LatLon>(points: readonly T[]): T[] {
    return points.filter((p) => this.contains(p.lat, p.lon));
  }

  /** Coarse window for an index or a SQL prefilter; `contains` still decides. See CapBounds for the wraparound contract. */
  bounds(): CapBounds {
    return capBounds(this.centre, this.d.radiusKm);
  }

  visibleTo(userId: string): boolean {
    return this.isShared || userId === this.d.ownerId;
  }

  /** Edits return a new area: these get handed to a renderer, and mutating one under it is how stale frames happen. */
  rename(name: string): WatchArea {
    return new WatchArea({ ...this.d, name });
  }

  resize(radiusKm: number): WatchArea {
    return new WatchArea({ ...this.d, radiusKm });
  }

  withVisibility(visibility: Visibility): WatchArea {
    return new WatchArea({ ...this.d, visibility });
  }

  toObject(): PlainWatchArea {
    return { ...this.d };
  }

  static from(plain: PlainWatchArea): WatchArea {
    return new WatchArea(plain);
  }

  static create(input: NewWatchArea): WatchArea {
    return new WatchArea({
      id: input.id,
      ownerId: input.ownerId,
      name: input.name,
      lat: input.centre.lat,
      lon: input.centre.lon,
      radiusKm: input.radiusKm,
      visibility: input.visibility ?? 'private',
      createdAt: (input.createdAt ?? new Date()).toISOString(),
    });
  }
}

/** The areas a given user may see. The rule lives here so every caller applies the same one. */
export function areasVisibleTo(areas: readonly WatchArea[], userId: string): WatchArea[] {
  return areas.filter((a) => a.visibleTo(userId));
}
