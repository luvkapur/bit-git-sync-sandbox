import { authFailure, type AuthProvider, type CurrentUserResult } from '@luvktest/test.auth-provider';
import type { AppLike, RouteHandler, RouteRequest, RouteResponse } from '@luvktest/test.auth-routes';
import {
  FeedSnapshot,
  RarityIndex,
  Spot,
  type FeedAircraft,
  type PlainSpot,
} from '@luvktest/test.spot';
import { limitFrom, registerSpotRoutes, type SpotFeed } from './spot-routes.js';
import { timeBucketOf, type SpotStore } from './spot-store.js';
import { UNKNOWN_SPOTTER, toWireSpots, type SpotterDirectory } from './wire-spot.js';

const HOUR = 60 * 60 * 1000;
const COOLDOWN = 6 * HOUR;
const NOW = new Date('2026-09-17T12:00:00.000Z');

const pilot = { id: 'u1', email: 'pilot@skyline.test', name: 'Pilot', emailConfirmed: true };
const other = { id: 'u2', email: 'other@skyline.test', name: 'Nadia', emailConfirmed: true };

type Reply = { status: number; body: any; headers: Record<string, string> };

/**
 * The smallest thing that behaves like an Express app: it records the handler
 * chain per route and runs it, honouring `next()` and stopping the moment a
 * handler answers. Enough to prove the middleware really does stop a handler
 * running — which is the property worth proving about an authenticated route.
 */
function fakeApp() {
  const routes = new Map<string, RouteHandler[]>();
  const order: string[] = [];
  const app: AppLike = {
    get(path: string, ...handlers: RouteHandler[]) {
      order.push(`GET ${path}`);
      routes.set(`GET ${path}`, handlers);
      return app;
    },
    post(path: string, ...handlers: RouteHandler[]) {
      order.push(`POST ${path}`);
      routes.set(`POST ${path}`, handlers);
      return app;
    },
  };

  async function request(
    key: string,
    options: { token?: string; body?: unknown; params?: Record<string, string>; query?: Record<string, unknown> } = {}
  ): Promise<Reply> {
    const handlers = routes.get(key);
    if (!handlers) throw new Error(`no route registered for ${key}`);
    const req: RouteRequest = {
      headers: options.token ? { authorization: `Bearer ${options.token}` } : {},
      body: options.body,
      params: options.params,
      query: options.query,
    };
    const reply: Reply = { status: 200, body: {}, headers: {} };
    let answered = false;
    const res: RouteResponse = {
      status(code: number) {
        reply.status = code;
        return res;
      },
      json(value: unknown) {
        answered = true;
        reply.body = value ?? {};
        return value;
      },
      set(field: string, value: string) {
        reply.headers[field] = value;
        return res;
      },
    };
    for (const handler of handlers) {
      let advanced = false;
      // eslint-disable-next-line no-await-in-loop
      await handler(req, res, () => {
        advanced = true;
      });
      if (answered) return reply;
      if (!advanced) break;
    }
    return reply;
  }

  return { app, request, order: () => [...order] };
}

/** one good token per account, everything else refused — the shape a real provider has. */
function provider(): AuthProvider {
  const notUsed = () => {
    throw new Error('the routes must not call this');
  };
  const byToken: Record<string, typeof pilot> = { 'token-u1': pilot, 'token-u2': other };
  return {
    name: 'stub',
    signUp: notUsed,
    confirmEmail: notUsed,
    resendConfirmation: notUsed,
    signIn: notUsed,
    refresh: notUsed,
    signOut: notUsed,
    async currentUser(token: string): Promise<CurrentUserResult> {
      const user = byToken[token];
      if (!user) return authFailure(token ? 'invalid-token' : 'no-token');
      return { ok: true, user, sessionId: `s-${user.id}`, expiresInSeconds: 900 };
    },
  } as unknown as AuthProvider;
}

/**
 * A store that enforces the same unique key the Mongo one does.
 *
 * Without the key this is not a test of anything: the point of the in-memory
 * double is that the route's duplicate handling can be driven from both sides
 * — the rule refusing, and the store refusing after the rule agreed.
 */
