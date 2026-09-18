import type { AuthProvider } from '@luvktest/test.auth-provider';
import { authOf, requireAuth } from '@luvktest/test.auth-middleware';
import { stringField, type AppLike, type RouteRequest, type RouteResponse } from '@luvktest/test.auth-routes';
import {
  DEFAULT_COOLDOWN_MS,
  DEFAULT_LIMIT,
  FeedSnapshot,
  RarityIndex,
  Spot,
  SpotLog,
  recentSpots,
  spotsBySpotter,
  spotsSince,
  spotAccepted,
  spotRejected,
  type RarityBand,
  type Confidence,
  type PlainSpot,
  type SpotRejectionReason,
} from '@luvktest/test.spot';
import type { SpotStore } from './spot-store.js';
import { timeBucketOf } from './spot-store.js';
import { toWireSpots, type SpotterDirectory } from './wire-spot.js';

/**
 * The live sky, as the spotting routes need it.
 *
 * Both halves are deliberately the server's own: the snapshot is what decides
 * whether an aircraft is up, and the index is what decides what it is worth.
 * Neither is ever taken from the request, which is what stops a crafted client
 * logging an An-124 over its own house.
 */
export type SpotFeed = {
  /** the feed as it stands, types joined on where enrichment has resolved them */
  snapshot(): Promise<FeedSnapshot>;
  /** the accumulated index — many snapshots, not just the current one */
  rarity(): Promise<RarityIndex>;
};

export type SpotRoutesDeps = {
  auth: AuthProvider;
  spots: SpotStore;
  feed: SpotFeed;
  spotters: SpotterDirectory;
  /**
   * How long the same spotter must wait before the same airframe counts again.
   *
   * One value, used both for the rule and for the store's bucket key, so the
   * two can never disagree about where a window starts.
   */
  cooldownMs?: number;
};

/** the rare tail of the index, for a feed that has nothing in it yet. */
export type WireRarityTop = {
  confidence: Confidence;
  sampleSize: number;
  types: { type: string; observed: number; score: number; band: RarityBand }[];
};

/** the most rows any one request may ask for. A feed is a page, not a dump. */
const MAX_LIMIT = 200;

/**
 * A refusal the domain produced, given the status it deserves.
 *
 * `duplicate` is a conflict with a thing that already exists, so 409, and it is
 * the only one that carries a retry hint. The rest are a well-formed request
 * that the world refuses — the aircraft is not up, or was not up recently
 * enough — which is 422 and not 400: nothing about the request is malformed.
 */
function statusFor(reason: SpotRejectionReason): number {
  if (reason === 'duplicate') return 409;
  if (reason === 'no-spotter') return 401;
  return 422;
}

/**
 * Wrap a handler so a rejected promise becomes an answer rather than an
 * unhandled rejection — the same guard the auth routes use, and for the same
 * reason: these handlers are also driven directly by the spec.
 */
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

