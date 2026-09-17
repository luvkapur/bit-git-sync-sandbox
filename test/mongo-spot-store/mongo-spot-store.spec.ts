import type { PlainSpot } from '@luvktest/test.spot';
import { timeBucketOf } from '@luvktest/test.spot-routes';
import { MongoSpotStore } from './mongo-spot-store.js';
import { isDuplicateKey, toPlainSpot } from './spot-document.js';
import { SPOT_MODEL_NAME, spotSchema } from './spot-schema.js';

const COOLDOWN = 6 * 60 * 60 * 1000;

const record: PlainSpot = {
  id: 'u1:a1b2c3:1789660800000',
  spotterId: 'u1',
  icao: 'a1b2c3',
  callsign: 'BAW117',
  aircraftType: 'A320',
  lat: 51.47,
  lon: -0.45,
  altitude: 11_000,
  spottedAt: '2026-09-17T12:00:00.000Z',
  rarity: { score: 12, band: 'common', confidence: 'high', observed: 3000, frequency: 0.54, sampleSize: 5562 },
  note: 'first of the day',
};

type Call = { op: string; filter?: unknown; doc?: unknown; sort?: unknown; limit?: unknown };

/**
 * A stand-in for a mongoose model that records what it was asked.
 *
 * The queries are the part of this component worth asserting — whether the
 * page is taken from the right end, whether the cursor is a range and not a
 * scan, whether a duplicate key is read as an answer rather than a failure.
 * What cannot be covered without a live database is that Mongo honours them,
 * which is why the filters are pinned here instead.
 */
function fakeModel(found: unknown = null, list: unknown[] = []) {
  const calls: Call[] = [];
  let failWith: unknown;

  const cursor = (call: Call, result: unknown) => {
    const chain = {
      sort(sort: unknown) {
        call.sort = sort;
        return chain;
      },
      limit(limit: unknown) {
        call.limit = limit;
        return chain;
      },
      lean: async () => result,
    };
    return chain;
  };

  const model = {
    calls,
    failNextCreateWith(e: unknown) {
      failWith = e;
    },
    async create(doc: unknown) {
      calls.push({ op: 'create', doc });
      if (failWith) {
        const e = failWith;
        failWith = undefined;
        throw e;
      }
      return doc;
    },
    findOne(filter: unknown) {
      const call: Call = { op: 'findOne', filter };
      calls.push(call);
      return cursor(call, found);
    },
    find(filter: unknown) {
      const call: Call = { op: 'find', filter };
      calls.push(call);
      return cursor(call, list);
    },
    async createIndexes() {
      calls.push({ op: 'createIndexes' });
    },
  };
  return model;
}

/** the fake is structurally a model for the methods the store uses. */
function storeOver(model: ReturnType<typeof fakeModel>): MongoSpotStore {
  return new MongoSpotStore(model as never);
}

const duplicateKeyError = () => Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });

describe('the collection', () => {
  it('holds one spot per airframe per window, as a unique key', () => {
    const compound = spotSchema
      .indexes()
      .find(([, options]: any[]) => options?.name === 'one_spot_per_airframe_per_window');

    expect(compound?.[0]).toEqual({ spotterId: 1, icao: 1, timeBucket: 1 });
    expect(compound?.[1]?.unique).toEqual(true);
  });

  it('indexes the two orderings the feed reads in', () => {
    const fields = spotSchema.indexes().map(([f]: any[]) => f);
    expect(fields).toContainEqual({ spottedAt: -1 });
    expect(fields).toContainEqual({ spotterId: 1, spottedAt: -1 });
  });

  it('names a model, so a second import does not register it twice', () => {
    expect(SPOT_MODEL_NAME).toEqual('Spot');
  });
});

describe('insert', () => {
  it('writes the bucket alongside the spot, because the key is made of it', async () => {
    const model = fakeModel();
    const bucket = timeBucketOf(record.spottedAt, COOLDOWN);
    expect(await storeOver(model).insert(record, bucket)).toEqual(true);

    expect(model.calls[0]).toEqual({ op: 'create', doc: { ...record, timeBucket: bucket } });
  });

  it('reads a duplicate key as "somebody else got there first", not as a failure', async () => {
    const model = fakeModel();
    model.failNextCreateWith(duplicateKeyError());

    // This is the whole point of the unique index: two concurrent requests
    // both pass the in-memory cooldown check, and exactly one of them lands.
    expect(await storeOver(model).insert(record, 1)).toEqual(false);
  });

  it('still throws when the database is simply broken', async () => {
    const model = fakeModel();
    model.failNextCreateWith(new Error('connection reset'));

    // Swallowing this would report a spot as a duplicate when Mongo was down,
    // and the user would be told they had already spotted something they had not.
    await expect(storeOver(model).insert(record, 1)).rejects.toThrow('connection reset');
  });
});

describe('the cooldown lookup', () => {
  it('asks for the newest row of this pair, on the indexed equality', async () => {
    const model = fakeModel(record);
    const found = await storeOver(model).lastSpotOf('u1', 'a1b2c3');

    expect(model.calls[0]).toEqual({
      op: 'findOne',
      filter: { spotterId: 'u1', icao: 'a1b2c3' },
      sort: { spottedAt: -1 },
    });
    expect(found).toEqual(record);
  });

  it('lowercases the address, because a transponder address has one spelling', async () => {
    const model = fakeModel(record);
    await storeOver(model).lastSpotOf('u1', 'A1B2C3');
    expect((model.calls[0].filter as any).icao).toEqual('a1b2c3');
  });

  it('reads a miss as undefined rather than null', async () => {
    expect(await storeOver(fakeModel(null)).lastSpotOf('u1', 'nope')).toEqual(undefined);
  });
});

