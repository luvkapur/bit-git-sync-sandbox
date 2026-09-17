import { WatchArea, areasVisibleTo } from './watch-area.js';
import { distanceKm, normaliseLon, capBounds, lonInBounds, MAX_RADIUS_KM } from './geo.js';

const area = (over: Partial<Parameters<typeof WatchArea.create>[0]> = {}) =>
  WatchArea.create({
    id: 'wa1',
    ownerId: 'u1',
    name: 'Heathrow approach',
    centre: { lat: 51.47, lon: -0.4543 },
    radiusKm: 30,
    createdAt: new Date('2026-09-17T09:00:00.000Z'),
    ...over,
  });

describe('geo', () => {
  it('folds longitude into [-180, 180) and treats 180 and -180 as one meridian', () => {
    expect(normaliseLon(190)).toBeCloseTo(-170);
    expect(normaliseLon(-190)).toBeCloseTo(170);
    expect(normaliseLon(180)).toEqual(-180);
    expect(normaliseLon(-180)).toEqual(-180);
    expect(normaliseLon(-360)).toEqual(0);
  });

  it('measures a known great circle', () => {
    // Heathrow to JFK, ~5555 km on a sphere
    const d = distanceKm({ lat: 51.47, lon: -0.4543 }, { lat: 40.6413, lon: -73.7781 });
    expect(Math.round(d)).toBeGreaterThan(5530);
    expect(Math.round(d)).toBeLessThan(5580);
  });

  it('measures across the antimeridian as the short way round', () => {
    // 0.2 degrees apart at the equator, not 359.8
    expect(distanceKm({ lat: 0, lon: 179.9 }, { lat: 0, lon: -179.9 })).toBeCloseTo(22.24, 1);
  });

  it('is symmetric and zero at a point', () => {
    const a = { lat: 12, lon: 34 };
    const b = { lat: -56, lon: 178 };
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 9);
    expect(distanceKm(a, a)).toEqual(0);
  });

  it('does not blow up on antipodal points', () => {
    expect(distanceKm({ lat: 0, lon: 0 }, { lat: 0, lon: 180 })).toBeCloseTo(MAX_RADIUS_KM, 3);
    expect(distanceKm({ lat: 90, lon: 0 }, { lat: -90, lon: 0 })).toBeCloseTo(MAX_RADIUS_KM, 3);
  });
});

describe('watch area', () => {
  it('contains what is inside the radius and excludes what is not', () => {
    const a = area();
    expect(a.contains(51.5, -0.45)).toEqual(true);
    expect(a.contains(48.86, 2.35)).toEqual(false);
    expect(Math.round(a.distanceFromCentreKm(48.86, 2.35))).toBeGreaterThan(300);
  });

  it('is inclusive at the boundary', () => {
    const oneDegree = distanceKm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 });
    const a = area({ centre: { lat: 0, lon: 0 }, radiusKm: oneDegree });
    expect(a.contains(1, 0)).toEqual(true);
    expect(a.contains(1.0001, 0)).toEqual(false);
  });

  it('filters aircraft and keeps their own shape', () => {
    const a = area({ centre: { lat: 0, lon: 0 }, radiusKm: 200 });
    const flights = [
      { icao: 'aaa111', lat: 0.5, lon: 0.5, altitude: 10000 },
      { icao: 'bbb222', lat: 40, lon: 40, altitude: 9000 },
    ];
    const inside = a.filter(flights);
    expect(inside.map((f) => f.icao)).toEqual(['aaa111']);
    expect(inside[0].altitude).toEqual(10000);
  });
});

describe('antimeridian', () => {
  const a = area({ name: 'Fiji', centre: { lat: 0, lon: 179.9 }, radiusKm: 100 });

  it('contains points on the other side of the date line', () => {
    expect(a.contains(0, -179.9)).toEqual(true);
    expect(a.contains(0, 179.5)).toEqual(true);
    expect(a.contains(0, -179.0)).toEqual(false); // 122 km the other way, outside
  });

  it('accepts an unwrapped longitude the globe hands us mid-drag', () => {
    // dragging east past the date line produces 180.1, which is the same place as -179.9
    expect(a.contains(0, 180.1)).toEqual(true);
    expect(area({ centre: { lat: 0, lon: 540 } }).centre.lon).toEqual(-180);
  });

  it('reports a wrapping window in bounds() instead of an empty one', () => {
    const b = a.bounds();
    expect(b.crossesAntimeridian).toEqual(true);
    expect(b.west).toBeGreaterThan(0);
    expect(b.east).toBeLessThan(0);
    // the naive reading of a box — west <= lon <= east — drops every point in the area
    expect(b.west <= -179.9 && -179.9 <= b.east).toEqual(false);
    expect(lonInBounds(-179.9, b)).toEqual(true);
    expect(lonInBounds(0, b)).toEqual(false);
  });

  it('keeps bounds a superset of the area', () => {
    const b = a.bounds();
    for (const lon of [179.5, 179.9, -179.9, -179.6]) {
      if (a.contains(0, lon)) expect(lonInBounds(lon, b)).toEqual(true);
    }
  });
});

