import { Spot, spotAccepted, spotRejected, type SpotResult } from '@luvktest/test.spot';
import { WatchArea } from '@luvktest/test.watch-area';
import {
  AREAS, AUTH, AUTH_CODES, SPOTS, WATCHLIST, url,
  type PlainWatchArea, type RarityScore, type WireError, type WireNewArea,
  type WireRarityTop, type WireSession, type WireSpot, type WireUser, type Visibility,
} from './sky-endpoints.js';

/** how long any single request may take before it is treated as failed */
const REQUEST_TIMEOUT_MS = 15_000;

/** one watched aircraft, as the watchlist routes hand it over. */
export type Watched = { icao: string; callsign: string };

/**
 * A refusal, carried as an exception because almost every caller wants to stop.
 *
 * `code` is what a caller branches on. `message` is for a person, and is never
 * inspected — see the note on `WireError`.
 */
export class SkyError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    /** seconds, from the `Retry-After` header where there was one */
    readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'SkyError';
  }
}

/** the network did not answer at all — different from the server saying no. */
export const OFFLINE = 'offline';

type Envelope = { status: number; body: any; retryAfterSeconds?: number };

/** the token pair plus who it belongs to, as it sits in storage. */
export type StoredSession = {
  user: WireUser;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
};

const KEY = 'skyline.session';
/** the old shape: a bare user, no tokens. Read once so an existing visitor is
 *  not silently signed out mid-upgrade, then removed — it cannot authorise
 *  anything now that the routes want a Bearer token. */
const LEGACY_KEY = 'skyline.me';

function readStored(): StoredSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) { localStorage.removeItem(LEGACY_KEY); return null; }
    const s = JSON.parse(raw) as StoredSession;
    return s?.accessToken && s?.refreshToken && s?.user?.id ? s : null;
  } catch {
    return null;   // private mode, or someone edited it by hand
  }
}

function writeStored(s: StoredSession | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* storage unavailable — the session lives for this tab only */ }
}

const sessionOf = (b: WireSession): StoredSession => ({
  user: b.user,
  accessToken: b.accessToken,
  refreshToken: b.refreshToken,
  accessExpiresAt: b.accessExpiresAt,
  refreshExpiresAt: b.refreshExpiresAt,
});

/**
 * The one thing that talks to the server.
 *
 * It owns the token pair, the storage of it, and the single rule that is easy
 * to get wrong: an expired access token is refreshed **once** and the original
 * request retried **once**. Any other 401 drops the tokens. There is no path
 * through this class that can loop — `refreshOnce` never calls `send`, and the
 * retry never re-enters the refresh branch.
 */
export class SkyClient {
  private stored: StoredSession | null;
  private listeners = new Set<() => void>();
  /** in flight, so ten parallel requests that all expire together refresh once */
  private refreshing: Promise<boolean> | null = null;

  constructor(readonly base: string) {
    this.stored = readStored();
  }

  get session(): StoredSession | null { return this.stored; }
  get user(): WireUser | null { return this.stored ? this.stored.user : null; }
  get signedIn(): boolean { return Boolean(this.stored); }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private emit() { for (const fn of [...this.listeners]) fn(); }

  private setSession(s: StoredSession | null) {
    this.stored = s;
    writeStored(s);
    this.emit();
  }

  /** Forget the pair without telling the server. Used when it has already told us. */
  signOutLocal() { if (this.stored) this.setSession(null); }

  /* ---------------------------------------------------------------- *
   *  transport
   * ---------------------------------------------------------------- */