function memoryStore() {
  const rows: PlainSpot[] = [];
  const keys = new Set<string>();
  /** set to have the next insert lose, as it would to a request that arrived a millisecond earlier. */
  let stealNext: PlainSpot | undefined;

  const store: SpotStore = {
    async insert(spot, timeBucket) {
      if (stealNext) {
        // the winner of the race landed first, taking this exact key with it
        rows.push(stealNext);
        keys.add(`${stealNext.spotterId}|${stealNext.icao}|${timeBucket}`);
        stealNext = undefined;
      }
      const key = `${spot.spotterId}|${spot.icao}|${timeBucket}`;
      if (keys.has(key)) return false;
      keys.add(key);
      rows.push(spot);
      return true;
    },
    async lastSpotOf(spotterId, icao) {
      return [...rows]
        .filter((s) => s.spotterId === spotterId && s.icao === icao.toLowerCase())
        .sort((a, b) => Date.parse(b.spottedAt) - Date.parse(a.spottedAt))[0];
    },
    async recent(limit) {
      return [...rows].sort((a, b) => Date.parse(b.spottedAt) - Date.parse(a.spottedAt)).slice(0, limit);
    },
    async since(cursor, limit) {
      return [...rows]
        .filter((s) => Date.parse(s.spottedAt) > cursor.getTime())
        .sort((a, b) => Date.parse(a.spottedAt) - Date.parse(b.spottedAt))
        .slice(0, limit);
    },
    async bySpotter(spotterId, limit) {
      return [...rows]
        .filter((s) => s.spotterId === spotterId)
        .sort((a, b) => Date.parse(b.spottedAt) - Date.parse(a.spottedAt))
        .slice(0, limit);
    },
  };

  return {
    store,
    rows,
    seed: (spot: PlainSpot) => {
      rows.push(spot);
      keys.add(`${spot.spotterId}|${spot.icao}|${timeBucketOf(spot.spottedAt, COOLDOWN)}`);
    },
    loseNextRaceTo: (spot: PlainSpot) => {
      stealNext = spot;
    },
  };
}

/**
 * One feed row. `seen` is relative to the real clock, not to {@link NOW},
 * because the routes deliberately do not let a caller choose what time it is —
 * `SpotLog` reads the wall clock, and a fixture pinned to a constant would be
 * `stale-contact` the moment the suite outlived its own timestamp.
 */
const airborne = (icao: string, type: string | undefined, over: Partial<FeedAircraft> = {}): FeedAircraft => ({
  icao,
  callsign: icao.toUpperCase(),
  type,
  lat: 51.5,
  lon: -0.1,
  altitude: 11_000,
  onGround: false,
  seen: Math.floor(Date.now() / 1000),
  ...over,
});

const FEED: FeedAircraft[] = [
  airborne('a1b2c3', 'A320'),
  airborne('deadbe', 'A124'),
  airborne('000001', 'B738', { onGround: true, altitude: 0 }),
  airborne('000002', 'B744', { seen: Math.floor(Date.now() / 1000) - 4000 }),
  airborne('000003', undefined),
];

/** a sample big enough that `RarityIndex` is willing to put a band on a score. */
function bigIndex(): RarityIndex {
  const counts: Record<string, number> = { A320: 3000, B738: 2500, B744: 60, A124: 2 };
  return RarityIndex.from({ counts });
}

function fakeFeed(aircraft: FeedAircraft[] = FEED, index: RarityIndex = bigIndex()) {
  const calls = { snapshot: 0, rarity: 0 };
  const feed: SpotFeed = {
    async snapshot() {
      calls.snapshot += 1;
      return new FeedSnapshot(aircraft);
    },
    async rarity() {
      calls.rarity += 1;
      return index;
    },
  };
  return { feed, calls };
}

function fakeDirectory(names: Record<string, string> = { u1: 'Pilot', u2: 'Nadia' }) {
  const lookups: string[][] = [];
  const directory: SpotterDirectory = {
    async namesOf(ids) {
      lookups.push([...ids]);
      return Object.fromEntries(Object.entries(names).filter(([id]) => ids.includes(id)));
    },
  };
  return { directory, lookups };
}