describe('poles', () => {
  it('contains points on every meridian when the cap reaches over the pole', () => {
    const a = area({ name: 'North pole', centre: { lat: 89.5, lon: 0 }, radiusKm: 200 });
    // 111 km away going over the pole, though it is 180 degrees of longitude apart
    expect(a.contains(89.5, 180)).toEqual(true);
    expect(a.contains(89.5, -90)).toEqual(true);
    expect(a.contains(90, 0)).toEqual(true);
    expect(a.contains(85, 0)).toEqual(false);
  });

  it('gives up on a longitude window once the cap covers a pole', () => {
    const b = capBounds({ lat: 89.5, lon: 0 }, 200);
    expect(b.coversPole).toEqual(true);
    expect(b.north).toEqual(90);
    expect([b.west, b.east]).toEqual([-180, 180]);
    expect(lonInBounds(173, b)).toEqual(true);
  });

  it('clamps the latitude window at the pole rather than running past it', () => {
    const b = capBounds({ lat: -89, lon: 20 }, 500);
    expect(b.south).toEqual(-90);
    expect(b.coversPole).toEqual(true);
  });

  it('still uses a narrow window for a small high-latitude area', () => {
    const b = capBounds({ lat: 80, lon: 0 }, 50);
    expect(b.coversPole).toEqual(false);
    // a degree of longitude is ~19 km up here, so 50 km is a wide window in degrees
    expect(b.east - b.west).toBeGreaterThan(4);
  });

  it('treats a whole-globe radius as the whole globe', () => {
    const a = area({ centre: { lat: 0, lon: 0 }, radiusKm: 99999 });
    expect(a.radiusKm).toBeCloseTo(MAX_RADIUS_KM, 6);
    expect(a.contains(-90, 45)).toEqual(true);
    expect(a.contains(0, 180)).toEqual(true);
  });
});

describe('ownership and visibility', () => {
  it('keeps a private area to its owner', () => {
    const a = area();
    expect(a.visibility).toEqual('private');
    expect(a.visibleTo('u1')).toEqual(true);
    expect(a.visibleTo('u2')).toEqual(false);
  });

  it('shows a shared area to anyone', () => {
    const a = area().withVisibility('shared');
    expect(a.visibleTo('u2')).toEqual(true);
    expect(areasVisibleTo([area(), a], 'u2').map((x) => x.visibility)).toEqual(['shared']);
  });

  it('returns a new area on edit and leaves the original alone', () => {
    const a = area();
    const renamed = a.rename('LHR bowl').resize(45);
    expect(renamed.name).toEqual('LHR bowl');
    expect(renamed.radiusKm).toEqual(45);
    expect(a.name).toEqual('Heathrow approach');
    expect(a.radiusKm).toEqual(30);
  });

  it('survives a round trip through its plain shape', () => {
    const a = area({ visibility: 'shared' });
    const back = WatchArea.from(a.toObject());
    expect(back.toObject()).toEqual(a.toObject());
    expect(back.contains(51.5, -0.45)).toEqual(true);
  });
});

describe('validation', () => {
  it('rejects a latitude past the pole instead of wrapping it', () => {
    expect(() => area({ centre: { lat: 91, lon: 0 } })).toThrow(/latitude/);
  });

  it('rejects a radius that is not a positive number', () => {
    expect(() => area({ radiusKm: 0 })).toThrow(/radius/);
    expect(() => area({ radiusKm: Number.NaN })).toThrow(/radius/);
  });

  it('rejects an area with no name and trims the one it gets', () => {
    expect(() => area({ name: '   ' })).toThrow(/name/);
    expect(area({ name: '  Gatwick  ' }).name).toEqual('Gatwick');
  });

  it('rejects an owner-less area', () => {
    expect(() => area({ ownerId: '' })).toThrow(/owner/);
  });
});
