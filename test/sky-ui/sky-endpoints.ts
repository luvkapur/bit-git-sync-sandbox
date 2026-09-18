/**
 * Every HTTP path this UI calls, declared once.
 *
 * Two halves, and the difference matters to whoever implements the server.
 *
 * `AUTH` and `WATCHLIST` already exist — they are the routes in
 * `@luvktest/test.auth-routes`, and the shapes below are that component's
 * shapes, not a wish. `SPOTS` and `AREAS` do not exist yet: `@luvktest/test.spot`
 * and `@luvktest/test.watch-area` are pure domain logic with no transport. The
 * contract for them is written here in full — path, method, body, status,
 * response — so the server can be implemented against a single file rather than
 * against a reading of the UI.
 *
 * Nothing in this module fetches. It only says what the paths are.
 */

import type { PlainSpot, RarityBand, RarityScore, SpotRejectionReason, Confidence } from '@luvktest/test.spot';
import type { PlainWatchArea, Visibility } from '@luvktest/test.watch-area';

/* ------------------------------------------------------------------ *
 *  The error envelope. Every refusal, from every route.
 * ------------------------------------------------------------------ */

/**
 * What a failure looks like on the wire.
 *
 * `code` is the contract and `error` is prose for a person. The UI branches on
 * `code` and never on `error` — the message is free to be rewritten, translated
 * or made friendlier without breaking a single screen.
 */
export type WireError = {
  error: string;
  code: string;
  /** set on `rate-limited`. Mirrors the `Retry-After` header, which is authoritative. */
  retryAfterSeconds?: number;
};

/** The auth codes this UI treats specially. The full list lives in `@luvktest/test.auth-provider`. */
export const AUTH_CODES = {
  /** the access token is real and past its expiry — refresh once, retry once */
  expiredAccess: 'expired-access-token',
  /** the account exists, the password was right, the address was never proved */
  notConfirmed: 'email-not-confirmed',
  /** too many resends. `Retry-After` says how long. */
  rateLimited: 'rate-limited',
  /** the confirmation link was already spent */
  alreadyUsed: 'confirmation-already-used',
  /** the confirmation link is real and too old */
  expiredConfirmation: 'expired-confirmation',
  /** the confirmation link is not one of ours */
  invalidConfirmation: 'invalid-confirmation',
  invalidCredentials: 'invalid-credentials',
  weakPassword: 'weak-password',
  invalidEmail: 'invalid-email',
  /** auth is switched off on this deployment — the map still works */
  unavailable: 'unavailable',
} as const;

/* ------------------------------------------------------------------ *
 *  Authentication — these routes exist today.
 * ------------------------------------------------------------------ */

/** the session body `/auth/login` and `/auth/refresh` answer with. */
export type WireUser = { id: string; email: string; name: string; emailConfirmed: boolean };
export type WireSession = {
  user: WireUser;
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  /** seconds of access-token life */
  expiresIn: number;
  accessExpiresAt: string;
  refreshExpiresAt: string;
};

export const AUTH = {
  /** POST `{email,name,password}` → **202** `{ok:true,next:'confirmation-sent'}`. No session: the account is not usable yet. */
  signup: '/auth/signup',
  /** GET `?token=` or POST `{token}` → 200 `{ok:true,user}`. 400 `invalid-confirmation` · `expired-confirmation` · `confirmation-already-used`. */
  confirm: '/auth/confirm',
  /** POST `{email}` → 200 `{ok:true}`. 429 + `Retry-After` when asked too often. Answers the same whether or not the address exists. */
  resend: '/auth/resend-confirmation',
  /** POST `{email,password}` → 200 session. 401 `invalid-credentials` · 403 `email-not-confirmed`. */
  login: '/auth/login',
  /** POST `{refreshToken}` → 200 session, a **new pair**; the old refresh token is retired. */
  refresh: '/auth/refresh',
  /** POST `{refreshToken}` → 200 `{ok:true}`, always. */
  logout: '/auth/logout',
  /** GET, Bearer → 200 `{user}`. 401 `expired-access-token` is the refresh signal. */
  me: '/auth/me',
} as const;

export const WATCHLIST = {
  /** GET, Bearer → 200 `{watching:{icao,callsign}[]}` */
  read: '/me/watchlist',
  /** POST `{icao,callsign}`, Bearer → 201 `{watching}` */
  watch: '/me/watch',
  /** POST `{icao}`, Bearer → 200 `{watching}` */
  unwatch: '/me/unwatch',
} as const;

/* ------------------------------------------------------------------ *
 *  Spotting — NOT YET IMPLEMENTED SERVER-SIDE.
 *
 *  Everything here is one `SpotLog` and one `RarityIndex` behind an Express
 *  router. The domain component decides; the route only carries.
 * ------------------------------------------------------------------ */