function harness(over: { feed?: SpotFeed; store?: ReturnType<typeof memoryStore>; directory?: SpotterDirectory } = {}) {
  const spots = over.store ?? memoryStore();
  const { feed } = over.feed ? { feed: over.feed } : fakeFeed();
  const names = fakeDirectory();
  const app = fakeApp();
  registerSpotRoutes(app.app, {
    auth: provider(),
    spots: spots.store,
    feed,
    spotters: over.directory ?? names.directory,
    cooldownMs: COOLDOWN,
  });
  return { ...app, spots, names };
}

/** a stored spot, built the way the route builds one. */
function storedSpot(over: Partial<PlainSpot> = {}): PlainSpot {
  const spot = Spot.of({
    spotterId: 'u1',
    aircraft: airborne('a1b2c3', 'A320'),
    rarity: bigIndex().score('A320'),
    at: NOW,
  });
  return { ...spot.toObject(), ...over };
}

describe('POST /spots', () => {
  it('takes a spot and answers 201 with the spot and its spotter', async () => {
    const { request } = harness();
    const reply = await request('POST /spots', { token: 'token-u1', body: { icao: 'a1b2c3', note: ' first one ' } });

    expect(reply.status).toEqual(201);
    expect(reply.body.ok).toEqual(true);
    expect(reply.body.spot.icao).toEqual('a1b2c3');
    expect(reply.body.spot.spotter).toEqual({ id: 'u1', name: 'Pilot' });
    expect(reply.body.spot.note).toEqual('first one');
  });

  it('takes the spotter from the token and ignores any id in the body', async () => {
    const { request, spots } = harness();
    await request('POST /spots', { token: 'token-u1', body: { icao: 'a1b2c3', spotterId: 'u2', spotter: 'u2' } });

    expect(spots.rows.map((s) => s.spotterId)).toEqual(['u1']);
  });

  it('takes position, type and altitude from the feed and never from the body', async () => {
    const { request } = harness();
    const reply = await request('POST /spots', {
      token: 'token-u1',
      body: { icao: 'a1b2c3', lat: 0, lon: 0, altitude: 99_999, aircraftType: 'A124' },
    });

    expect(reply.body.spot.lat).toEqual(51.5);
    expect(reply.body.spot.altitude).toEqual(11_000);
    expect(reply.body.spot.aircraftType).toEqual('A320');
  });

  it('scores against the accumulated index, not against the one snapshot', async () => {
    const { request } = harness();
    const common = await request('POST /spots', { token: 'token-u1', body: { icao: 'a1b2c3' } });
    const rare = await request('POST /spots', { token: 'token-u1', body: { icao: 'deadbe' } });

    // five aircraft in the snapshot would rate all of them `unknown`; the
    // index has thousands behind it and can tell an A320 from an An-124.
    expect(common.body.spot.rarity.band).toEqual('common');
    expect(rare.body.spot.rarity.band).toEqual('exceptional');
  });

  it('refuses a request with no token and never reaches the store', async () => {
    const { request, spots } = harness();
    const reply = await request('POST /spots', { body: { icao: 'a1b2c3' } });

    expect(reply.status).toEqual(401);
    expect(reply.body.code).toEqual('no-token');
    expect(spots.rows).toEqual([]);
  });

  it('asks which aircraft when the body does not say', async () => {
    const { request } = harness();
    const reply = await request('POST /spots', { token: 'token-u1', body: { note: 'lovely' } });
    expect(reply.status).toEqual(400);
    expect(reply.body.code).toEqual('bad-request');
  });

  it('answers 422 for an aircraft that is not in the feed', async () => {
    const { request } = harness();
    const reply = await request('POST /spots', { token: 'token-u1', body: { icao: 'ffffff' } });
    expect(reply.status).toEqual(422);
    expect(reply.body).toEqual({ ok: false, reason: 'not-in-feed', message: 'ffffff is not in the sky right now' });
  });

  it('answers 422 for an aircraft on the ground', async () => {
    const { request } = harness();
    const reply = await request('POST /spots', { token: 'token-u1', body: { icao: '000001' } });
    expect(reply.status).toEqual(422);
    expect(reply.body.reason).toEqual('not-airborne');
  });

  it('answers 422 when the last position report is too old to be evidence', async () => {
    const { request } = harness();
    const reply = await request('POST /spots', { token: 'token-u1', body: { icao: '000002' } });
    expect(reply.status).toEqual(422);
    expect(reply.body.reason).toEqual('stale-contact');
  });

  it('answers 409 with a retry hint when the cooldown has not run out', async () => {
    const { request } = harness();
    await request('POST /spots', { token: 'token-u1', body: { icao: 'a1b2c3' } });
    const again = await request('POST /spots', { token: 'token-u1', body: { icao: 'a1b2c3' } });

    expect(again.status).toEqual(409);
    expect(again.body.reason).toEqual('duplicate');
    expect(again.body.retryAfterMs).toBeGreaterThan(0);
    expect(again.body.retryAfterMs).toBeLessThanOrEqual(COOLDOWN);
  });

  it('lets two different people spot the same aircraft', async () => {
    const { request, spots } = harness();
    await request('POST /spots', { token: 'token-u1', body: { icao: 'a1b2c3' } });
    const second = await request('POST /spots', { token: 'token-u2', body: { icao: 'a1b2c3' } });

    expect(second.status).toEqual(201);
    expect(spots.rows.length).toEqual(2);
  });

  it('answers 409 when the store refuses after the rule agreed — the race the rule cannot see', async () => {
    const store = memoryStore();
    const { request } = harness({ store });
    // Another request carrying the same pair lands between the cooldown check
    // and the write. The rule saw an empty ledger and said yes; the unique key
    // is the only thing left that can say no.
    store.loseNextRaceTo(storedSpot({ id: 'winner', spottedAt: new Date(Date.now() - 1000).toISOString() }));

    const reply = await request('POST /spots', { token: 'token-u1', body: { icao: 'a1b2c3' } });

    expect(reply.status).toEqual(409);
    expect(reply.body.reason).toEqual('duplicate');
    expect(reply.body.retryAfterMs).toBeGreaterThan(0);
    expect(store.rows.map((s) => s.id)).toEqual(['winner']);
  });

  it('answers 500 rather than hanging when the store breaks', async () => {
    const store = memoryStore();
    store.store.insert = async () => {
      throw new Error('mongo is on fire');
    };
    const { request } = harness({ store });
    const reply = await request('POST /spots', { token: 'token-u1', body: { icao: 'a1b2c3' } });

    expect(reply.status).toEqual(500);
    expect(reply.body).toEqual({ error: 'mongo is on fire', code: 'unavailable' });
  });
});

