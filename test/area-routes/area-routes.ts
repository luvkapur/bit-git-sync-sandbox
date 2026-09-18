import { randomUUID } from 'node:crypto';
import type { AuthProvider } from '@luvktest/test.auth-provider';
import { authOf, requireAuth } from '@luvktest/test.auth-middleware';
import { stringField, type AppLike, type RouteHandler, type RouteRequest, type RouteResponse } from '@luvktest/test.auth-routes';
import { WatchArea, areasVisibleTo, type PlainWatchArea, type Visibility } from '@luvktest/test.watch-area';
import type { AreaStore } from './area-store.js';

/**
 * Express's app, with the two verbs editing needs.
 *
 * `AppLike` covers `get` and `post`, which is everything the auth routes
 * register. An area is a resource a user owns and edits in place, so these
 * routes also need `patch` and `delete` — and structurally, not as
 * `express.Application`, for the same reason as everywhere else here: the spec
 * drives them with an object literal.
 */
export type AreaAppLike = AppLike & {
  patch(path: string, ...handlers: RouteHandler[]): unknown;
  delete(path: string, ...handlers: RouteHandler[]): unknown;
};

export type AreaRoutesDeps = {
  auth: AuthProvider;
  areas: AreaStore;
  /** ids for new areas. Injectable so a spec gets a stable one. */
  newId?: () => string;
};

const VISIBILITIES: Visibility[] = ['private', 'shared'];

function guarded(handler: (req: RouteRequest, res: RouteResponse) => Promise<void>) {
  return async (req: RouteRequest, res: RouteResponse): Promise<void> => {
    try {
      await handler(req, res);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'something went wrong';
      res.status(500).json({ error: message, code: 'unavailable' });
    }
  };
}

/** a raw field off an unknown body, so "absent" and "empty" stay different things. */
function field(body: unknown, name: string): unknown {
  if (typeof body !== 'object' || body === null) return undefined;
  return (body as Record<string, unknown>)[name];
}

/**
 * A number out of an untrusted body, without inventing one.
 *
 * Anything unreadable comes back as NaN rather than 0, so it reaches
 * `WatchArea`'s constructor and is refused there with a message that names the
 * field — instead of being silently rounded into a legal area at 0°N 0°E.
 */
function numberField(body: unknown, name: string): number {
  const value = field(body, name);
  return typeof value === 'number' ? value : Number(typeof value === 'string' && value.trim() ? value : NaN);
}

/**
 * Mount the watch-area routes. Every one of them requires a token.
 *
 * The two rules worth naming. Reading is `areasVisibleTo`, which is the
 * entity's own rule and covers the shared case the store's query is an
 * optimisation of. Writing is stricter and is not the same rule: a shared area
 * is readable by anyone and editable by nobody but its owner, so `PATCH` and
 * `DELETE` check `ownerId` against the token and answer 403 otherwise — and
 * answer 403 for an area that does not exist too, so the endpoint cannot be
 * used to ask whether an id is real.
 *
 * @example
 * registerAreaRoutes(app, { auth, areas: store });
 */
