import { FollowGraph } from './follow.js';
import { FeedSnapshot } from './feed.js';
import { RarityIndex } from './rarity.js';
import { SpotLog, DEFAULT_COOLDOWN_MS, spotAccepted, spotRejected } from './spot-log.js';
import type { FeedAircraft } from './feed.js';

const NOW = new Date('2026-09-17T12:00:00.000Z');
const seenNow = Math.floor(NOW.getTime() / 1000);

const airborne = (over: Partial<FeedAircraft> = {}): FeedAircraft => ({
  icao: 'a1b2c3',
  callsign: 'BAW117',
  type: 'B77W',
  lat: 51.5,
  lon: -0.45,
  altitude: 11277,
  onGround: false,
  seen: seenNow,
  ...over,
});

const sky = [
  airborne(),
  airborne({ icao: 'ddd111', callsign: 'VDA3', type: 'A124', lat: 51.1, lon: -0.2 }),
  airborne({ icao: 'eee222', callsign: 'EZY1', type: 'A320', altitude: 9000 }),
  airborne({ icao: 'fff333', callsign: 'RYR2', type: 'A320', altitude: 8000 }),
  airborne({ icao: 'ggg444', callsign: 'TAXI', type: 'A320', altitude: 0, onGround: true }),
];

const later = (ms: number) => new Date(NOW.getTime() + ms);

describe('taking a spot', () => {
  it('records the aircraft as the feed saw it', () => {
    const log = new SpotLog();
    const result = log.attempt({ spotterId: 'anna', icao: 'A1B2C3' }, sky, { now: NOW });
    expect(result.ok).toEqual(true);
    if (!spotAccepted(result)) throw new Error(result.message);
    expect(result.spot.callsign).toEqual('BAW117');
    expect(result.spot.position).toEqual({ lat: 51.5, lon: -0.45 });
    expect(result.spot.at).toEqual(NOW);
    expect(log.size).toEqual(1);
  });

  it('scores rarity against the sky it was taken from', () => {
    const log = new SpotLog();
    const rare = log.attempt({ spotterId: 'anna', icao: 'ddd111' }, sky, { now: NOW });
    const common = log.attempt({ spotterId: 'anna', icao: 'eee222' }, sky, { now: NOW });
    if (!rare.ok || !common.ok) throw new Error('expected both spots to be taken');
    expect(rare.spot.rarity.score).toBeGreaterThan(common.spot.rarity.score);
    // five aircraft is nowhere near enough to call anything rare, and it says so
    expect(rare.spot.rarity.band).toEqual('unknown');
    expect(rare.spot.rarity.confidence).toEqual('low');
  });

  it('uses a long-running index when one is supplied, instead of one snapshot', () => {
    // an hour of polling, in which no An-124 ever flew
    let index = new RarityIndex();
    const ordinary = Array.from({ length: 45 }, (_, i) => airborne({ icao: `o${i}`, type: i % 3 ? 'A320' : 'B738' }));
    for (let i = 0; i < 100; i += 1) index = index.plus(ordinary);

    const result = new SpotLog().attempt({ spotterId: 'anna', icao: 'ddd111' }, sky, { now: NOW, rarity: index });
    if (!spotAccepted(result)) throw new Error(result.message);
    expect(result.spot.rarity.sampleSize).toEqual(4500);
    expect(result.spot.rarity.confidence).toEqual('high');
    expect(result.spot.rarity.band).toEqual('exceptional');
  });

  it('gains confidence from repeated snapshots without reordering the types', () => {
    const thin = RarityIndex.fromFeed(sky);
    let index = new RarityIndex();
    for (let i = 0; i < 100; i += 1) index = index.plus(sky);

    expect(index.sampleSize).toEqual(500);
    expect(index.confidence).toEqual('medium');
    expect(index.ranking().map((r) => r.type)).toEqual(thin.ranking().map((r) => r.type));
    // the ranking held; what changed is that it is now worth showing
    expect(thin.score('A124').band).toEqual('unknown');
    expect(index.score('A124').band).not.toEqual('unknown');
  });

  it('freezes the score on the spot even as the sky changes', () => {
    const log = new SpotLog();
    const taken = log.attempt({ spotterId: 'anna', icao: 'ddd111' }, sky, { now: NOW });
    if (!spotAccepted(taken)) throw new Error(taken.message);
    const before = taken.spot.rarity.score;
    log.attempt({ spotterId: 'bo', icao: 'ddd111' }, [...sky, ...Array.from({ length: 50 }, (_, i) => airborne({ icao: `h${i}`, type: 'A124' }))], { now: NOW });
    expect(log.bySpotter('anna')[0].rarity.score).toEqual(before);
  });

  it('accepts a prebuilt snapshot so a busy server indexes the feed once', () => {
    const snapshot = FeedSnapshot.of(sky);
    const log = new SpotLog();
    expect(log.attempt({ spotterId: 'anna', icao: 'a1b2c3' }, snapshot, { now: NOW }).ok).toEqual(true);
    expect(snapshot.airborne()).toHaveLength(4);
  });
});