describe('GET /spots/recent', () => {
  async function seeded() {
    const h = harness();
    await h.request('POST /spots', { token: 'token-u1', body: { icao: 'a1b2c3' } });
    await h.request('POST /spots', { token: 'token-u2', body: { icao: 'deadbe' } });
    return h;
  }

  it('is public — no token needed to read the feed', async () => {
    const { request } = await seeded();
    const reply = await request('GET /spots/recent');
    expect(reply.status).toEqual(200);
    expect(reply.body.spots.length).toEqual(2);
  });

  it('is newest first', async () => {
    const h = harness();
    h.spots.seed(storedSpot({ id: 'old', spottedAt: '2026-09-17T09:00:00.000Z' }));
    h.spots.seed(storedSpot({ id: 'new', spottedAt: '2026-09-17T11:00:00.000Z' }));

    const reply = await h.request('GET /spots/recent');
    expect(reply.body.spots.map((s: any) => s.id)).toEqual(['new', 'old']);
  });

  it('answers a cursor with what was missed, oldest first', async () => {
    const h = harness();
    h.spots.seed(storedSpot({ id: 'before', spottedAt: '2026-09-17T09:00:00.000Z' }));
    h.spots.seed(storedSpot({ id: 'a', spottedAt: '2026-09-17T11:00:00.000Z' }));
    h.spots.seed(storedSpot({ id: 'b', spottedAt: '2026-09-17T11:30:00.000Z' }));

    const reply = await h.request('GET /spots/recent', { query: { since: '2026-09-17T10:00:00.000Z' } });
    expect(reply.body.spots.map((s: any) => s.id)).toEqual(['a', 'b']);
  });

  it('refuses a cursor it cannot read rather than answering the newest page', async () => {
    const { request } = await seeded();
    const reply = await request('GET /spots/recent', { query: { since: 'last tuesday' } });

    // Answering the newest page would look to the client like "you missed
    // nothing", which is a lie it has no way to detect.
    expect(reply.status).toEqual(400);
    expect(reply.body.code).toEqual('bad-request');
  });

  it('honours a limit and bounds it', async () => {
    const h = harness();
    for (let n = 0; n < 5; n += 1) {
      h.spots.seed(storedSpot({ id: `s${n}`, spottedAt: new Date(NOW.getTime() - n * 1000).toISOString() }));
    }
    expect((await h.request('GET /spots/recent', { query: { limit: 2 } })).body.spots.length).toEqual(2);
    expect((await h.request('GET /spots/recent', { query: { limit: 'lots' } })).body.spots.length).toEqual(5);
  });

  it('joins names in one lookup, not one per row', async () => {
    const names = fakeDirectory();
    const h = harness({ directory: names.directory });
    h.spots.seed(storedSpot({ id: 'a', spotterId: 'u1' }));
    h.spots.seed(storedSpot({ id: 'b', spotterId: 'u2', spottedAt: '2026-09-17T11:00:00.000Z' }));

    await h.request('GET /spots/recent');
    expect(names.lookups.length).toEqual(1);
    expect(names.lookups[0].sort()).toEqual(['u1', 'u2']);
  });
});

