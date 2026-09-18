import { RarityIndex } from './rarity.js';
import type { FeedAircraft } from './feed.js';

/** Build a feed with a given type mix, e.g. { A320: 900, A124: 2 }. */
const feed = (mix: Record<string, number>): FeedAircraft[] => {
  const out: FeedAircraft[] = [];
  let n = 0;
  for (const [type, count] of Object.entries(mix)) {
    for (let i = 0; i < count; i += 1) {
      out.push({ icao: (0x400000 + n++).toString(16), type, lat: 0, lon: 0, altitude: 10000 });
    }
  }
  return out;
};

/** Roughly a European afternoon: a lot of narrowbodies, a handful of freighters, one outsized. */
const busySky = feed({ A320: 900, B738: 800, A21N: 200, B788: 60, B744: 20, A388: 5, A124: 2 });

describe('rarity', () => {
  it('scores the commonest type in the sky at zero', () => {
    const index = RarityIndex.fromFeed(busySky);
    expect(index.score('A320').score).toEqual(0);
    expect(index.score('A320').band).toEqual('common');
  });

  it('scores an outsized freighter far above a narrowbody', () => {
    const index = RarityIndex.fromFeed(busySky);
    expect(index.score('A124').score).toBeGreaterThan(index.score('B744').score);
    expect(index.score('B744').score).toBeGreaterThan(index.score('B788').score);
    expect(index.score('B788').score).toBeGreaterThan(index.score('B738').score);
    expect(index.score('A124').band).toEqual('exceptional');
  });

  it('is monotonic in observed frequency for every pair of types', () => {
    const index = RarityIndex.fromFeed(busySky);
    const ranked = index.ranking();
    for (let i = 1; i < ranked.length; i += 1) {
      expect(ranked[i].score).toBeGreaterThanOrEqual(ranked[i - 1].score);
    }
    expect(ranked[0].type).toEqual('A320');
  });

  it('reports what it counted, not just a verdict', () => {
    const score = RarityIndex.fromFeed(busySky).score('B744');
    expect(score.observed).toEqual(20);
    expect(score.sampleSize).toEqual(1987);
    expect(score.frequency).toBeCloseTo(20 / 1987, 6);
    expect(score.confidence).toEqual('medium');
  });

  it('tops out at a type it has never seen', () => {
    const index = RarityIndex.fromFeed(busySky);
    expect(index.score('B52').score).toEqual(100);
    expect(index.score('B52').observed).toEqual(0);
  });

  it('re-centres when the traffic changes rather than holding a fixed opinion', () => {
    const before = RarityIndex.fromFeed(busySky);
    // a 747 reroute floods the sky with a type that used to be worth points
    const after = before.plus(feed({ B744: 4000 }));
    expect(before.score('B744').band).toEqual('uncommon');
    expect(after.score('B744').score).toBeLessThan(before.score('B744').score);
    expect(after.score('B744').band).toEqual('common');
  });

  it('ignores case and stray whitespace in a type designator', () => {
    const index = RarityIndex.fromFeed(busySky);
    expect(index.score(' a124 ')).toEqual(index.score('A124'));
  });

  describe('cold start', () => {
    it('says unknown rather than legendary when it has counted nothing', () => {
      const empty = new RarityIndex();
      const score = empty.score('A124');
      expect(score).toEqual({ score: 0, band: 'unknown', confidence: 'none', observed: 0, frequency: 0, sampleSize: 0 });
    });

    it('withholds a band while the sample is too thin to rank anything', () => {
      const index = RarityIndex.fromFeed(feed({ A320: 8, B738: 4, A124: 1 }));
      expect(index.confidence).toEqual('low');
      expect(index.score('A124').band).toEqual('unknown');
      // the number is still there for anyone who wants to show it hedged
      expect(index.score('A124').score).toBeGreaterThan(index.score('A320').score);
    });

    it('grows into a real band as snapshots accumulate', () => {
      let index = new RarityIndex();
      for (let i = 0; i < 40; i += 1) index = index.plus(feed({ A320: 8, B738: 4, A124: 1 }));
      expect(index.sampleSize).toEqual(520);
      expect(index.confidence).toEqual('medium');
      expect(index.score('A124').band).not.toEqual('unknown');
    });
  });

  it('refuses to reward an aircraft whose type has not been resolved', () => {
    const index = RarityIndex.fromFeed(busySky);
    // otherwise the cheapest rarity in the game is an aircraft the lookup missed
    expect(index.score(undefined).score).toEqual(0);
    expect(index.score('   ').band).toEqual('unknown');
  });

  it('does not count aircraft with no type towards the sample', () => {
    const index = RarityIndex.fromFeed([...feed({ A320: 3 }), { icao: 'abc123', lat: 0, lon: 0, altitude: 1000 }]);
    expect(index.sampleSize).toEqual(3);
  });

  it('survives a round trip through its plain shape', () => {
    const index = RarityIndex.fromFeed(busySky);
    const back = RarityIndex.from(index.toObject());
    expect(back.sampleSize).toEqual(index.sampleSize);
    expect(back.score('A124')).toEqual(index.score('A124'));
  });

  it('merges two indexes as if they were one sample', () => {
    const a = RarityIndex.fromFeed(feed({ A320: 100, A124: 1 }));
    const b = RarityIndex.fromFeed(feed({ A320: 100, B744: 3 }));
    const merged = a.merge(b);
    expect(merged.observed('A320')).toEqual(200);
    expect(merged.observed('B744')).toEqual(3);
    expect(merged.sampleSize).toEqual(204);
  });
});
