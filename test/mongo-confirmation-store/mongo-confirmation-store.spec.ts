import type { PlainConfirmation } from '@luvktest/test.email-confirmation';
import { MongoConfirmationStore } from './mongo-confirmation-store.js';
import { toPlainConfirmation } from './confirmation-document.js';

const record: PlainConfirmation = {
  id: 'c1',
  userId: 'u1',
  email: 'pilot@skyline.test',
  tokenHash: 'hash',
  issuedAt: '2026-09-17T12:00:00.000Z',
  expiresAt: '2026-09-18T12:00:00.000Z',
};

type Call = { op: string; filter: unknown; update?: unknown };

/** a stand-in model that records the queries it is asked to run. */
function fakeModel(found: unknown = null, modified = 1, list: unknown[] = []) {
  const calls: Call[] = [];
  const model = {
    calls,
    async create(doc: unknown) {
      calls.push({ op: 'create', filter: doc });
      return doc;
    },
    findOne(filter: unknown) {
      calls.push({ op: 'findOne', filter });
      return { lean: async () => found };
    },
    find(filter: unknown) {
      calls.push({ op: 'find', filter });
      return { sort: () => ({ lean: async () => list }) };
    },
    async updateOne(filter: unknown, update: unknown) {
      calls.push({ op: 'updateOne', filter, update });
      return { modifiedCount: modified };
    },
    async updateMany(filter: unknown, update: unknown) {
      calls.push({ op: 'updateMany', filter, update });
      return { modifiedCount: modified };
    },
    async deleteMany(filter: unknown) {
      calls.push({ op: 'deleteMany', filter });
      return { deletedCount: modified };
    },
  };
  return model;
}

function storeOver(
  confirmations: ReturnType<typeof fakeModel>,
  attempts: ReturnType<typeof fakeModel> = fakeModel()
): MongoConfirmationStore {
  return new MongoConfirmationStore(confirmations as never, attempts as never);
}

describe('links', () => {
  it('finds one by fingerprint', async () => {
    const model = fakeModel(record);
    expect(await storeOver(model).findByTokenHash('hash')).toEqual(record);
    expect(model.calls[0]).toEqual({ op: 'findOne', filter: { tokenHash: 'hash' } });
  });

  it('spends one with a conditional update, so two clicks cannot both win', async () => {
    const model = fakeModel(null, 1);
    expect(await storeOver(model).markUsed('c1', 'now')).toEqual(true);
    expect(model.calls[0]).toEqual({
      op: 'updateOne',
      filter: { id: 'c1', usedAt: { $exists: false } },
      update: { $set: { usedAt: 'now' } },
    });
  });

  it('reports a loss when the link was already spent', async () => {
    expect(await storeOver(fakeModel(null, 0)).markUsed('c1', 'now')).toEqual(false);
  });

  it('retires only the outstanding links of one user', async () => {
    const model = fakeModel(null, 2);
    expect(await storeOver(model).expireAllForUser('u1', 'now')).toEqual(2);
    expect(model.calls[0]?.filter).toEqual({
      userId: 'u1',
      usedAt: { $exists: false },
      expiresAt: { $gt: 'now' },
    });
  });
});

describe('attempts', () => {
  it('records every attempt, then counts the window', async () => {
    const attempts = fakeModel(null, 1, [{ at: 'a1' }, { at: 'a2' }]);
    const window = await storeOver(fakeModel(), attempts).recordAttempt('key', 'a2', 'w0');

    expect(attempts.calls[0]).toEqual({ op: 'create', filter: { emailKey: 'key', at: 'a2' } });
    expect(attempts.calls[1]?.filter).toEqual({ emailKey: 'key', at: { $gte: 'w0' } });
    expect(window).toEqual({ count: 2, oldestAt: 'a1' });
  });

  it('falls back to the current attempt when the window reads back empty', async () => {
    const attempts = fakeModel(null, 1, []);
    expect(await storeOver(fakeModel(), attempts).recordAttempt('key', 'a1', 'w0')).toEqual({
      count: 0,
      oldestAt: 'a1',
    });
  });
});

describe('housekeeping', () => {
  it('drops expired links and old attempts together', async () => {
    const links = fakeModel(null, 3);
    const attempts = fakeModel(null, 5);
    expect(await storeOver(links, attempts).deleteExpiredBefore('now')).toEqual(3);
    expect(links.calls[0]?.filter).toEqual({ expiresAt: { $lt: 'now' } });
    expect(attempts.calls[0]?.filter).toEqual({ at: { $lt: 'now' } });
  });
});

describe('reading documents back', () => {
  it('round-trips, dropping mongo bookkeeping', () => {
    expect(toPlainConfirmation({ ...record, _id: 'x', __v: 0 })).toEqual(record);
  });

  it('keeps usedAt when it is there and omits it when it is not', () => {
    expect(toPlainConfirmation({ ...record, usedAt: 'y' })?.usedAt).toEqual('y');
    expect(Object.keys(toPlainConfirmation(record) ?? {})).not.toContain('usedAt');
  });

  it('reads a null or broken document as no document', () => {
    const { tokenHash, ...broken } = record;
    expect(toPlainConfirmation(null)).toEqual(undefined);
    expect(toPlainConfirmation(broken)).toEqual(undefined);
    expect(toPlainConfirmation({ ...record, expiresAt: 42 })).toEqual(undefined);
  });
});