describe('GET /me/spots', () => {
  it('serves the caller their own log and nobody else’s', async () => {
    const h = harness();
    await h.request('POST /spots', { token: 'token-u1', body: { icao: 'a1b2c3' } });
    await h.request('POST /spots', { token: 'token-u2', body: { icao: 'deadbe' } });

    const mine = await h.request('GET /me/spots', { token: 'token-u1' });
    expect(mine.body.spots.map((s: any) => s.spotter.id)).toEqual(['u1']);
  });

  it('needs a token', async () => {
    const { request } = harness();
    expect((await request('GET /me/spots')).status).toEqual(401);
  });
});

describe('rarity', () => {
  it('scores one airframe against the live index without taking a spot', async () => {
    const { request, spots } = harness();
    const reply = await request('GET /spots/rarity/:icao', { params: { icao: 'deadbe' } });

    expect(reply.status).toEqual(200);
    expect(reply.body.rarity.band).toEqual('exceptional');
    expect(spots.rows).toEqual([]);
  });

  it('404s for an aircraft that is not in the feed', async () => {
    const { request } = harness();
    const reply = await request('GET /spots/rarity/:icao', { params: { icao: 'ffffff' } });
    expect(reply.status).toEqual(404);
    expect(reply.body.code).toEqual('not-in-feed');
  });

  it('answers 200 with an `unknown` band when the type has not been resolved', async () => {
    const { request } = harness();
    const reply = await request('GET /spots/rarity/:icao', { params: { icao: '000003' } });

    // A hedge is an answer. 404 here would tell the UI the aircraft is gone.
    expect(reply.status).toEqual(200);
    expect(reply.body.rarity.band).toEqual('unknown');
  });

  it('answers 200 with an `unknown` band while the sample is still too small', async () => {
    const { feed } = fakeFeed(FEED, RarityIndex.fromFeed(FEED));
    const { request } = harness({ feed });
    const reply = await request('GET /spots/rarity/:icao', { params: { icao: 'deadbe' } });

    expect(reply.status).toEqual(200);
    expect(reply.body.rarity.band).toEqual('unknown');
    expect(reply.body.rarity.confidence).toEqual('low');
  });

  it('is case-insensitive about the address', async () => {
    const { request } = harness();
    expect((await request('GET /spots/rarity/:icao', { params: { icao: 'DEADBE' } })).status).toEqual(200);
  });

  it('serves the rare tail of the ranking, rarest first', async () => {
    const { request } = harness();
    const reply = await request('GET /spots/rarity/top', { query: { limit: 2 } });

    expect(reply.body.types.map((t: any) => t.type)).toEqual(['A124', 'B744']);
    expect(reply.body.types[0].band).toEqual('exceptional');
    expect(reply.body.types[0].observed).toEqual(2);
    expect(reply.body.sampleSize).toEqual(5562);
    expect(reply.body.confidence).toEqual('high');
  });

  it('registers `top` before the address route, so it is not read as an aircraft', async () => {
    const { order } = harness();
    const paths = order();
    expect(paths.indexOf('GET /spots/rarity/top')).toBeLessThan(paths.indexOf('GET /spots/rarity/:icao'));
  });
});