describe('rules', () => {
  const reject = (log: SpotLog, icao: string, opts: { now?: Date } = {}) => {
    const r = log.attempt({ spotterId: 'anna', icao }, sky, { now: opts.now ?? NOW });
    if (!spotRejected(r)) throw new Error(`expected ${icao} to be rejected`);
    return r;
  };

  it('refuses an aircraft that is not in the sky', () => {
    expect(reject(new SpotLog(), 'zzz999').reason).toEqual('not-in-feed');
  });

  it('refuses an aircraft that is on the ground', () => {
    expect(reject(new SpotLog(), 'ggg444').reason).toEqual('not-airborne');
  });

  it('refuses a position report too old to prove the aircraft is up', () => {
    const stale = [airborne({ icao: 'old111', seen: seenNow - 3600 })];
    const r = new SpotLog().attempt({ spotterId: 'anna', icao: 'old111' }, stale, { now: NOW });
    if (!spotRejected(r)) throw new Error('expected a stale contact to be rejected');
    expect(r.reason).toEqual('stale-contact');
    expect(r.message).toMatch(/3600s old/);
  });

  it('refuses a spot with no spotter', () => {
    const r = new SpotLog().attempt({ spotterId: '', icao: 'a1b2c3' }, sky, { now: NOW });
    expect(r.ok).toEqual(false);
  });

  it('refuses the same airframe twice inside the window, and says how long to wait', () => {
    const log = new SpotLog();
    log.attempt({ spotterId: 'anna', icao: 'a1b2c3' }, sky, { now: NOW });
    const again = log.attempt({ spotterId: 'anna', icao: 'A1B2C3' }, sky, { now: later(60_000) });
    if (!spotRejected(again)) throw new Error('expected a duplicate');
    expect(again.reason).toEqual('duplicate');
    expect(again.retryAfterMs).toEqual(DEFAULT_COOLDOWN_MS - 60_000);
    expect(log.size).toEqual(1);
  });

  it('allows the same airframe again once the window has passed', () => {
    const log = new SpotLog();
    log.attempt({ spotterId: 'anna', icao: 'a1b2c3' }, sky, { now: NOW });
    const tomorrow = later(DEFAULT_COOLDOWN_MS + 1000);
    // a later attempt needs a later feed: the old snapshot is no longer evidence of anything
    const freshSky = sky.map((a) => ({ ...a, seen: Math.floor(tomorrow.getTime() / 1000) }));
    const again = log.attempt({ spotterId: 'anna', icao: 'a1b2c3' }, freshSky, { now: tomorrow });
    expect(again.ok).toEqual(true);
    expect(log.size).toEqual(2);
    expect(log.lastSpotOf('anna', 'a1b2c3')?.at).toEqual(tomorrow);
  });

  it('does not let one spotter block another', () => {
    const log = new SpotLog();
    log.attempt({ spotterId: 'anna', icao: 'a1b2c3' }, sky, { now: NOW });
    expect(log.attempt({ spotterId: 'bo', icao: 'a1b2c3' }, sky, { now: NOW }).ok).toEqual(true);
  });

  it('takes the cooldown from the log, not from a constant', () => {
    const log = new SpotLog([], { cooldownMs: 1000 });
    log.attempt({ spotterId: 'anna', icao: 'a1b2c3' }, sky, { now: NOW });
    expect(log.attempt({ spotterId: 'anna', icao: 'a1b2c3' }, sky, { now: later(2000) }).ok).toEqual(true);
  });

  it('applies the cooldown to spots loaded from a store, not just ones taken this process', () => {
    const first = new SpotLog();
    first.attempt({ spotterId: 'anna', icao: 'a1b2c3' }, sky, { now: NOW });
    const reloaded = new SpotLog(first.all());
    const again = reloaded.attempt({ spotterId: 'anna', icao: 'a1b2c3' }, sky, { now: later(60_000) });
    expect(again.ok).toEqual(false);
  });
});