describe('the feed queries', () => {
  it('takes the newest page for everyone', async () => {
    const model = fakeModel(null, [record]);
    expect(await storeOver(model).recent(30)).toEqual([record]);
    expect(model.calls[0]).toEqual({ op: 'find', filter: {}, sort: { spottedAt: -1 }, limit: 30 });
  });

  it('takes the catch-up page from the oldest end, so a client cannot skip the middle', async () => {
    const model = fakeModel(null, [record]);
    await storeOver(model).since(new Date('2026-09-17T10:00:00.000Z'), 30);

    expect(model.calls[0]).toEqual({
      op: 'find',
      filter: { spottedAt: { $gt: '2026-09-17T10:00:00.000Z' } },
      sort: { spottedAt: 1 },
      limit: 30,
    });
  });

  it('takes one spotter’s page off the compound index', async () => {
    const model = fakeModel(null, [record]);
    await storeOver(model).bySpotter('u1', 50);
    expect(model.calls[0]).toEqual({ op: 'find', filter: { spotterId: 'u1' }, sort: { spottedAt: -1 }, limit: 50 });
  });

  it('never asks for a negative page', async () => {
    const model = fakeModel(null, []);
    await storeOver(model).recent(-5);
    expect(model.calls[0].limit).toEqual(0);
  });

  it('drops a corrupt row rather than the whole page', async () => {
    const model = fakeModel(null, [record, { id: 'broken' }, { ...record, id: 'ok' }]);
    const page = await storeOver(model).recent(10);
    expect(page.map((s) => s.id)).toEqual([record.id, 'ok']);
  });
});

describe('ensureIndexes', () => {
  it('builds the indexes and waits, because a constraint that is usually there is not one', async () => {
    const model = fakeModel();
    await storeOver(model).ensureIndexes();
    expect(model.calls[0]).toEqual({ op: 'createIndexes' });
  });
});

describe('reading documents back', () => {
  it('round-trips a full record', () => {
    expect(toPlainSpot({ ...record, _id: 'mongo-id', __v: 0, timeBucket: 82 })).toEqual(record);
  });

  it('drops Mongo’s bookkeeping and the store’s own key', () => {
    const read = toPlainSpot({ ...record, _id: 'mongo-id', __v: 0, timeBucket: 82 });
    expect(Object.keys(read ?? {})).not.toContain('_id');
    expect(Object.keys(read ?? {})).not.toContain('timeBucket');
  });

  it('reads a null document as undefined', () => {
    expect(toPlainSpot(null)).toEqual(undefined);
    expect(toPlainSpot(undefined)).toEqual(undefined);
  });

  it('refuses a row missing what makes a spot a spot', () => {
    const { spotterId, ...noSpotter } = record;
    expect(toPlainSpot(noSpotter)).toEqual(undefined);
    expect(toPlainSpot({ ...record, icao: '' })).toEqual(undefined);
  });

  it('refuses a timestamp that would sort randomly through the feed', () => {
    expect(toPlainSpot({ ...record, spottedAt: 'the other day' })).toEqual(undefined);
    expect(toPlainSpot({ ...record, spottedAt: 1789660800000 })).toEqual(undefined);
  });

  it('refuses a position that is not a position', () => {
    expect(toPlainSpot({ ...record, lat: 'north' })).toEqual(undefined);
    expect(toPlainSpot({ ...record, altitude: null })).toEqual(undefined);
  });

  it('falls back to the address when the callsign is gone', () => {
    expect(toPlainSpot({ ...record, callsign: '' })?.callsign).toEqual('A1B2C3');
  });

  it('leaves an unset optional absent rather than undefined', () => {
    const { note, aircraftType, ...bare } = record;
    expect(Object.keys(toPlainSpot(bare) ?? {})).not.toContain('note');
    expect(Object.keys(toPlainSpot(bare) ?? {})).not.toContain('aircraftType');
  });

  it('reads a score that has rotted as an honest "we do not know", never as NaN', () => {
    // A NaN here renders as a blank where a number should be and reads to the
    // user as a broken browser rather than as missing data.
    const read = toPlainSpot({ ...record, rarity: { score: 'lots', band: 'legendary' } });
    expect(read?.rarity).toEqual({ score: 0, band: 'unknown', confidence: 'none', observed: 0, frequency: 0, sampleSize: 0 });
  });

  it('survives a row written before rarity was stored at all', () => {
    const { rarity, ...old } = record;
    expect(toPlainSpot(old)?.rarity.band).toEqual('unknown');
  });
});

describe('isDuplicateKey', () => {
  it('knows the two codes Mongo uses for it', () => {
    expect(isDuplicateKey({ code: 11000 })).toEqual(true);
    expect(isDuplicateKey({ code: 11001 })).toEqual(true);
  });

  it('is not fooled by anything else', () => {
    expect(isDuplicateKey(new Error('timeout'))).toEqual(false);
    expect(isDuplicateKey({ code: 'ECONNRESET' })).toEqual(false);
    expect(isDuplicateKey(undefined)).toEqual(false);
    expect(isDuplicateKey(null)).toEqual(false);
  });
});
