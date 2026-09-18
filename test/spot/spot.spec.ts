import { Spot } from './spot.js';
import type { RarityScore } from './rarity.js';
import { recentSpots, spotsBySpotter, spotsFromFollowing, spotsSince } from './queries.js';

const unscored: RarityScore = { score: 0, band: 'unknown', confidence: 'none', observed: 0, frequency: 0, sampleSize: 0 };

const at = (iso: string) => new Date(iso);

const spot = (spotterId: string, icao: string, iso: string, over: Partial<Parameters<typeof Spot.of>[0]> = {}) =>
  Spot.of({
    spotterId,
    aircraft: { icao, callsign: 'BAW117  ', type: 'b77w', lat: 51.5, lon: -0.45, altitude: 11277.6 },
    rarity: unscored,
    at: at(iso),
    ...over,
  });

describe('spot', () => {
  it('takes the aircraft details from the feed row', () => {
    const s = spot('u1', 'A1B2C3', '2026-09-17T10:00:00.000Z');
    expect(s.icao).toEqual('a1b2c3');
    expect(s.callsign).toEqual('BAW117');
    expect(s.aircraftType).toEqual('B77W');
    expect(s.position).toEqual({ lat: 51.5, lon: -0.45 });
    expect(s.altitudeFt).toEqual(37000);
  });

  it('falls back to the transponder address when there is no callsign', () => {
    const s = spot('u1', 'a1b2c3', '2026-09-17T10:00:00.000Z', {
      aircraft: { icao: 'a1b2c3', callsign: '   ', lat: 0, lon: 0, altitude: 1000 },
    });
    expect(s.callsign).toEqual('A1B2C3');
    expect(s.aircraftType).toBeUndefined();
  });

  it('derives the same id for the same spot, so a retry is not a second spot', () => {
    const first = spot('u1', 'a1b2c3', '2026-09-17T10:00:00.000Z');
    const retry = spot('u1', 'A1B2C3', '2026-09-17T10:00:00.000Z');
    expect(retry.id).toEqual(first.id);
    expect(spot('u2', 'a1b2c3', '2026-09-17T10:00:00.000Z').id).not.toEqual(first.id);
  });

  it('keeps a note only when there is one', () => {
    expect(spot('u1', 'a1', '2026-09-17T10:00:00.000Z', { note: '  first 77W  ' }).note).toEqual('first 77W');
    expect(spot('u1', 'a1', '2026-09-17T10:00:00.000Z', { note: '   ' }).note).toBeUndefined();
  });

  it('pairs a spotter with an airframe regardless of the case it arrived in', () => {
    expect(Spot.pairKey('u1', 'A1B2C3')).toEqual(Spot.pairKey('u1', 'a1b2c3'));
    expect(Spot.pairKey('u1', 'a1')).not.toEqual(Spot.pairKey('u11', 'a1'));
  });

  it('survives a round trip through its plain shape', () => {
    const s = spot('u1', 'a1b2c3', '2026-09-17T10:00:00.000Z');
    const back = Spot.from(s.toObject());
    expect(back.toObject()).toEqual(s.toObject());
    expect(back.at.toISOString()).toEqual('2026-09-17T10:00:00.000Z');
  });
});

describe('queries', () => {
  const spots = [
    spot('anna', 'a01', '2026-09-17T10:00:00.000Z'),
    spot('bo', 'a02', '2026-09-17T11:00:00.000Z'),
    spot('anna', 'a03', '2026-09-17T12:00:00.000Z'),
    spot('cass', 'a04', '2026-09-17T09:00:00.000Z'),
  ];

  it('returns the global feed newest first', () => {
    expect(recentSpots(spots).map((s) => s.icao)).toEqual(['a03', 'a02', 'a01', 'a04']);
  });

  it('honours a page limit', () => {
    expect(recentSpots(spots, 2).map((s) => s.icao)).toEqual(['a03', 'a02']);
    expect(recentSpots(spots, 0)).toEqual([]);
  });

  it('orders spots that share a millisecond stably', () => {
    const tie = [spot('anna', 'b01', '2026-09-17T10:00:00.000Z'), spot('anna', 'b02', '2026-09-17T10:00:00.000Z')];
    expect(recentSpots(tie).map((s) => s.icao)).toEqual(recentSpots([...tie].reverse()).map((s) => s.icao));
  });

  it('reads one spotter log', () => {
    expect(spotsBySpotter(spots, 'anna').map((s) => s.icao)).toEqual(['a03', 'a01']);
    expect(spotsBySpotter(spots, 'nobody')).toEqual([]);
  });

  it('reads the feed of the people you follow', () => {
    expect(spotsFromFollowing(spots, ['bo', 'cass']).map((s) => s.icao)).toEqual(['a02', 'a04']);
    expect(spotsFromFollowing(spots, [])).toEqual([]);
  });

  it('hands back exactly what a reconnecting socket missed, in order', () => {
    const missed = spotsSince(spots, at('2026-09-17T10:00:00.000Z'));
    expect(missed.map((s) => s.icao)).toEqual(['a02', 'a03']);
  });

  it('does not repeat the spot the cursor points at', () => {
    expect(spotsSince(spots, at('2026-09-17T12:00:00.000Z'))).toEqual([]);
  });

  it('leaves the caller array untouched', () => {
    const order = spots.map((s) => s.icao);
    recentSpots(spots);
    expect(spots.map((s) => s.icao)).toEqual(order);
  });
});
