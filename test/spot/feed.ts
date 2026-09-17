import { RarityIndex } from './rarity.js';

/**
 * One aircraft as the live feed reports it.
 *
 * Structurally a subset of `PlainFlight` plus the aircraft type, which arrives
 * from the separate enrichment lookup. It is declared here rather than imported
 * so this component stays a leaf: spotting rules should not be able to break
 * because a field moved in the flight entity, and a `PlainFlight & { type }`
 * satisfies this shape without any adapter.
 */
export type FeedAircraft = {
  /** 24-bit ICAO transponder address, the only stable identity an aircraft has */
  icao: string;
  callsign?: string;
  /** ICAO type designator — A320, B78X, A124. Absent until enrichment resolves it. */
  type?: string;
  lat: number;
  lon: number;
  /** metres, matching the flight entity */
  altitude: number;
  onGround?: boolean;
  /** unix seconds of the last position report */
  seen?: number;
};

/** On the ground, or reporting no altitude at all, is not something you can spot in the sky. */
export function isAirborne(a: FeedAircraft): boolean {
  return !a.onGround && a.altitude > 0;
}

/**
 * The feed at one moment, indexed.
 *
 * Every spot attempt needs the same two lookups — is this aircraft here, and how
 * unusual is its type — and both are O(n) to build. Building them once per poll
 * instead of once per attempt is the whole reason this class exists.
 */
export class FeedSnapshot {
  private readonly byIcao: Map<string, FeedAircraft>;
  private cachedRarity?: RarityIndex;

  constructor(readonly aircraft: readonly FeedAircraft[]) {
    this.byIcao = new Map(aircraft.map((a) => [a.icao.toLowerCase(), a]));
  }

  static of(aircraft: readonly FeedAircraft[] | FeedSnapshot): FeedSnapshot {
    return aircraft instanceof FeedSnapshot ? aircraft : new FeedSnapshot(aircraft);
  }

  get size() {
    return this.aircraft.length;
  }

  find(icao: string): FeedAircraft | undefined {
    return this.byIcao.get(icao.toLowerCase());
  }

  /** Rarity measured against this snapshot alone. A longer-running index can be passed to the spot log instead. */
  get rarity(): RarityIndex {
    if (!this.cachedRarity) this.cachedRarity = RarityIndex.fromFeed(this.aircraft);
    return this.cachedRarity;
  }

  airborne(): FeedAircraft[] {
    return this.aircraft.filter(isAirborne);
  }
}
