import { FeedSnapshot, isAirborne } from './feed.js';
import type { FeedAircraft } from './feed.js';
import { FollowGraph } from './follow.js';
import { RarityIndex } from './rarity.js';
import { Spot } from './spot.js';
import { DEFAULT_LIMIT, recentSpots, spotsBySpotter, spotsFromFollowing, spotsSince } from './queries.js';

export type SpotInput = {
  spotterId: string;
  icao: string;
  note?: string;
};

export type SpotRejectionReason = 'no-spotter' | 'not-in-feed' | 'not-airborne' | 'stale-contact' | 'duplicate';

export type SpotAccepted = { ok: true; spot: Spot };
export type SpotRejected = { ok: false; reason: SpotRejectionReason; message: string; retryAfterMs?: number };
export type SpotResult = SpotAccepted | SpotRejected;

/**
 * Narrowing helpers, because `if (result.ok)` is not enough here.
 *
 * This workspace compiles without `strictNullChecks`, and without it TypeScript
 * will not narrow a union discriminated by a boolean literal — `result.spot` and
 * `result.reason` both come back as errors however you branch. A type predicate
 * narrows regardless, so every caller gets the union it was promised instead of
 * reaching for a cast.
 */
export function spotAccepted(r: SpotResult): r is SpotAccepted {
  return r.ok === true;
}

export function spotRejected(r: SpotResult): r is SpotRejected {
  return r.ok === false;
}

export type SpotLogOptions = {
  /** how long the same spotter must wait before the same airframe counts again */
  cooldownMs?: number;
  /** how old a position report may be and still count as "in the sky right now" */
  maxContactAgeSec?: number;
};

/**
 * Six hours: long enough to cover a single encounter, including a long-haul leg
 * you watch from takeoff to landing, and short enough that seeing the same
 * aircraft again tomorrow is its own spot.
 */
export const DEFAULT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

/** Five minutes. Feeds drop aircraft that stop reporting, but a stale row lingering in a cached snapshot is not evidence the aircraft is up. */
export const DEFAULT_MAX_CONTACT_AGE_SEC = 300;

/**
 * The spot ledger and the rules that guard it.
 *
 * In memory and pure on purpose. A store implements the same three queries
 * against its own index; this class is the definition of what they mean, and
 * the place the rules are tested without standing up a database.
 */
export class SpotLog {
  private readonly spots: Spot[] = [];
  /** last spot per (spotter, airframe), so the cooldown check does not scan the log */
  private readonly lastByPair = new Map<string, Spot>();
  private readonly cooldownMs: number;
  private readonly maxContactAgeSec: number;

  constructor(spots: readonly Spot[] = [], options: SpotLogOptions = {}) {
    this.cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    this.maxContactAgeSec = options.maxContactAgeSec ?? DEFAULT_MAX_CONTACT_AGE_SEC;
    for (const spot of spots) this.add(spot);
  }

  /** Rehydration from a store. It trusts the spot; the rules already ran when it was taken. */
  add(spot: Spot): void {
    this.spots.push(spot);
    const previous = this.lastByPair.get(spot.pairKey);
    if (!previous || spot.at.getTime() > previous.at.getTime()) this.lastByPair.set(spot.pairKey, spot);
  }

  get size() {
    return this.spots.length;
  }

  all(): Spot[] {
    return [...this.spots];
  }

  lastSpotOf(spotterId: string, icao: string): Spot | undefined {
    return this.lastByPair.get(Spot.pairKey(spotterId, icao));
  }

  /**
   * Take a spot, or say precisely why not.
   *
   * The feed is the authority for everything except who is asking: position,
   * type and altitude are read from the feed row, never from the request, so a
   * crafted client cannot log an An-124 over its own house.
   */
  attempt(
    input: SpotInput,
    feed: readonly FeedAircraft[] | FeedSnapshot,
    options: { now?: Date; rarity?: RarityIndex } = {}
  ): SpotResult {
    const now = options.now ?? new Date();
    if (!input.spotterId) return { ok: false, reason: 'no-spotter', message: 'a spot needs a spotter' };

    const snapshot = FeedSnapshot.of(feed);
    const aircraft = snapshot.find(input.icao);
    if (!aircraft) {
      return { ok: false, reason: 'not-in-feed', message: `${input.icao} is not in the sky right now` };
    }

    if (!isAirborne(aircraft)) {
      return { ok: false, reason: 'not-airborne', message: `${input.icao} is on the ground` };
    }

    const contactAgeSec = aircraft.seen === undefined ? 0 : now.getTime() / 1000 - aircraft.seen;
    if (contactAgeSec > this.maxContactAgeSec) {
      return {
        ok: false,
        reason: 'stale-contact',
        message: `the last position report for ${input.icao} is ${Math.round(contactAgeSec)}s old`,
      };
    }

    const previous = this.lastSpotOf(input.spotterId, input.icao);
    if (previous) {
      const elapsed = now.getTime() - previous.at.getTime();
      if (elapsed < this.cooldownMs) {
        return {
          ok: false,
          reason: 'duplicate',
          message: `you already spotted ${previous.callsign} today`,
          retryAfterMs: this.cooldownMs - elapsed,
        };
      }
    }

    const rarity = (options.rarity ?? snapshot.rarity).score(aircraft.type);
    const spot = Spot.of({ spotterId: input.spotterId, aircraft, rarity, at: now, note: input.note });
    this.add(spot);
    return { ok: true, spot };
  }

  recent(limit: number = DEFAULT_LIMIT): Spot[] {
    return recentSpots(this.spots, limit);
  }

  bySpotter(spotterId: string, limit: number = DEFAULT_LIMIT): Spot[] {
    return spotsBySpotter(this.spots, spotterId, limit);
  }

  /** Your own spots are in your feed by default: it is what people expect, and it keeps a new account from staring at nothing. */
  fromFollowing(
    spotterId: string,
    graph: FollowGraph,
    options: { limit?: number; includeOwn?: boolean } = {}
  ): Spot[] {
    const ids = graph.following(spotterId);
    if (options.includeOwn !== false) ids.push(spotterId);
    return spotsFromFollowing(this.spots, ids, options.limit ?? DEFAULT_LIMIT);
  }

  since(cursor: Date, limit: number = DEFAULT_LIMIT): Spot[] {
    return spotsSince(this.spots, cursor, limit);
  }
}