  private async raw(method: string, path: string, body?: unknown, bearer?: string, query?: Record<string, any>): Promise<Envelope> {
    let res: Response;
    try {
      res = await fetch(url(this.base, path, query), {
        method,
        credentials: 'include',
        // Without this a stalled request never settles, and the button that
        // started it says "One moment…" for the rest of the session with no way
        // back. A request that has not answered in fifteen seconds has failed as
        // far as a person is concerned, and failing loudly is recoverable.
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (e) {
      // A timeout and an unreachable host are different things to a person: one
      // says wait and try again, the other says check your connection.
      const timedOut = e instanceof DOMException && e.name === 'TimeoutError';
      throw new SkyError(
        0,
        OFFLINE,
        timedOut
          ? 'the server took too long to answer — try again'
          : e instanceof Error ? `could not reach the server: ${e.message}` : 'could not reach the server'
      );
    }
    // Read the body exactly once. Both the status code and the `code` inside
    // are needed to decide what happens next, and a Response body can only be
    // consumed one time.
    const text = await res.text().catch(() => '');
    let parsed: any;
    try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { error: text || `the server answered ${res.status}`, code: 'not-json' }; }
    const header = res.headers.get('Retry-After');
    const fromHeader = header && /^\d+$/.test(header.trim()) ? Number(header.trim()) : undefined;
    return { status: res.status, body: parsed, retryAfterSeconds: fromHeader ?? parsed?.retryAfterSeconds };
  }

  /**
   * One request, with the refresh rule applied when it carries a token.
   *
   * Returns the envelope whatever the status: some callers (spotting) have a
   * meaningful body on a 4xx and must see it. `expect` is the throwing half.
   */
  async send(method: string, path: string, opts: { body?: unknown; auth?: boolean; query?: Record<string, any> } = {}): Promise<Envelope> {
    const { body, auth, query } = opts;
    if (!auth) return this.raw(method, path, body, undefined, query);

    const token = this.stored ? this.stored.accessToken : undefined;
    if (!token) throw new SkyError(401, 'no-token', 'sign in first');

    const first = await this.raw(method, path, body, token, query);
    if (first.status !== 401) return first;

    if (first.body?.code === AUTH_CODES.expiredAccess && (await this.refreshOnce())) {
      // Exactly one retry, with the new token. If this 401s too the session is
      // genuinely gone and we stop — no second refresh, no third request.
      const second = await this.raw(method, path, body, this.stored ? this.stored.accessToken : undefined, query);
      if (second.status !== 401) return second;
    }
    this.signOutLocal();
    throw new SkyError(401, first.body?.code ?? 'invalid-token', 'your session ended — please sign in again');
  }

  private expect<T>(env: Envelope): T {
    if (env.status >= 400) {
      const e = env.body as WireError;
      throw new SkyError(env.status, e?.code ?? 'unavailable', e?.error ?? `the server answered ${env.status}`, env.retryAfterSeconds);
    }
    return env.body as T;
  }

  private async call<T>(method: string, path: string, opts: { body?: unknown; auth?: boolean; query?: Record<string, any> } = {}): Promise<T> {
    return this.expect<T>(await this.send(method, path, opts));
  }

  /**
   * Exchange the refresh token for a new pair.
   *
   * Deliberately built on `raw`, not `send`: a refresh that 401s must not
   * trigger a refresh. That is the loop this method exists to make impossible.
   */
  private refreshOnce(): Promise<boolean> {
    if (this.refreshing) return this.refreshing;
    const rt = this.stored ? this.stored.refreshToken : '';
    if (!rt) return Promise.resolve(false);

    const p = (async () => {
      try {
        const env = await this.raw('POST', AUTH.refresh, { refreshToken: rt });
        if (env.status !== 200 || !env.body?.accessToken) { this.signOutLocal(); return false; }
        this.setSession(sessionOf(env.body as WireSession));
        return true;
      } catch {
        // The network, not the server. Keep the pair — it may still be good in
        // a minute, and throwing the session away over one dropped packet is
        // the rudest thing an app can do.
        return false;
      }
    })();
    this.refreshing = p;
    p.then(() => { if (this.refreshing === p) this.refreshing = null; },
           () => { if (this.refreshing === p) this.refreshing = null; });
    return p;
  }

  /* ---------------------------------------------------------------- *
   *  auth
   * ---------------------------------------------------------------- */

  /** 202 and no session. The caller's next screen is "check your inbox". */
  async signUp(input: { email: string; name: string; password: string }): Promise<{ next: string }> {
    const b = await this.call<{ ok: true; next: string }>('POST', AUTH.signup, { body: input });
    return { next: b?.next ?? 'confirmation-sent' };
  }

  async signIn(input: { email: string; password: string }): Promise<WireUser> {
    const b = await this.call<WireSession>('POST', AUTH.login, { body: input });
    this.setSession(sessionOf(b));
    return b.user;
  }

  /** Spend a confirmation link. Throws `SkyError` with the code that tells the three outcomes apart. */
  async confirm(token: string): Promise<WireUser> {
    const b = await this.call<{ ok: true; user: WireUser }>('POST', AUTH.confirm, { body: { token } });
    return b.user;
  }

  async resendConfirmation(email: string): Promise<void> {
    await this.call('POST', AUTH.resend, { body: { email } });
  }

  /** Who the stored pair belongs to. This is the boot check; `send` does the refresh. */
  async whoAmI(): Promise<WireUser> {
    const b = await this.call<{ user: WireUser }>('GET', AUTH.me, { auth: true });
    if (this.stored && b?.user) this.setSession({ ...this.stored, user: b.user });
    return b.user;
  }

  /** Tell the server, then forget — in that order, and forget even if it refuses. */
  async signOut(): Promise<void> {
    const rt = this.stored ? this.stored.refreshToken : '';
    try { if (rt) await this.raw('POST', AUTH.logout, { refreshToken: rt }); } catch { /* going anyway */ }
    this.signOutLocal();
  }

  /* ---------------------------------------------------------------- *
   *  watchlist
   * ---------------------------------------------------------------- */

  async watchlist(): Promise<Watched[]> {
    return (await this.call<{ watching: Watched[] }>('GET', WATCHLIST.read, { auth: true })).watching ?? [];
  }

  async watch(icao: string, callsign: string): Promise<Watched[]> {
    return (await this.call<{ watching: Watched[] }>('POST', WATCHLIST.watch, { auth: true, body: { icao, callsign } })).watching ?? [];
  }

  async unwatch(icao: string): Promise<Watched[]> {
    return (await this.call<{ watching: Watched[] }>('POST', WATCHLIST.unwatch, { auth: true, body: { icao } })).watching ?? [];
  }

  /* ---------------------------------------------------------------- *
   *  spotting
   * ---------------------------------------------------------------- */

  /**
   * Take a spot.
   *
   * Comes back as the domain's own `SpotResult`, rehydrated through
   * `Spot.from`, so callers narrow with the exported `spotAccepted` /
   * `spotRejected` predicates rather than with `if (r.ok)` — which this
   * workspace, compiled without `strictNullChecks`, does not narrow.
   *
   * A rejection is a normal answer and is returned, not thrown. Anything else
   * — 401, 500, a dead network — throws.
   */
  async spot(icao: string, note?: string): Promise<SpotResult> {
    const env = await this.send('POST', SPOTS.create, { auth: true, body: { icao, ...(note ? { note } : {}) } });
    if (env.status === 201 && env.body?.spot) return { ok: true, spot: Spot.from(env.body.spot) };
    if (env.body?.reason) {
      return { ok: false, reason: env.body.reason, message: env.body.message ?? 'that spot did not count', retryAfterMs: env.body.retryAfterMs };
    }
    return this.expect<never>(env);
  }

  async recentSpots(opts: { limit?: number; since?: string } = {}): Promise<WireSpot[]> {
    const b = await this.call<{ spots: WireSpot[] }>('GET', SPOTS.recent, { query: { limit: opts.limit, since: opts.since } });
    return b?.spots ?? [];
  }

  async mySpots(limit = 50): Promise<WireSpot[]> {
    const b = await this.call<{ spots: WireSpot[] }>('GET', SPOTS.mine, { auth: true, query: { limit } });
    return b?.spots ?? [];
  }

  /** What a spot of this airframe would be worth, without taking it. */
  async rarityOf(icao: string): Promise<RarityScore> {
    return (await this.call<{ rarity: RarityScore }>('GET', SPOTS.rarityOf(icao))).rarity;
  }

  async rarityTop(limit = 6): Promise<WireRarityTop> {
    return this.call<WireRarityTop>('GET', SPOTS.rarityTop, { query: { limit } });
  }

  /* ---------------------------------------------------------------- *
   *  watch areas
   * ---------------------------------------------------------------- */

  /**
   * The caller's areas, as domain objects.
   *
   * Built through `WatchArea.from` so the containment rule the globe draws is
   * the same one the tests cover — including the antimeridian and the poles. A
   * row the constructor refuses is dropped rather than allowed to take the
   * whole list down with it.
   */
  async areas(): Promise<WatchArea[]> {
    const b = await this.call<{ areas: PlainWatchArea[] }>('GET', AREAS.list, { auth: true });
    return hydrateAreas(b?.areas ?? []);
  }

  async createArea(input: WireNewArea): Promise<WatchArea> {
    const b = await this.call<{ area: PlainWatchArea }>('POST', AREAS.list, { auth: true, body: input });
    return WatchArea.from(b.area);
  }

  async updateArea(id: string, patch: { name?: string; radiusKm?: number; visibility?: Visibility }): Promise<WatchArea> {
    const b = await this.call<{ area: PlainWatchArea }>('PATCH', AREAS.one(id), { auth: true, body: patch });
    return WatchArea.from(b.area);
  }

  async deleteArea(id: string): Promise<void> {
    await this.call('DELETE', AREAS.one(id), { auth: true });
  }
}

/** Drop the rows the entity refuses rather than losing the list to one of them. */
export function hydrateAreas(plain: readonly PlainWatchArea[]): WatchArea[] {
  const out: WatchArea[] = [];
  for (const p of plain) {
    try { out.push(WatchArea.from(p)); }
    catch { /* a stored area that no longer parses is not worth a blank screen */ }
  }
  return out;
}

export { spotAccepted, spotRejected };
export type { SpotResult, WireSpot, WireUser, RarityScore, WireRarityTop, WireNewArea, Visibility };