describe('the feeds an account is for', () => {
  const build = () => {
    const log = new SpotLog();
    log.attempt({ spotterId: 'anna', icao: 'a1b2c3' }, sky, { now: NOW });
    log.attempt({ spotterId: 'bo', icao: 'ddd111' }, sky, { now: later(60_000) });
    log.attempt({ spotterId: 'cass', icao: 'eee222' }, sky, { now: later(120_000) });
    return log;
  };

  it('shows everyone the global feed, newest first', () => {
    expect(build().recent().map((s) => s.spotterId)).toEqual(['cass', 'bo', 'anna']);
  });

  it('shows a spotter log', () => {
    expect(build().bySpotter('bo').map((s) => s.icao)).toEqual(['ddd111']);
  });

  it('shows the spots of the people I follow, and my own', () => {
    const graph = new FollowGraph();
    graph.follow('anna', 'bo', NOW);
    const feed = build().fromFollowing('anna', graph);
    expect(feed.map((s) => s.spotterId)).toEqual(['bo', 'anna']);
  });

  it('can leave my own spots out when a client wants only the people it follows', () => {
    const graph = new FollowGraph();
    graph.follow('anna', 'bo', NOW);
    expect(build().fromFollowing('anna', graph, { includeOwn: false }).map((s) => s.spotterId)).toEqual(['bo']);
  });

  it('gives a new account its own spots and nothing else', () => {
    expect(build().fromFollowing('anna', new FollowGraph()).map((s) => s.spotterId)).toEqual(['anna']);
  });

  it('tails the log from a cursor for a live socket', () => {
    expect(build().since(later(60_000)).map((s) => s.spotterId)).toEqual(['cass']);
  });
});

describe('following', () => {
  it('is directed: following someone does not make them follow back', () => {
    const graph = new FollowGraph();
    expect(graph.follow('anna', 'bo')).toEqual(true);
    expect(graph.isFollowing('anna', 'bo')).toEqual(true);
    expect(graph.isFollowing('bo', 'anna')).toEqual(false);
    expect(graph.isMutual('anna', 'bo')).toEqual(false);
  });

  it('is idempotent and refuses self-follow', () => {
    const graph = new FollowGraph();
    graph.follow('anna', 'bo');
    expect(graph.follow('anna', 'bo')).toEqual(false);
    expect(graph.follow('anna', 'anna')).toEqual(false);
    expect(graph.following('anna')).toEqual(['bo']);
  });

  it('indexes both directions', () => {
    const graph = new FollowGraph();
    graph.follow('anna', 'cass');
    graph.follow('bo', 'cass');
    expect(graph.followers('cass').sort()).toEqual(['anna', 'bo']);
    expect(graph.counts('cass')).toEqual({ following: 0, followers: 2 });
  });

  it('unfollows once and then reports nothing to do', () => {
    const graph = new FollowGraph();
    graph.follow('anna', 'bo');
    expect(graph.unfollow('anna', 'bo')).toEqual(true);
    expect(graph.unfollow('anna', 'bo')).toEqual(false);
    expect(graph.followers('bo')).toEqual([]);
  });

  it('survives a round trip through its plain shape', () => {
    const graph = new FollowGraph();
    graph.follow('anna', 'bo', NOW);
    graph.follow('bo', 'anna', NOW);
    const back = FollowGraph.from(graph.toObject());
    expect(back.toObject()).toEqual(graph.toObject());
    expect(back.isMutual('anna', 'bo')).toEqual(true);
    expect(back.toObject()[0].since).toEqual(NOW.toISOString());
  });
});
