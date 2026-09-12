import { Flight } from './flight.js';

const base = { icao: 'a48850', callsign: 'UPS257  ', country: 'United States', lon: 2.94, lat: 48.73, altitude: 10980, velocity: 222, heading: 90, onGround: false, verticalRate: 0, squawk: '3375', seen: 1 };

describe('flight', () => {
  it('trims the callsign and falls back to the icao address', () => {
    expect(Flight.from(base).callsign).toEqual('UPS257');
    expect(Flight.from({ ...base, callsign: '' }).callsign).toEqual('A48850');
  });

  it('converts to feet and knots', () => {
    const f = Flight.from(base);
    expect(f.altitudeFt).toEqual(36024);
    expect(f.knots).toEqual(432);
  });

  it('projects eastward when heading is 90 degrees', () => {
    const p = Flight.from(base).project(60);
    expect(p.lon).toBeGreaterThan(base.lon);
    expect(Math.abs(p.lat - base.lat)).toBeLessThan(0.001);
  });

  it('does not move aircraft on the ground', () => {
    const p = Flight.from({ ...base, onGround: true }).project(600);
    expect(p).toEqual({ lon: base.lon, lat: base.lat });
  });

  it('parses an OpenSky state vector', () => {
    const f = Flight.fromStateVector(['a48850', 'UPS257  ', 'United States', 1, 2, 2.94, 48.73, 10980, false, 222, 50, 5.2, null, 11399, '3375']);
    expect(f?.callsign).toEqual('UPS257');
    expect(f?.isCruising).toEqual(true);
    expect(f?.phase).toEqual('climbing');
  });

  it('reads climb rate in feet per minute', () => {
    expect(Flight.from({ ...base, verticalRate: -7.6 }).climbFpm).toEqual(-1496);
    expect(Flight.from({ ...base, verticalRate: -7.6 }).phase).toEqual('descending');
  });

  it('flags emergency squawks and nothing else', () => {
    expect(Flight.from({ ...base, squawk: '7700' }).emergency).toEqual('Emergency');
    expect(Flight.from({ ...base, squawk: '7500' }).emergency).toEqual('Hijack');
    expect(Flight.from({ ...base, squawk: '3375' }).emergency).toBeUndefined();
  });

  it('survives a round trip through the compact wire format', () => {
    const f = Flight.from(base);
    const back = Flight.fromRow(f.toRow());
    expect(back.callsign).toEqual('UPS257');
    expect(back.d.heading).toEqual(90);
    expect(Math.abs(back.d.lat - base.lat)).toBeLessThan(0.001);
  });
});