/**
 * A spot as the feed shows it.
 *
 * `PlainSpot` carries `spotterId` and nothing else about the person, which is
 * correct for a ledger and useless for a feed — a column of opaque ids is not
 * something anyone wants an account for. The route joins the name on the way
 * out. Nothing else is added: name and id only, never the address.
 */
export type WireSpot = PlainSpot & { spotter: { id: string; name: string } };

/** the body `POST /spots` answers with when the domain refuses. Mirrors `SpotRejected`. */
export type WireSpotRejection = {
  ok: false;
  reason: SpotRejectionReason;
  message: string;
  /** set on `duplicate` — milliseconds until the same airframe counts again */
  retryAfterMs?: number;
};

export type WireRarityTop = {
  confidence: Confidence;
  sampleSize: number;
  types: { type: string; observed: number; score: number; band: RarityBand }[];
};

export const SPOTS = {
  /**
   * POST `{icao, note?}`, **Bearer**.
   *
   * The spotter is the token, never the body — `SpotLog.attempt` is called with
   * the authenticated id. The aircraft's position, type and altitude come from
   * the server's own feed snapshot, never from the request.
   *
   * - 201 `{ok:true, spot:WireSpot}` — accepted
   * - 409 `{ok:false, reason:'duplicate', message, retryAfterMs}` — the cooldown
   * - 422 `{ok:false, reason, message}` — `not-in-feed` · `not-airborne` · `stale-contact`
   * - 401 — no or expired token
   */
  create: '/spots',
  /**
   * GET `?limit=50` → 200 `{spots: WireSpot[]}`, newest first — `recentSpots`.
   *
   * With `?since=<ISO>` it is `spotsSince` instead: everything newer than the
   * cursor, **oldest first**, so a client that fell behind advances its cursor
   * and asks again rather than skipping the middle. That is the polling shape
   * this UI uses; no socket is required.
   */
  recent: '/spots/recent',
  /** GET `?limit=50`, **Bearer** → 200 `{spots: WireSpot[]}` — `spotsBySpotter` for the caller. */
  mine: '/me/spots',
  /**
   * GET → 200 `{rarity: RarityScore}` for one airframe, scored against the live
   * index without taking a spot. This is what lets the button say what the spot
   * would be worth before it is pressed.
   *
   * 404 when the aircraft is not in the current feed. A `band` of `unknown`
   * (small sample, or the type has not been resolved) is a 200 — it is an
   * answer, and the UI hedges on it rather than claiming a rating.
   */
  rarityOf: (icao: string) => `/spots/rarity/${encodeURIComponent(icao.toLowerCase())}`,
  /**
   * GET `?limit=6` → 200 `WireRarityTop`, the rare tail of `RarityIndex.ranking()`.
   * Fills the feed's empty state with something true instead of a shrug.
   */
  rarityTop: '/spots/rarity/top',
} as const;

/* ------------------------------------------------------------------ *
 *  Watch areas — NOT YET IMPLEMENTED SERVER-SIDE.
 * ------------------------------------------------------------------ */

/** POST `/me/areas`. `id` and `createdAt` are the server's to mint. */
export type WireNewArea = {
  name: string;
  lat: number;
  lon: number;
  radiusKm: number;
  visibility?: Visibility;
};

export const AREAS = {
  /**
   * GET, **Bearer** → 200 `{areas: PlainWatchArea[]}` — the caller's own, plus
   * any shared one, which is `areasVisibleTo(all, callerId)`.
   *
   * POST `WireNewArea`, **Bearer** → 201 `{area: PlainWatchArea}`.
   * Construct through `WatchArea.create`: it is the thing that normalises the
   * longitude a drag across the date line produces, clamps the radius, and
   * rejects a nameless or unowned area. 400 `{error, code:'bad-request'}` on a
   * `RangeError` from that constructor.
   */
  list: '/me/areas',
  /**
   * PATCH `{name?, radiusKm?, visibility?}`, **Bearer** → 200 `{area}`.
   * DELETE, **Bearer** → 200 `{ok:true}`.
   * Both 403 unless the caller owns it.
   */
  one: (id: string) => `/me/areas/${encodeURIComponent(id)}`,
} as const;

/** Join a base and a path without doubling or dropping the slash between them. */
export function url(base: string, path: string, query?: Record<string, string | number | undefined>): string {
  const joined = `${base.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return joined;
  const q = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return q ? `${joined}?${q}` : joined;
}

export type { PlainSpot, RarityScore, RarityBand, Confidence, SpotRejectionReason, PlainWatchArea, Visibility };
