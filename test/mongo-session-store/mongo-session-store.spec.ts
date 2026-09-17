import type { PlainSession } from '@luvktest/test.session';
import { MongoSessionStore } from './mongo-session-store.js';
import { toPlainSession } from './session-document.js';

const record: PlainSession = {
  id: 's1',
  userId: 'u1',
  familyId: 'f1',
  accessTokenHash: 'a',
  refreshTokenHash: 'r',
  generation: 0,
  issuedAt: '2026-09-17T12:00:00.000Z',
  accessExpiresAt: '2026-09-17T12:15:00.000Z',
  refreshExpiresAt: '2026-10-01T12:00:00.000Z',
  absoluteExpiresAt: '2026-12-16T12:00:00.000Z',
};

type Call = { op: string; filter: unknown; update?: unknown };

/**
 * A stand-in for a mongoose model that records what it was asked.
 *
 * The queries are the part of this component worth asserting — in particular
 * that rotation is a conditional update rather than a read followed by a
 * write. The behaviour those queries produce is covered by the session-manager
 * spec against `MemorySessionStore`; what cannot be covered without a live
 * database is that Mongo honours them, which is why the filters are pinned here.
 */
function fakeModel(found: unknown = null, modified = 1) {
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

/** the fake is structurally a model for the four methods the store uses. */
function storeOver(model: ReturnType<typeof fakeModel>): MongoSessionStore {
  return new MongoSessionStore(model as never);
}

describe('lookups', () => {
  it('finds by access fingerprint on an indexed equality, not a scan', async () => {
    const model = fakeModel(record);
    const found = await storeOver(model).findByAccessTokenHash('a');
    expect(model.calls[0]).toEqual({ op: 'findOne', filter: { accessTokenHash: 'a' } });
    expect(found).toEqual(record);
  });

  it('finds by refresh fingerprint', async () => {
    const model = fakeModel(record);
    await storeOver(model).findByRefreshTokenHash('r');
    expect(model.calls[0]).toEqual({ op: 'findOne', filter: { refreshTokenHash: 'r' } });
  });

  it('reads a miss as undefined rather than null', async () => {
    expect(await storeOver(fakeModel(null)).findByAccessTokenHash('nope')).toEqual(undefined);
  });
});

describe('rotation', () => {
  it('spends a token with a conditional update, so two callers cannot both win', async () => {
    const model = fakeModel(null, 1);
    const won = await storeOver(model).markRotated('s1', '2026-09-17T12:20:00.000Z');
    expect(won).toEqual(true);
    expect(model.calls[0]).toEqual({
      op: 'updateOne',
      filter: { id: 's1', rotatedAt: { $exists: false } },
      update: { $set: { rotatedAt: '2026-09-17T12:20:00.000Z' } },
    });
  });

  it('reports a loss when the document was already spent', async () => {
    const model = fakeModel(null, 0);
    expect(await storeOver(model).markRotated('s1', 'now')).toEqual(false);
  });
});

describe('revocation', () => {
  it('kills a whole family and skips the already-dead', async () => {
    const model = fakeModel(null, 3);
    const killed = await storeOver(model).revokeFamily('f1', 'now', 'token-reuse');
    expect(killed).toEqual(3);
    expect(model.calls[0]).toEqual({
      op: 'updateMany',
      filter: { familyId: 'f1', revokedAt: { $exists: false } },
      update: { $set: { revokedAt: 'now', revokedReason: 'token-reuse' } },
    });
  });

  it('kills every family a user has', async () => {
    const model = fakeModel(null, 2);
    await storeOver(model).revokeAllForUser('u1', 'now', 'logout-all');
    expect(model.calls[0]?.filter).toEqual({ userId: 'u1', revokedAt: { $exists: false } });
  });

  it('purges only records past their ceiling', async () => {
    const model = fakeModel(null, 4);
    expect(await storeOver(model).deleteExpiredBefore('2026-09-17T12:00:00.000Z')).toEqual(4);
    expect(model.calls[0]).toEqual({
      op: 'deleteMany',
      filter: { absoluteExpiresAt: { $lt: '2026-09-17T12:00:00.000Z' } },
    });
  });
});

describe('reading documents back', () => {
  it('round-trips a full record', () => {
    const full = { ...record, rotatedAt: 'x', revokedAt: 'y', revokedReason: 'logout' as const };
    expect(toPlainSession({ ...full, _id: 'mongo-id', __v: 0 })).toEqual(full);
  });

  it('drops mongo bookkeeping fields', () => {
    const plain = toPlainSession({ ...record, _id: 'mongo-id', __v: 0 });
    expect(Object.keys(plain ?? {})).not.toContain('_id');
  });

  it('reads a null document as undefined', () => {
    expect(toPlainSession(null)).toEqual(undefined);
  });

  it('refuses a row missing the fields that make a session a session', () => {
    const { refreshTokenHash, ...broken } = record;
    expect(toPlainSession(broken)).toEqual(undefined);
  });

  it('refuses a row whose timestamps were replaced with something non-string', () => {
    expect(toPlainSession({ ...record, accessExpiresAt: 99 })).toEqual(undefined);
  });

  it('ignores a revocation reason it does not recognise', () => {
    const read = toPlainSession({ ...record, revokedAt: 'y', revokedReason: 'whatever' });
    expect(read?.revokedReason).toEqual(undefined);
  });

  it('leaves an unset optional absent rather than undefined', () => {
    expect(Object.keys(toPlainSession(record) ?? {})).not.toContain('rotatedAt');
  });
});
