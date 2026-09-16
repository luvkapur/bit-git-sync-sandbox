import mongoose, { Schema, Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { promises as dns } from 'node:dns';
import { Flight, PlainFlight } from '@luvktest/test.flight';
import { User, PlainUser } from '@luvktest/test.user';

/**
 * Your schemas, in your own scope, in a database you point wherever you like.
 * The users collection stores a bcrypt hash in a column you declared — nothing
 * is holding these accounts on your behalf.
 */
const userSchema = new Schema<PlainUser>({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: String, required: true },
});

const watchSchema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  icao: { type: String, required: true },
  callsign: { type: String, default: '' },
  createdAt: { type: String, required: true },
});

/** enrichment caches. an aircraft's type never changes, so look it up once — ever. */
const aircraftSchema = new Schema({ icao: { type: String, required: true, unique: true }, info: { type: Object, default: {} }, at: Number });
const routeSchema = new Schema({ callsign: { type: String, required: true, unique: true }, route: { type: Object, default: {} }, at: Number });

/**
 * Upstream timeouts. The global state vector is about a megabyte of JSON, and
 * 20s was not enough for it from every host we deploy to — Bit hosting timed
 * out on every single poll while looking, from the outside, merely stale.
 * Generous is correct here: the poll interval is minutes, so a slow request
 * costs nothing, while a premature abort costs the whole cycle.
 */
/**
 * Circles for the community-feed sweep, placed over the airspace that actually
 * carries traffic rather than evenly over a sphere that is mostly water. Each
 * call answers a 250nm radius, so this is a partial map by construction — it
 * exists to keep a host alive that cannot reach the global feed, not to match it.
 */
const ADSB_CIRCLES: [number, number][] = [
  [42, -74], [33, -84], [41, -88], [31, -97], [36, -119],  // north america
  [52, -1], [40, -4], [47, 3], [51, 10], [42, 12],          // western europe
  [39, 33], [25, 52],                                        // turkey, the gulf
  [28, 77], [13, 101], [31, 118], [36, 139],                 // india, se asia, china, japan
  [-23, -46], [-33, 151],                                    // brazil, australia
];

/** the feed refuses bursts; spaced calls are answered, parallel ones are not */
const ADSB_SPACING_MS = 1_200;

/**
 * Circles per tick. The first version swept all eighteen in one pass, which is
 * up to six minutes of awaiting inside a single poll — long enough that a hosted
 * container never finished one, and every restart began again from nothing. A
 * few circles per tick bounds the work to seconds, persists what it found, and
 * covers the whole list over several minutes instead of risking all of it at
 * once.
 */
const ADSB_PER_TICK = 3;

/** drop an aircraft the sweep has not seen for this long */
const ADSB_TTL_S = 20 * 60;

/** refresh on the next request once the map is older than this */
const ADSB_REFRESH_S = 90;

const AUTH_TIMEOUT_MS = 30_000;
const STATES_TIMEOUT_MS = 90_000;

/**
 * Node's fetch throws a bare "fetch failed" and hides the real reason one level
 * down in `error.cause`. That distinction is the whole diagnosis: ENETUNREACH or
 * EHOSTUNREACH means this host has no route to that address family, ENOTFOUND is
 * DNS, ECONNREFUSED is someone actively saying no, and ETIMEDOUT is a silent drop
 * — which is what an upstream IP-range block usually looks like.
 */
function explain(e: unknown): string {
  const err = e as any;
  const cause = err?.cause ?? err;
  const detail = [cause?.code, cause?.syscall, cause?.address, cause?.port]
    .filter(Boolean)
    .join(' ');
  const msg = cause?.message ?? err?.message ?? String(e);
  return detail ? `${msg} [${detail}]` : msg;
}

/** the last good snapshot, so the map is never empty even if upstream is down */
const snapshotSchema = new Schema({
  key: { type: String, required: true, unique: true },
  at: { type: Number, required: true },
  flights: { type: Array, default: [] },
});



export class SkyApi {
  private listeners = new Set<(payload: string) => void>();
  private flights: Flight[] = [];
  private at = 0;
  private failures = 0;
  /** set when upstream answered 429 — the daily budget, not the network, said no */
  private limited = false;
  /** filled once, the first time a poll fails, so a failure explains itself */
  private diag?: Record<string, string>;
  /** which poll attempt produced `diag` — a probe from attempt 1 is boot noise */
  private diagAt = 0;
  /** where the next partial sweep picks up */
  private circle = 0;
  private source = 'cache';
  /** why the last poll failed, if it did — a stale globe should be able to say so */
  private lastError?: string;
  private token?: { value: string; expires: number };
  private timer?: ReturnType<typeof setTimeout>;