describe('the wire shape', () => {
  it('carries the spotter’s id and name, and nothing else about them', async () => {
    const names = fakeDirectory({ u1: 'Pilot' });
    const h = harness({ directory: names.directory });
    h.spots.seed(storedSpot({ id: 'a' }));

    const reply = await h.request('GET /spots/recent');
    expect(Object.keys(reply.body.spots[0].spotter).sort()).toEqual(['id', 'name']);
    expect(JSON.stringify(reply.body)).not.toContain('@');
  });

  it('attributes a spot whose account is gone rather than dropping it', async () => {
    const names = fakeDirectory({});
    const h = harness({ directory: names.directory });
    h.spots.seed(storedSpot({ id: 'a' }));

    const reply = await h.request('GET /spots/recent');
    expect(reply.body.spots[0].spotter).toEqual({ id: 'u1', name: UNKNOWN_SPOTTER });
  });

  it('asks the directory nothing when there is nothing to join', async () => {
    const names = fakeDirectory();
    expect(await toWireSpots([], names.directory)).toEqual([]);
    expect(names.lookups).toEqual([]);
  });
});

describe('timeBucketOf', () => {
  it('puts two moments inside one window in the same bucket', () => {
    const a = timeBucketOf('2026-09-17T12:00:00.000Z', COOLDOWN);
    const b = timeBucketOf('2026-09-17T12:00:00.001Z', COOLDOWN);
    expect(a).toEqual(b);
  });

  it('is coarse in both directions, which is why it is a backstop and not the rule', () => {
    // a boundary splits two moments a millisecond apart...
    const before = timeBucketOf('2026-09-17T11:59:59.999Z', COOLDOWN);
    const after = timeBucketOf('2026-09-17T12:00:00.000Z', COOLDOWN);
    expect(after).toEqual(before + 1);
    // ...and holds two nearly a whole window apart together. `SpotLog` decides.
    expect(timeBucketOf('2026-09-17T12:00:00.000Z', COOLDOWN)).toEqual(timeBucketOf('2026-09-17T17:59:00.000Z', COOLDOWN));
  });

  it('reads an unusable timestamp as bucket zero rather than NaN', () => {
    // NaN is not equal to itself, so a NaN bucket would make the unique key
    // stop being unique — the one failure mode this column must not have.
    expect(timeBucketOf('not a date', COOLDOWN)).toEqual(0);
    expect(timeBucketOf(NOW, 0)).toEqual(0);
  });

  it('takes a Date and a string the same way', () => {
    expect(timeBucketOf(NOW, COOLDOWN)).toEqual(timeBucketOf(NOW.toISOString(), COOLDOWN));
  });
});

describe('limitFrom', () => {
  it('falls back when there is nothing usable to read', () => {
    expect(limitFrom(undefined)).toEqual(50);
    expect(limitFrom({})).toEqual(50);
    expect(limitFrom({ limit: '-3' })).toEqual(50);
    expect(limitFrom({ limit: 'all of them' }, 6)).toEqual(6);
  });

  it('reads a number out of a string, as a query string always gives it', () => {
    expect(limitFrom({ limit: '12' })).toEqual(12);
    expect(limitFrom({ limit: ['12', '99'] })).toEqual(12);
  });

  it('caps what one request may ask for', () => {
    expect(limitFrom({ limit: 100_000 })).toEqual(200);
  });
});