export function registerAreaRoutes(app: AreaAppLike, deps: AreaRoutesDeps): void {
  const { auth, areas } = deps;
  const newId = deps.newId ?? (() => randomUUID());
  const authed = requireAuth(auth);

  const callerId = (req: RouteRequest): string => authOf(req)?.user.id ?? '';

  /** A `RangeError` out of the entity is the client's fault and says why. */
  const badRequest = (res: RouteResponse, e: unknown): void => {
    if (!(e instanceof RangeError)) throw e;
    res.status(400).json({ error: e.message, code: 'bad-request' });
  };

  /**
   * Load an area the caller is allowed to change, or answer and return
   * undefined.
   *
   * Authentication says who is calling; this says whether they may touch the
   * thing they named — the same separation `requireSelf` makes for accounts,
   * which is the bug worth never writing twice.
   */
  const ownedBy = async (req: RouteRequest, res: RouteResponse): Promise<WatchArea | undefined> => {
    const row = await areas.findById(String(req.params?.id ?? ''));
    if (!row || row.ownerId !== callerId(req)) {
      res.status(403).json({ error: 'that is not your watch area', code: 'forbidden' });
      return undefined;
    }
    try {
      return WatchArea.from(row);
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'that area no longer parses', code: 'unavailable' });
      return undefined;
    }
  };

  app.get(
    '/me/areas',
    authed,
    guarded(async (req, res) => {
      const caller = callerId(req);
      const visible = areasVisibleTo(hydrate(await areas.candidatesFor(caller)), caller);
      res.status(200).json({ areas: visible.map((a) => a.toObject()) });
    })
  );

  app.post(
    '/me/areas',
    authed,
    guarded(async (req, res) => {
      const visibility = field(req.body, 'visibility');
      if (visibility !== undefined && !VISIBILITIES.includes(visibility as Visibility)) {
        res.status(400).json({ error: `visibility must be private or shared, got ${String(visibility)}`, code: 'bad-request' });
        return;
      }

      let area: WatchArea;
      try {
        // Built through `create`, never assembled by hand: it is the thing that
        // folds the longitude a drag across the date line produces, clamps a
        // radius bigger than the planet, and refuses a nameless area.
        area = WatchArea.create({
          id: newId(),
          ownerId: callerId(req),
          name: stringField(req.body, 'name'),
          centre: { lat: numberField(req.body, 'lat'), lon: numberField(req.body, 'lon') },
          radiusKm: numberField(req.body, 'radiusKm'),
          visibility: visibility as Visibility,
        });
      } catch (e) {
        badRequest(res, e);
        return;
      }

      await areas.insert(area.toObject());
      res.status(201).json({ area: area.toObject() });
    })
  );

  app.patch(
    '/me/areas/:id',
    authed,
    guarded(async (req, res) => {
      const current = await ownedBy(req, res);
      if (!current) return;

      const name = field(req.body, 'name');
      const radiusKm = field(req.body, 'radiusKm');
      const visibility = field(req.body, 'visibility');
      if (visibility !== undefined && !VISIBILITIES.includes(visibility as Visibility)) {
        res.status(400).json({ error: `visibility must be private or shared, got ${String(visibility)}`, code: 'bad-request' });
        return;
      }

      let next = current;
      try {
        // Each edit returns a fresh entity and re-runs the constructor, so a
        // patch cannot put an area into a state `create` would have refused.
        if (name !== undefined) next = next.rename(stringField(req.body, 'name'));
        if (radiusKm !== undefined) next = next.resize(numberField(req.body, 'radiusKm'));
        if (visibility !== undefined) next = next.withVisibility(visibility as Visibility);
      } catch (e) {
        badRequest(res, e);
        return;
      }

      // The ownership check already passed, and `replace` matches on id alone;
      // the id came out of the row we just read, so it cannot be steered.
      const replaced = await areas.replace(next.toObject());
      if (!replaced) {
        res.status(403).json({ error: 'that is not your watch area', code: 'forbidden' });
        return;
      }
      res.status(200).json({ area: next.toObject() });
    })
  );

  app.delete(
    '/me/areas/:id',
    authed,
    guarded(async (req, res) => {
      const current = await ownedBy(req, res);
      if (!current) return;
      await areas.remove(current.id);
      res.status(200).json({ ok: true });
    })
  );
}

/** Drop the rows the entity refuses rather than losing the whole list to one of them. */
function hydrate(rows: readonly PlainWatchArea[]): WatchArea[] {
  const out: WatchArea[] = [];
  for (const row of rows) {
    try {
      out.push(WatchArea.from(row));
    } catch {
      /* a stored area that no longer parses is not worth a blank screen */
    }
  }
  return out;
}
