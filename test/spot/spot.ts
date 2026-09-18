import type { FeedAircraft } from './feed.js';
import type { RarityScore } from './rarity.js';

export type PlainSpot = {
  id: string;
  spotterId: string;
  /** the aircraft, not the flight: transponder address is the only identity that survives a callsign change */
  icao: string;
  callsign: string;
  aircraftType?: string;
  lat: number;
  lon: number;
  /** metres, matching the flight entity */
  altitude: number;
  /** ISO 8601 */
  spottedAt: string;
  /**
   * Scored when the spot was taken and frozen there. Traffic shifts, and a log
   * entry that silently re-rated itself months later would rewrite the user's
   * history.
   */
  rarity: RarityScore;
  note?: string;
};

/** One aircraft, caught by one person, at one moment. */
export class Spot {
  constructor(readonly d: PlainSpot) {}

  get id() { return this.d.id; }
  get spotterId() { return this.d.spotterId; }
  get icao() { return this.d.icao; }
  get callsign() { return this.d.callsign; }
  get aircraftType() { return this.d.aircraftType; }
  get rarity() { return this.d.rarity; }
  get note() { return this.d.note; }
  get at() { return new Date(this.d.spottedAt); }
  get position() { return { lat: this.d.lat, lon: this.d.lon }; }
  get altitudeFt() { return Math.round(this.d.altitude * 3.28084); }

  /** Key for the one-spot-per-aircraft-per-window rule. */
  get pairKey() { return Spot.pairKey(this.d.spotterId, this.d.icao); }

  toObject(): PlainSpot {
    return { ...this.d };
  }

  static from(plain: PlainSpot): Spot {
    return new Spot(plain);
  }

  /**
   * Built from the feed row that justified it, so the log records where the
   * aircraft actually was rather than where the client claimed it was.
   */
  static of(input: { spotterId: string; aircraft: FeedAircraft; rarity: RarityScore; at: Date; note?: string }): Spot {
    const { spotterId, aircraft, rarity, at, note } = input;
    const icao = aircraft.icao.toLowerCase();
    return new Spot({
      id: Spot.idFor(spotterId, icao, at),
      spotterId,
      icao,
      callsign: aircraft.callsign?.trim() || icao.toUpperCase(),
      aircraftType: aircraft.type?.trim().toUpperCase() || undefined,
      lat: aircraft.lat,
      lon: aircraft.lon,
      altitude: aircraft.altitude,
      spottedAt: at.toISOString(),
      rarity,
      ...(note?.trim() ? { note: note.trim() } : {}),
    });
  }

  /**
   * Ids are derived, not random: this component stays pure, and a retried write
   * after a dropped connection lands on the same row instead of a second spot.
   */
  static idFor(spotterId: string, icao: string, at: Date): string {
    return `${spotterId}:${icao.toLowerCase()}:${at.getTime()}`;
  }

  /** JSON, not a separator character, because user ids are opaque and any separator we pick could appear inside one. */
  static pairKey(spotterId: string, icao: string): string {
    return JSON.stringify([spotterId, icao.toLowerCase()]);
  }
}
