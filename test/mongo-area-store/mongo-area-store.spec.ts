import type { PlainWatchArea } from '@luvktest/test.watch-area';
import { MongoAreaStore } from './mongo-area-store.js';
import { toPlainArea } from './area-document.js';
import { AREA_MODEL_NAME, areaSchema } from './area-schema.js';

const record: PlainWatchArea = {
  id: 'a1',
  ownerId: 'u1',
  name: 'Heathrow approach',
  lat: 51.47,
  lon: -0.45,
  radiusKm: 25,
  visibility: 'private',
  createdAt: '2026-09-01T09:00:00.000Z',
};

type Call = { op: string; filter?: unknown; doc?: unknown; update?: unknown; sort?: unknown };

/** a stand-in for a mongoose model that records what it was asked. */
function fakeModel(found: unknown = null, list: unknown[] = [], outcome = 1) {
  const calls: Call[] = [];

  const cursor = (call: Call, result: unknown) => {
    const chain = {
      sort(sort: unknown) {
        call.sort = sort;
        return chain;
      },
      lean: async () => result,
    };
    return chain;
  };

  const model = {
    calls,
    async create(doc: unknown) {
      calls.push({ op: 'create', doc });
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
    async updateOne(filter: unknown, update: unknown) {
      calls.push({ op: 'updateOne', filter, update });
      return { matchedCount: outcome, modifiedCount: outcome };
    },
    async deleteOne(filter: unknown) {
      calls.push({ op: 'deleteOne', filter });
      return { deletedCount: outcome };
    },
    async createIndexes() {
      calls.push({ op: 'createIndexes' });
    },
  };
  return model;
}

function storeOver(model: ReturnType<typeof fakeModel>): MongoAreaStore {
  return new MongoAreaStore(model as never);
}

describe('the collection', () => {
  it('indexes the one read it serves', () => {
    const fields = areaSchema.indexes().map(([f]: any[]) => f);
    expect(fields).toContainEqual({ ownerId: 1, createdAt: -1 });
    expect(fields).toContainEqual({ visibility: 1 });
  });

  it('names a model, so a second import does not register it twice', () => {
    expect(AREA_MODEL_NAME).toEqual('WatchArea');
  });
});

describe('candidatesFor', () => {
  it('asks the database to narrow to mine-plus-shared, rather than reading the world', async () => {
    const model = fakeModel(null, [record]);
    const rows = await storeOver(model).candidatesFor('u1');

    expect(model.calls[0]).toEqual({
      op: 'find',
      filter: { $or: [{ ownerId: 'u1' }, { visibility: 'shared' }] },
      sort: { createdAt: -1 },
    });
    expect(rows).toEqual([record]);
  });

  it('drops a corrupt row rather than the whole list', async () => {
    const model = fakeModel(null, [record, { id: 'broken' }, { ...record, id: 'a2' }]);
    const rows = await storeOver(model).candidatesFor('u1');
    expect(rows.map((a) => a.id)).toEqual(['a1', 'a2']);
  });

  it('answers an empty list, not null, when a user has nothing', async () => {
    expect(await storeOver(fakeModel(null, [])).candidatesFor('u9')).toEqual([]);
  });
});

describe('the single-row operations', () => {
  it('finds by id on the unique key', async () => {
    const model = fakeModel(record);
    expect(await storeOver(model).findById('a1')).toEqual(record);
    expect(model.calls[0]).toEqual({ op: 'findOne', filter: { id: 'a1' } });
  });

  it('reads a miss as undefined rather than null', async () => {
    expect(await storeOver(fakeModel(null)).findById('nope')).toEqual(undefined);
  });

  it('writes a new area as the entity handed it over', async () => {
    const model = fakeModel();
    await storeOver(model).insert(record);
    expect(model.calls[0]).toEqual({ op: 'create', doc: record });
  });

  it('replaces the whole entity, not the fields a patch happened to name', async () => {
    const model = fakeModel();
    expect(await storeOver(model).replace({ ...record, name: 'LHR' })).toEqual(true);
    expect(model.calls[0]).toEqual({
      op: 'updateOne',
      filter: { id: 'a1' },
      update: { $set: { ...record, name: 'LHR' } },
    });
  });

  it('reports a replace that matched nothing, so a vanished row is not reported as saved', async () => {
    expect(await storeOver(fakeModel(null, [], 0)).replace(record)).toEqual(false);
  });

  it('removes by id and says whether there was anything there', async () => {
    const model = fakeModel();
    expect(await storeOver(model).remove('a1')).toEqual(true);
    expect(model.calls[0]).toEqual({ op: 'deleteOne', filter: { id: 'a1' } });
    expect(await storeOver(fakeModel(null, [], 0)).remove('a1')).toEqual(false);
  });

  it('builds its indexes on request', async () => {
    const model = fakeModel();
    await storeOver(model).ensureIndexes();
    expect(model.calls[0]).toEqual({ op: 'createIndexes' });
  });
});

describe('reading documents back', () => {
  it('round-trips a full record', () => {
    expect(toPlainArea({ ...record, _id: 'mongo-id', __v: 0 })).toEqual(record);
  });

  it('drops mongo bookkeeping fields', () => {
    expect(Object.keys(toPlainArea({ ...record, _id: 'mongo-id' }) ?? {})).not.toContain('_id');
  });

  it('reads a null document as undefined', () => {
    expect(toPlainArea(null)).toEqual(undefined);
    expect(toPlainArea(undefined)).toEqual(undefined);
  });

  it('refuses a row missing what makes an area an area', () => {
    const { ownerId, ...unowned } = record;
    expect(toPlainArea(unowned)).toEqual(undefined);
    expect(toPlainArea({ ...record, name: '' })).toEqual(undefined);
    expect(toPlainArea({ ...record, radiusKm: 'big' })).toEqual(undefined);
  });

  it('fails closed on a visibility it does not recognise', () => {
    // A typo in a database must not publish somebody's home.
    expect(toPlainArea({ ...record, visibility: 'public' })?.visibility).toEqual('private');
    expect(toPlainArea({ ...record, visibility: undefined })?.visibility).toEqual('private');
    expect(toPlainArea({ ...record, visibility: 'shared' })?.visibility).toEqual('shared');
  });
});
