import { authFailure, type AuthProvider, type CurrentUserResult } from '@luvktest/test.auth-provider';
import type { AppLike, RouteHandler, RouteRequest, RouteResponse } from '@luvktest/test.auth-routes';
import { MAX_RADIUS_KM, WatchArea, type PlainWatchArea } from '@luvktest/test.watch-area';
import { registerAreaRoutes, type AreaAppLike } from './area-routes.js';
import type { AreaStore } from './area-store.js';

const pilot = { id: 'u1', email: 'pilot@skyline.test', name: 'Pilot', emailConfirmed: true };
const other = { id: 'u2', email: 'nadia@skyline.test', name: 'Nadia', emailConfirmed: true };

type Reply = { status: number; body: any; headers: Record<string, string> };

/** the smallest thing that behaves like an Express app, with the two verbs editing needs. */
function fakeApp() {
  const routes = new Map<string, RouteHandler[]>();
  const record = (key: string, handlers: RouteHandler[]) => {
    routes.set(key, handlers);
    return app;
  };
  const app: AreaAppLike = {
    get: (path, ...handlers) => record(`GET ${path}`, handlers),
    post: (path, ...handlers) => record(`POST ${path}`, handlers),
    patch: (path, ...handlers) => record(`PATCH ${path}`, handlers),
    delete: (path, ...handlers) => record(`DELETE ${path}`, handlers),
  } as AreaAppLike & AppLike;

  async function request(
    key: string,
    options: { token?: string; body?: unknown; params?: Record<string, string> } = {}
  ): Promise<Reply> {
    const handlers = routes.get(key);
    if (!handlers) throw new Error(`no route registered for ${key}`);
    const req: RouteRequest = {
      headers: options.token ? { authorization: `Bearer ${options.token}` } : {},
      body: options.body,
      params: options.params,
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

  return { app, request };
}

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

/** an in-memory store that answers `candidatesFor` with the same `$or` the Mongo one does. */
function memoryStore(seed: PlainWatchArea[] = []) {
  const rows = new Map<string, PlainWatchArea>(seed.map((a) => [a.id, a]));
  const store: AreaStore = {
    async candidatesFor(userId) {
      return [...rows.values()].filter((a) => a.ownerId === userId || a.visibility === 'shared');
    },
    async findById(id) {
      return rows.get(id);
    },
    async insert(area) {
      rows.set(area.id, area);
    },
    async replace(area) {
      if (!rows.has(area.id)) return false;
      rows.set(area.id, area);
      return true;
    },
    async remove(id) {
      return rows.delete(id);
    },
  };
  return { store, rows };
}

const area = (over: Partial<PlainWatchArea> = {}): PlainWatchArea => ({
  id: 'a1',
  ownerId: 'u1',
  name: 'Heathrow approach',
  lat: 51.47,
  lon: -0.45,
  radiusKm: 25,
  visibility: 'private',
  createdAt: '2026-09-01T09:00:00.000Z',
  ...over,
});

function harness(seed: PlainWatchArea[] = [], ids: string[] = ['new-1', 'new-2', 'new-3']) {
  const areas = memoryStore(seed);
  const app = fakeApp();
  const queue = [...ids];
  registerAreaRoutes(app.app, {
    auth: provider(),
    areas: areas.store,
    newId: () => queue.shift() ?? 'exhausted',
  });
  return { ...app, areas };
}

const NEW_AREA = { name: 'Heathrow approach', lat: 51.47, lon: -0.45, radiusKm: 25 };

describe('GET /me/areas', () => {
  it('serves the caller their own areas', async () => {
    const { request } = harness([area(), area({ id: 'a2', name: 'Home' })]);
    const reply = await request('GET /me/areas', { token: 'token-u1' });

    expect(reply.status).toEqual(200);
    expect(reply.body.areas.map((a: PlainWatchArea) => a.id).sort()).toEqual(['a1', 'a2']);
  });

  it('does not serve somebody else’s private area', async () => {
    const { request } = harness([area()]);
    const reply = await request('GET /me/areas', { token: 'token-u2' });

    expect(reply.body.areas).toEqual([]);
  });

  it('serves a shared area to anyone, because that is what shared means', async () => {
    const { request } = harness([area({ visibility: 'shared' }), area({ id: 'a2', visibility: 'private' })]);
    const reply = await request('GET /me/areas', { token: 'token-u2' });

    expect(reply.body.areas.map((a: PlainWatchArea) => a.id)).toEqual(['a1']);
  });

  it('applies the entity’s own rule and not just the store’s query', async () => {
    // A store that over-answers — the shape a broken index or a future third
    // visibility would produce — must not turn into a leak.
    const areas = memoryStore([area()]);
    areas.store.candidatesFor = async () => [area(), area({ id: 'a2', ownerId: 'u3' })];
    const app = fakeApp();
    registerAreaRoutes(app.app, { auth: provider(), areas: areas.store });

    const reply = await app.request('GET /me/areas', { token: 'token-u2' });
    expect(reply.body.areas).toEqual([]);
  });

  it('drops a row that no longer parses rather than losing the whole list', async () => {
    const { request } = harness([area(), area({ id: 'a2', name: '' })]);
    const reply = await request('GET /me/areas', { token: 'token-u1' });

    expect(reply.body.areas.map((a: PlainWatchArea) => a.id)).toEqual(['a1']);
  });

  it('needs a token', async () => {
    const { request } = harness([area()]);
    expect((await request('GET /me/areas')).status).toEqual(401);
  });
});

describe('POST /me/areas', () => {
  it('creates an area owned by the token’s user', async () => {
    const { request, areas } = harness();
    const reply = await request('POST /me/areas', { token: 'token-u1', body: NEW_AREA });

    expect(reply.status).toEqual(201);
    expect(reply.body.area.id).toEqual('new-1');
    expect(reply.body.area.ownerId).toEqual('u1');
    expect(reply.body.area.visibility).toEqual('private');
    expect(areas.rows.get('new-1')?.ownerId).toEqual('u1');
  });

  it('ignores an owner in the body — the token decides', async () => {
    const { request } = harness();
    const reply = await request('POST /me/areas', { token: 'token-u1', body: { ...NEW_AREA, ownerId: 'u2', id: 'chosen' } });

    expect(reply.body.area.ownerId).toEqual('u1');
    expect(reply.body.area.id).toEqual('new-1');
  });

  it('folds a longitude a drag across the date line produced', async () => {
    const { request } = harness();
    const reply = await request('POST /me/areas', { token: 'token-u1', body: { ...NEW_AREA, lon: 190 } });

    expect(reply.status).toEqual(201);
    expect(reply.body.area.lon).toEqual(-170);
  });

  it('clamps a radius bigger than the planet instead of refusing it', async () => {
    const { request } = harness();
    const reply = await request('POST /me/areas', { token: 'token-u1', body: { ...NEW_AREA, radiusKm: 99_999 } });

    expect(reply.status).toEqual(201);
    expect(reply.body.area.radiusKm).toEqual(MAX_RADIUS_KM);
  });

  it('turns the constructor’s RangeError into a 400 that says what was wrong', async () => {
    const { request, areas } = harness();
    const nameless = await request('POST /me/areas', { token: 'token-u1', body: { ...NEW_AREA, name: '  ' } });

    expect(nameless.status).toEqual(400);
    expect(nameless.body.code).toEqual('bad-request');
    expect(nameless.body.error).toContain('name');
    expect(areas.rows.size).toEqual(0);
  });

  it('refuses a latitude past the pole, which is a different point and not the same one', async () => {
    const { request } = harness();
    const reply = await request('POST /me/areas', { token: 'token-u1', body: { ...NEW_AREA, lat: 91 } });
    expect(reply.status).toEqual(400);
  });

  it('refuses a radius of zero', async () => {
    const { request } = harness();
    expect((await request('POST /me/areas', { token: 'token-u1', body: { ...NEW_AREA, radiusKm: 0 } })).status).toEqual(400);
  });

  it('refuses a number it cannot read rather than inventing 0°N 0°E', async () => {
    const { request } = harness();
    const reply = await request('POST /me/areas', { token: 'token-u1', body: { ...NEW_AREA, lat: 'somewhere nice' } });
    expect(reply.status).toEqual(400);
  });

  it('reads numbers that arrived as strings, as a form sends them', async () => {
    const { request } = harness();
    const reply = await request('POST /me/areas', { token: 'token-u1', body: { ...NEW_AREA, lat: '51.47', radiusKm: '25' } });

    expect(reply.status).toEqual(201);
    expect(reply.body.area.lat).toEqual(51.47);
  });

  it('takes a visibility it recognises and refuses one it does not', async () => {
    const { request } = harness();
    const shared = await request('POST /me/areas', { token: 'token-u1', body: { ...NEW_AREA, visibility: 'shared' } });
    expect(shared.body.area.visibility).toEqual('shared');

    const nonsense = await request('POST /me/areas', { token: 'token-u1', body: { ...NEW_AREA, visibility: 'public' } });
    expect(nonsense.status).toEqual(400);
    expect(nonsense.body.code).toEqual('bad-request');
  });

  it('needs a token', async () => {
    const { request, areas } = harness();
    expect((await request('POST /me/areas', { body: NEW_AREA })).status).toEqual(401);
    expect(areas.rows.size).toEqual(0);
  });
});

describe('PATCH /me/areas/:id', () => {
  it('renames, resizes and re-shares in one request', async () => {
    const { request, areas } = harness([area()]);
    const reply = await request('PATCH /me/areas/:id', {
      token: 'token-u1',
      params: { id: 'a1' },
      body: { name: 'LHR 27R', radiusKm: 40, visibility: 'shared' },
    });

    expect(reply.status).toEqual(200);
    expect(reply.body.area).toMatchObject({ id: 'a1', ownerId: 'u1', name: 'LHR 27R', radiusKm: 40, visibility: 'shared', createdAt: '2026-09-01T09:00:00.000Z' });
    // the centre is untouched by a patch that did not mention it — give or take
    // the hair of drift `normaliseLon` leaves behind on a negative longitude
    expect(reply.body.area.lat).toEqual(51.47);
    expect(reply.body.area.lon).toBeCloseTo(-0.45, 9);
    expect(areas.rows.get('a1')?.name).toEqual('LHR 27R');
  });

  it('leaves alone what the patch did not mention', async () => {
    const { request } = harness([area()]);
    const reply = await request('PATCH /me/areas/:id', { token: 'token-u1', params: { id: 'a1' }, body: { radiusKm: 40 } });

    expect(reply.body.area.name).toEqual('Heathrow approach');
    expect(reply.body.area.visibility).toEqual('private');
  });

  it('re-runs the constructor, so a patch cannot reach a state create would refuse', async () => {
    const { request, areas } = harness([area()]);
    const reply = await request('PATCH /me/areas/:id', { token: 'token-u1', params: { id: 'a1' }, body: { name: '' } });

    expect(reply.status).toEqual(400);
    expect(reply.body.code).toEqual('bad-request');
    expect(areas.rows.get('a1')?.name).toEqual('Heathrow approach');
  });

  it('refuses a visibility it does not recognise', async () => {
    const { request } = harness([area()]);
    const reply = await request('PATCH /me/areas/:id', { token: 'token-u1', params: { id: 'a1' }, body: { visibility: 'everyone' } });
    expect(reply.status).toEqual(400);
  });

  it('needs a token', async () => {
    const { request } = harness([area()]);
    expect((await request('PATCH /me/areas/:id', { params: { id: 'a1' }, body: { name: 'x' } })).status).toEqual(401);
  });
});

describe('DELETE /me/areas/:id', () => {
  it('removes the caller’s own area', async () => {
    const { request, areas } = harness([area()]);
    const reply = await request('DELETE /me/areas/:id', { token: 'token-u1', params: { id: 'a1' } });

    expect(reply.status).toEqual(200);
    expect(reply.body).toEqual({ ok: true });
    expect(areas.rows.has('a1')).toEqual(false);
  });

  it('needs a token', async () => {
    const { request, areas } = harness([area()]);
    expect((await request('DELETE /me/areas/:id', { params: { id: 'a1' } })).status).toEqual(401);
    expect(areas.rows.has('a1')).toEqual(true);
  });
});

/**
 * The half of this component that is not about watch areas at all.
 *
 * Authentication says who is calling. These say whether they may touch the
 * thing they named — and the two being conflated is the bug worth a suite of
 * its own: a route that trusted the id in its path was authenticated, and
 * still let anyone edit anyone's data.
 */
describe('a second user', () => {
  it('cannot read another user’s private area', async () => {
    const { request } = harness([area()]);
    const reply = await request('GET /me/areas', { token: 'token-u2' });
    expect(reply.body.areas).toEqual([]);
  });

  it('cannot patch another user’s area, and does not change it by trying', async () => {
    const { request, areas } = harness([area()]);
    const reply = await request('PATCH /me/areas/:id', { token: 'token-u2', params: { id: 'a1' }, body: { name: 'mine now' } });

    expect(reply.status).toEqual(403);
    expect(reply.body.code).toEqual('forbidden');
    expect(areas.rows.get('a1')?.name).toEqual('Heathrow approach');
    expect(areas.rows.get('a1')?.ownerId).toEqual('u1');
  });

  it('cannot delete another user’s area', async () => {
    const { request, areas } = harness([area()]);
    const reply = await request('DELETE /me/areas/:id', { token: 'token-u2', params: { id: 'a1' } });

    expect(reply.status).toEqual(403);
    expect(reply.body.code).toEqual('forbidden');
    expect(areas.rows.has('a1')).toEqual(true);
  });

  it('cannot edit a shared area either — shared is readable, not writable', async () => {
    const { request, areas } = harness([area({ visibility: 'shared' })]);
    const readable = await request('GET /me/areas', { token: 'token-u2' });
    expect(readable.body.areas.length).toEqual(1);

    expect((await request('PATCH /me/areas/:id', { token: 'token-u2', params: { id: 'a1' }, body: { radiusKm: 5000 } })).status).toEqual(403);
    expect((await request('DELETE /me/areas/:id', { token: 'token-u2', params: { id: 'a1' } })).status).toEqual(403);
    expect(areas.rows.get('a1')?.radiusKm).toEqual(25);
  });

  it('gets the same 403 for an id that does not exist, so the route is not an oracle', async () => {
    const { request } = harness([area()]);
    const missing = await request('DELETE /me/areas/:id', { token: 'token-u2', params: { id: 'no-such-area' } });
    const theirs = await request('DELETE /me/areas/:id', { token: 'token-u2', params: { id: 'a1' } });

    expect(missing.status).toEqual(403);
    expect(missing.body).toEqual(theirs.body);
  });

  it('cannot reach another user’s area by naming it in the body', async () => {
    const { request, areas } = harness([area()]);
    const reply = await request('PATCH /me/areas/:id', {
      token: 'token-u2',
      params: { id: 'no-such-area' },
      body: { id: 'a1', ownerId: 'u2', name: 'mine now' },
    });

    expect(reply.status).toEqual(403);
    expect(areas.rows.get('a1')?.name).toEqual('Heathrow approach');
  });
});

describe('when the store breaks', () => {
  it('answers 500 rather than hanging', async () => {
    const areas = memoryStore();
    areas.store.insert = async () => {
      throw new Error('mongo is on fire');
    };
    const app = fakeApp();
    registerAreaRoutes(app.app, { auth: provider(), areas: areas.store, newId: () => 'new-1' });

    const reply = await app.request('POST /me/areas', { token: 'token-u1', body: NEW_AREA });
    expect(reply.status).toEqual(500);
    expect(reply.body).toEqual({ error: 'mongo is on fire', code: 'unavailable' });
  });

  it('does not report a patch as applied when the row vanished under it', async () => {
    const areas = memoryStore([area()]);
    areas.store.replace = async () => false;
    const app = fakeApp();
    registerAreaRoutes(app.app, { auth: provider(), areas: areas.store });

    const reply = await app.request('PATCH /me/areas/:id', { token: 'token-u1', params: { id: 'a1' }, body: { name: 'LHR' } });
    expect(reply.status).toEqual(403);
  });
});

describe('the areas it hands back', () => {
  it('are rows the entity accepts, so the client can rebuild them', async () => {
    const { request } = harness();
    const created = await request('POST /me/areas', { token: 'token-u1', body: { ...NEW_AREA, lon: 190 } });
    const rebuilt = WatchArea.from(created.body.area);

    expect(rebuilt.contains(51.47, -170)).toEqual(true);
    expect(rebuilt.toObject()).toEqual(created.body.area);
  });
});