/** a bounded page size out of an untrusted query string. */
export function limitFrom(query: Record<string, unknown> | undefined, fallback = DEFAULT_LIMIT): number {
  const raw = query?.limit;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

/**
 * Mount the spotting routes.
 *
 * `POST /spots` is the only one that writes, and it is the whole component in
 * miniature: the spotter comes from the token, the aircraft comes from the
 * server's feed, `SpotLog` decides, and the store's unique key catches the one
 * case the rule cannot see — two requests racing each other through it.
 *
 * `GET /spots/recent` answers two different questions on one path. Without a
 * cursor it is the newest page, newest first, which is what a screen wants on
 * open. With `?since=` it is everything after that moment, **oldest first**, so
 * a client that fell behind advances its cursor and asks again rather than
 * skipping the middle.
 *
 * @example
 * registerSpotRoutes(app, { auth, spots: store, feed: sky, spotters: sky });
 */
export function registerSpotRoutes(app: AppLike, deps: SpotRoutesDeps): void {
  const { auth, spots, feed, spotters } = deps;
  const cooldownMs = deps.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const authed = requireAuth(auth);

  /** the caller's id, proved. Handlers run behind `authed`, so it is always set. */
  const callerId = (req: RouteRequest): string => authOf(req)?.user.id ?? '';

  const send = async (res: RouteResponse, page: readonly PlainSpot[]): Promise<void> => {
    res.status(200).json({ spots: await toWireSpots(page, spotters) });
  };

  app.post(
    '/spots',
    authed,
    guarded(async (req, res) => {
      const icao = stringField(req.body, 'icao').trim().toLowerCase();
      if (!icao) {
        res.status(400).json({ error: 'which aircraft?', code: 'bad-request' });
        return;
      }
      const spotterId = callerId(req);
      const note = stringField(req.body, 'note');

      const [snapshot, rarity, previous] = await Promise.all([
        feed.snapshot(),
        feed.rarity(),
        spots.lastSpotOf(spotterId, icao),
      ]);

      // The log is seeded with exactly the one row the cooldown rule reads.
      // Loading the whole ledger to answer "did you already have this one" is
      // the kind of thing that works until the ledger is big.
      const log = new SpotLog(previous ? [Spot.from(previous)] : [], { cooldownMs });
      const result = log.attempt({ spotterId, icao, note }, snapshot, { rarity });

      if (spotRejected(result)) {
        res.status(statusFor(result.reason)).json({
          ok: false,
          reason: result.reason,
          message: result.message,
          ...(result.retryAfterMs === undefined ? {} : { retryAfterMs: result.retryAfterMs }),
        });
        return;
      }
      if (!spotAccepted(result)) return;

      const spot = result.spot.toObject();
      const won = await spots.insert(spot, timeBucketOf(spot.spottedAt, cooldownMs));
      if (!won) {
        // The rule said yes and the store said no, which means another request
        // carrying the same pair landed between the two. That is a duplicate —
        // the same answer the rule would have given a moment later.
        const winner = await spots.lastSpotOf(spotterId, icao);
        const elapsed = winner ? Date.now() - Date.parse(winner.spottedAt) : 0;
        res.status(409).json({
          ok: false,
          reason: 'duplicate',
          message: `you already spotted ${winner ? winner.callsign : icao.toUpperCase()} today`,
          retryAfterMs: Math.max(0, cooldownMs - (Number.isFinite(elapsed) ? elapsed : 0)),
        });
        return;
      }

      const [wire] = await toWireSpots([spot], spotters);
      res.status(201).json({ ok: true, spot: wire });
    })
  );

  app.get(
    '/spots/recent',
    guarded(async (req, res) => {
      const limit = limitFrom(req.query);
      const raw = req.query?.since;
      const cursor = raw === undefined || raw === '' ? undefined : new Date(String(raw));

      if (cursor && Number.isNaN(cursor.getTime())) {
        // Answering the newest page to a cursor we could not read would look to
        // the client like "you have missed nothing", which is a lie it cannot
        // detect. Refusing is the only honest answer.
        res.status(400).json({ error: `since must be an ISO timestamp, got ${String(raw)}`, code: 'bad-request' });
        return;
      }

      // The store already ordered and bounded the page at the index; running
      // the domain's own query over it costs nothing on `limit` rows and is
      // what guarantees the tie-break and the direction match the entity.
      const page = cursor
        ? spotsSince(hydrate(await spots.since(cursor, limit)), cursor, limit)
        : recentSpots(hydrate(await spots.recent(limit)), limit);
      await send(res, page.map((s) => s.toObject()));
    })
  );

  app.get(
    '/me/spots',
    authed,
    guarded(async (req, res) => {
      const limit = limitFrom(req.query);
      const spotter = callerId(req);
      const page = spotsBySpotter(hydrate(await spots.bySpotter(spotter, limit)), spotter, limit);
      await send(res, page.map((s) => s.toObject()));
    })
  );

  // Registered before `/spots/rarity/:icao`, because `top` would otherwise be
  // read as a transponder address and 404 forever.
  app.get(
    '/spots/rarity/top',
    guarded(async (req, res) => {
      const limit = limitFrom(req.query, 6);
      const index = await feed.rarity();
      // `ranking()` is commonest first, so the rare tail is the end of it.
      const tail = index.ranking().slice(-limit).reverse();
      const body: WireRarityTop = {
        confidence: index.confidence,
        sampleSize: index.sampleSize,
        types: tail.map((t) => ({ ...t, band: index.score(t.type).band })),
      };
      res.status(200).json(body);
    })
  );

  app.get(
    '/spots/rarity/:icao',
    guarded(async (req, res) => {
      const icao = String(req.params?.icao ?? '').trim().toLowerCase();
      const aircraft = (await feed.snapshot()).find(icao);
      if (!aircraft) {
        res.status(404).json({ error: `${icao} is not in the sky right now`, code: 'not-in-feed' });
        return;
      }
      // A `band` of `unknown` is an answer, not a miss: it means the sample is
      // too small to rate, or enrichment has not resolved the type yet. 200.
      res.status(200).json({ rarity: (await feed.rarity()).score(aircraft.type) });
    })
  );
}

/** Rows from the store, as entities. A row the entity refuses is dropped rather than taking the page down with it. */
function hydrate(rows: readonly PlainSpot[]): Spot[] {
  const out: Spot[] = [];
  for (const row of rows) {
    try {
      out.push(Spot.from(row));
    } catch {
      /* a stored spot that no longer parses is not worth a blank feed */
    }
  }
  return out;
}