  constructor(
    private users: Model<PlainUser>,
    private watches: Model<any>,
    private snapshots: Model<any>,
    private aircraftCache: Model<any>,
    private routeCache: Model<any>
  ) {}

  static async connect(mongoUrl = process.env.MONGO_URL) {
    if (!mongoUrl) throw new Error('MONGO_URL is not set');
    await mongoose.connect(mongoUrl);
    const m = mongoose.models;
    return new SkyApi(
      (m.User as Model<PlainUser>) || mongoose.model<PlainUser>('User', userSchema),
      m.Watch || mongoose.model('Watch', watchSchema),
      m.Snapshot || mongoose.model('Snapshot', snapshotSchema),
      m.Aircraft || mongoose.model('Aircraft', aircraftSchema),
      m.Route || mongoose.model('Route', routeSchema)
    );
  }

  // ---------- the live feed

  /** Whether an OpenSky account is configured. Anonymous callers get a small
   *  daily credit budget; an account raises it by roughly an order of magnitude. */
  private get authenticated() {
    return Boolean(process.env.OPENSKY_CLIENT_ID && process.env.OPENSKY_CLIENT_SECRET);
  }

  /** OAuth2 client credentials, cached until just before the token expires. */
  private async accessToken(): Promise<string | undefined> {
    if (!this.authenticated) return undefined;
    if (this.token && this.token.expires > Date.now()) return this.token.value;
    const res = await fetch(
      'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: process.env.OPENSKY_CLIENT_ID as string,
          client_secret: process.env.OPENSKY_CLIENT_SECRET as string,
        }),
        signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
      }
    ).catch((e) => { throw new Error(`auth request: ${explain(e)}`); });
    if (!res.ok) throw new Error(`auth ${res.status}`);
    const body = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: body.access_token, expires: Date.now() + (body.expires_in - 30) * 1000 };
    return this.token.value;
  }

  /**
   * Run once, the first time a poll fails. It answers the only question that
   * matters when a host is unreachable: is it us or is it them?
   *
   * `ipv4.icanhazip.com` has an A record and no AAAA, so reaching it proves this
   * runtime has a working IPv4 route — and it echoes back the egress IP, which is
   * the address an upstream would have blocked. `api.adsbdb.com` is dual-stack and
   * acts as the control. If the IPv4-only probe fails the same way the upstream
   * did while the dual-stack control succeeds, the problem is the route, not the
   * destination.
   */
  private async probeEgress(target: string): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    await Promise.all([
      dns.resolve4(target).then(
        (a) => { out.dnsA = a.join(','); },
        (e) => { out.dnsA = `fail ${e.code ?? e.message}`; }
      ),
      dns.resolve6(target).then(
        (a) => { out.dnsAAAA = a.join(','); },
        (e) => { out.dnsAAAA = `none (${e.code ?? e.message})`; }
      ),
      fetch('https://ipv4.icanhazip.com', { signal: AbortSignal.timeout(20_000) })
        .then((r) => r.text())
        .then(
          (t) => { out.ipv4Only = `ok, egress ${t.trim()}`; },
          (e) => { out.ipv4Only = `fail: ${explain(e)}`; }
        ),
      fetch('https://api.adsbdb.com/v0/aircraft/a5307f', { signal: AbortSignal.timeout(20_000) })
        .then(
          (r) => { out.dualStack = `ok ${r.status}`; },
          (e) => { out.dualStack = `fail: ${explain(e)}`; }
        ),
      // Candidate replacement feeds. If the upstream is refusing this host's
      // egress rather than being unreachable, another provider on the same
      // network will answer — which tells us the fix is the data source, not
      // the infrastructure.
      fetch('https://opendata.adsb.fi/api/v2/lat/40/lon/-74/dist/25', { signal: AbortSignal.timeout(20_000) })
        .then(
          (r) => { out.adsbFi = `ok ${r.status}`; },
          (e) => { out.adsbFi = `fail: ${explain(e)}`; }
        ),
      fetch('https://api.adsb.lol/v2/lat/40/lon/-74/dist/25', { signal: AbortSignal.timeout(20_000) })
        .then(
          (r) => { out.adsbLol = `ok ${r.status}`; },
          (e) => { out.adsbLol = `fail: ${explain(e)}`; }
        ),
    ]);
    return out;
  }

  /**
   * One upstream request serves every connected browser. A thousand viewers
   * cost exactly as much as one, which is what makes a rate limit survivable
   * in public.
   */
  /**
   * One upstream request serves every connected browser. A thousand viewers
   * cost exactly as much as one, which is what makes a rate limit survivable
   * in public.
   *
   * Two sources, tried in order of coverage. OpenSky answers for the whole
   * planet in a single call and is the one worth having; the community ADS-B
   * feeds answer a radius at a time, so a sweep is many calls for a partial
   * map. The fallback exists because the good source is not reachable from
   * everywhere — a host whose egress OpenSky refuses would otherwise show an
   * empty globe forever, which is a worse answer than a partial one.
   */
  async poll(): Promise<void> {
    if (await this.pollOpenSky()) return;
    await this.pollAdsb();
  }

  /** The whole planet in one request. Returns false if it could not be had. */
  private async pollOpenSky(): Promise<boolean> {
    const url = 'https://opensky-network.org/api/states/all';
    try {
      const token = await this.accessToken();
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(STATES_TIMEOUT_MS),
      }).catch((e) => { throw new Error(`states request: ${explain(e)}`); });
      // 429 is the daily credit budget, not congestion. Retrying sooner cannot
      // succeed, so record it and let start() wait out a long window instead.
      if (res.status === 429) { this.limited = true; throw new Error('429 — upstream credit budget spent'); }
      if (!res.ok) throw new Error(`upstream ${res.status}`);
      const body = (await res.json()) as { time: number; states: unknown[][] | null };
      const flights = (body.states ?? [])
        .map((s) => Flight.fromStateVector(s as any))
        .filter((f): f is Flight => Boolean(f) && f!.isCruising);
      if (!flights.length) throw new Error('upstream returned no usable states');
      await this.accept(flights, body.time ?? Math.floor(Date.now() / 1000),
        token ? 'opensky:account' : 'opensky:anonymous');
      return true;
    } catch (e) {
      await this.noteFailure(e);
      return false;
    }
  }

  /**
   * A sweep of the community feed, one circle at a time. Deliberately serial
   * with a pause between calls: firing the whole sweep at once had forty-five
   * of fifty-one circles refused, while the same circles spaced out were all
   * answered. A free service that answers politely deserves to be asked
   * politely, and one dead circle must not abort the rest of the sweep.
   */
  private async pollAdsb(): Promise<boolean> {
    const kept = new Map<string, Flight>();
    // carry forward what earlier ticks found, so partial sweeps accumulate
    const cutoff = Math.floor(Date.now() / 1000) - ADSB_TTL_S;
    if (this.source.startsWith('adsb')) {
      for (const f of this.flights) if (f.d.seen > cutoff) kept.set(f.icao, f);
    }

    let answered = 0;
    for (let n = 0; n < ADSB_PER_TICK; n += 1) {
      const [lat, lon] = ADSB_CIRCLES[this.circle % ADSB_CIRCLES.length];
      this.circle = (this.circle + 1) % ADSB_CIRCLES.length;
      try {
        const res = await fetch(
          `https://opendata.adsb.fi/api/v2/lat/${lat}/lon/${lon}/dist/250`,
          { signal: AbortSignal.timeout(10_000) }
        );
        if (res.ok) {
          answered += 1;
          const body = (await res.json()) as { aircraft?: Record<string, any>[] };
          for (const a of body.aircraft ?? []) {
            const f = Flight.fromAdsb(a);
            if (f?.isCruising) kept.set(f.icao, f);
          }
        }
      } catch {
        // a circle that times out costs us its aircraft, nothing more
      }
      await new Promise((r) => { setTimeout(r, ADSB_SPACING_MS); });
    }

    if (!kept.size) {
      await this.noteFailure(new Error(`adsb sweep: nothing from ${ADSB_PER_TICK} circles (answered ${answered})`));
      return false;
    }
    await this.accept([...kept.values()], Math.floor(Date.now() / 1000), 'adsb.fi');
    return true;
  }

  /**
   * Fill the map on demand when it is empty.
   *
   * `start()` assumes a process that keeps running between requests. That holds
   * on a cluster and in a plain node process; it does not hold everywhere this
   * app is meant to run, and where it fails the background timer never completes
   * a cycle and the globe stays empty forever while every endpoint answers 200.
   * So the first request that finds no data pays for a little of it, and the
   * result is persisted for everyone after. Requests arriving meanwhile wait on
   * the same promise rather than each starting their own sweep.
   */
  private refreshing?: Promise<void>;

  async ensureData(): Promise<void> {
    const age = this.at ? Math.floor(Date.now() / 1000) - this.at : Infinity;
    const empty = !this.flights.length;
    if (!empty && age < ADSB_REFRESH_S) return;
    this.refreshing ??= (async () => {
      try {
        if (!this.flights.length) await this.warm();       // a snapshot another instance left
        if (!this.flights.length || age >= ADSB_REFRESH_S) await this.pollAdsb();
      } finally {
        this.refreshing = undefined;
      }
    })();
    // Block only when there is nothing to show. A caller who already has a map
    // gets it immediately and the refresh lands for whoever asks next — a stale
    // globe that redraws is better than a fast one that makes people wait.
    if (empty) await this.refreshing;
  }

  /** A good read from any source: keep it, persist it, tell the browsers. */
  private async accept(flights: Flight[], at: number, source: string): Promise<void> {
    this.flights = flights;
    this.at = at;
    this.failures = 0;
    this.limited = false;
    this.lastError = undefined;
    this.source = source;
    await this.snapshots.updateOne(
      { key: 'global' },
      { key: 'global', at: this.at, flights: flights.map((f) => f.toRow()) },
      { upsert: true }
    );
    this.broadcast();
  }

  private async noteFailure(e: unknown): Promise<void> {
    this.failures += 1;   // keep serving the last good snapshot
    this.lastError = e instanceof Error ? e.message : String(e);
    // Swallowing this is how a globe froze for ninety minutes while still
    // looking healthy. The snapshot is a fallback, not a success.
    console.warn(`[sky-api] poll failed (${this.failures}): ${this.lastError}`);
    // Re-probe on every failure, not just the first. The first failure happens
    // during container start, when outbound requests time out wholesale — the
    // initial version of this measured boot contention and called it a network
    // verdict. Later polls run on a warm container, which is the state worth
    // reporting, so the newest result wins.
    // Diagnose failures two through four. The first happens during container
    // start, when outbound calls time out wholesale, so probing it measures boot
    // contention and costs the first tick twenty seconds it should be spending on
    // data. After the fourth, a host has told us enough.
    if (this.failures < 2 || this.failures > 4) return;
    this.diag = await this.probeEgress('auth.opensky-network.org').catch(() => undefined);
    if (this.diag) {
      this.diagAt = this.failures;
      console.warn(`[sky-api] egress probe (failure ${this.failures}): ${JSON.stringify(this.diag)}`);
    }
  }

  /**
   * Poll on a schedule the upstream budget can actually pay for, backing off
   * when it complains. 90s looked affordable on an account and was not: a global
   * state vector costs several credits and ~960 calls a day exhausts the
   * allowance by mid-morning, after which everything 429s. Five minutes leaves
   * real headroom. The fallback ticks more often but does less each time: three
   * circles every two minutes covers the list in about twelve, and never risks
   * a long await that a restart would throw away.
   */
  start(baseMs = this.authenticated ? 5 * 60_000 : 15 * 60_000) {
    const tick = async () => {
      await this.poll();
      const onFallback = this.source.startsWith('adsb');
      const wait = this.limited
        ? 30 * 60_000                                   // budget spent: wait, do not double
        : onFallback
          ? 2 * 60_000
          : baseMs * Math.min(8, 2 ** this.failures);
      this.timer = setTimeout(tick, wait);
    };
    tick();
  }


  stop() { if (this.timer) clearTimeout(this.timer); }

  /** restore the last snapshot so a fresh boot is never an empty map. */
  async warm(): Promise<void> {
    const snap = await this.snapshots.findOne({ key: 'global' }).lean();
    if (snap?.flights?.length) {
      this.flights = (snap.flights as any[][]).map((r) => Flight.fromRow(r));
      this.at = snap.at;
    }
  }

  /** live superlatives, straight off the feed. free, and genuinely interesting. */
  private highlights() {
    let highest: Flight | undefined;
    let fastest: Flight | undefined;
    const byCountry = new Map<string, number>();
    const emergencies: (string | number)[][] = [];
    // Transponders lie. Roughly 1 in 2000 reports an impossible altitude or
    // speed, and a superlative built from bad data is the kind of number a
    // viewer fact-checks and catches. Bound both to what an aircraft can do.
    const PLAUSIBLE_ALT = 16_764;   // 55,000 ft — above any airliner
    const PLAUSIBLE_VEL = 360;      // ~700 kt — above any airliner
    for (const f of this.flights) {
      if (f.d.altitude < PLAUSIBLE_ALT && (!highest || f.d.altitude > highest.d.altitude)) highest = f;
      if (f.d.velocity < PLAUSIBLE_VEL && (!fastest || f.d.velocity > fastest.d.velocity)) fastest = f;
      byCountry.set(f.d.country, (byCountry.get(f.d.country) ?? 0) + 1);
      if (f.emergency) emergencies.push(f.toRow());
    }
    const top = [...byCountry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([country, n]) => ({ country, n }));
    return {
      highest: highest && { callsign: highest.callsign, ft: highest.altitudeFt },
      fastest: fastest && { callsign: fastest.callsign, kt: fastest.knots },
      topCountries: top,
      emergencies,
    };
  }

  state() {
    return {
      at: this.at,
      /** seconds since the positions were true — the client dead-reckons from here */
      age: this.at ? Math.max(0, Math.floor(Date.now() / 1000) - this.at) : 0,
      stale: this.failures > 0,
      /** where the last good positions came from, so the UI never has to guess */
      source: this.source,
      /** only present once something has failed — see probeEgress */
      diag: this.diag && { ...this.diag, onAttempt: String(this.diagAt) },
      /** whether credentials reached this process — the id itself is never echoed */
      auth: this.authenticated ? 'account' : 'anonymous',
      /** why the feed is stale, when it is. never carries a credential. */
      lastError: this.lastError,
      count: this.flights.length,
      ...this.highlights(),
      /** compact rows, not objects — see Flight.toRow */
      rows: this.flights.map((f) => f.toRow()),
    };
  }

  // ---------- enrichment, cached forever

  /** aircraft type, registration, operator, photo. one lookup per airframe, ever. */
  async aircraft(icao: string) {
    const key = icao.toLowerCase();
    const hit = await this.aircraftCache.findOne({ icao: key }).lean();
    if (hit) return hit.info;
    let info = {};
    try {
      const res = await fetch(`https://api.adsbdb.com/v0/aircraft/${key}`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const a = (await res.json())?.response?.aircraft;
        if (a) info = {
          registration: a.registration, type: a.type, icaoType: a.icao_type,
          manufacturer: a.manufacturer, owner: a.registered_owner,
          photo: a.url_photo_thumbnail ?? a.url_photo ?? undefined,
        };
      }
    } catch { /* cache the miss so we don't hammer a free API */ }
    await this.aircraftCache.updateOne({ icao: key }, { icao: key, info, at: Date.now() }, { upsert: true });
    return info;
  }

  /** origin and destination, with coordinates — enough to draw the great circle. */
  async route(callsign: string) {
    const key = callsign.trim().toUpperCase();
    if (!key) return {};
    const hit = await this.routeCache.findOne({ callsign: key }).lean();
    if (hit) return hit.route;
    let route = {};
    try {
      const res = await fetch(`https://api.adsbdb.com/v0/callsign/${key}`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const r = (await res.json())?.response?.flightroute;
        const ap = (x: any) => x && {
          iata: x.iata_code, icao: x.icao_code, name: x.name,
          city: x.municipality, country: x.country_name, lat: x.latitude, lon: x.longitude,
        };
        if (r) route = { airline: r.airline?.name, origin: ap(r.origin), destination: ap(r.destination) };
      }
    } catch { /* ditto */ }
    await this.routeCache.updateOne({ callsign: key }, { callsign: key, route, at: Date.now() }, { upsert: true });
    return route;
  }

  addListener(fn: (payload: string) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private broadcast() {
    if (!this.listeners.size) return;
    const payload = `data: ${JSON.stringify(this.state())}\n\n`;
    for (const fn of this.listeners) fn(payload);
  }

  // ---------- accounts + watchlist

  async signup(email: string, name: string, rawPassword: string): Promise<User> {
    const clean = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) throw new Error('that email does not look right');
    if (rawPassword.length < 8) throw new Error('password must be at least 8 characters');
    if (await this.users.findOne({ email: clean })) throw new Error('an account with that email already exists');
    const doc: PlainUser = {
      id: randomUUID(), email: clean, name: name.trim().slice(0, 60) || 'Anonymous',
      passwordHash: User.hashPassword(rawPassword), createdAt: new Date().toISOString(),
    };
    await this.users.create(doc);
    return User.from(doc);
  }

  async login(email: string, rawPassword: string): Promise<User | undefined> {
    const doc = await this.users.findOne({ email: email.trim().toLowerCase() }).lean();
    if (!doc) return undefined;
    const user = User.from(doc as PlainUser);
    return (await user.verifyPassword(rawPassword)) ? user : undefined;
  }

  async watch(userId: string, icao: string, callsign: string) {
    await this.watches.updateOne(
      { userId, icao },
      { id: randomUUID(), userId, icao, callsign, createdAt: new Date().toISOString() },
      { upsert: true }
    );
  }

  async unwatch(userId: string, icao: string) { await this.watches.deleteOne({ userId, icao }); }

  async watchlist(userId: string) {
    const docs = await this.watches.find({ userId }).lean();
    return docs.map((d: any) => ({ icao: d.icao, callsign: d.callsign }));
  }
}
