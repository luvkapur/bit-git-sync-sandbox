import mongoose, { Schema, Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
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
const AUTH_TIMEOUT_MS = 30_000;
const STATES_TIMEOUT_MS = 90_000;

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
    ).catch((e) => { throw new Error(`auth request: ${e instanceof Error ? e.message : String(e)}`); });
    if (!res.ok) throw new Error(`auth ${res.status}`);
    const body = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: body.access_token, expires: Date.now() + (body.expires_in - 30) * 1000 };
    return this.token.value;
  }

  /**
   * One upstream request serves every connected browser. A thousand viewers
   * cost exactly as much as one, which is what makes a rate limit survivable
   * in public.
   */
  async poll(): Promise<void> {
    const url = 'https://opensky-network.org/api/states/all';
    try {
      const token = await this.accessToken();
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(STATES_TIMEOUT_MS),
      }).catch((e) => { throw new Error(`states request: ${e instanceof Error ? e.message : String(e)}`); });
      // 429 is the daily credit budget, not congestion. Retrying sooner cannot
      // succeed, so record it and let start() wait out a long window instead.
      if (res.status === 429) { this.limited = true; throw new Error('429 — upstream credit budget spent'); }
      if (!res.ok) throw new Error(`upstream ${res.status}`);
      const body = (await res.json()) as { time: number; states: unknown[][] | null };
      const flights = (body.states ?? [])
        .map((s) => Flight.fromStateVector(s as any))
        .filter((f): f is Flight => Boolean(f) && f!.isCruising);
      if (flights.length) {
        this.flights = flights;
        this.at = body.time ?? Math.floor(Date.now() / 1000);
        this.failures = 0;
        this.limited = false;
        this.source = token ? 'opensky:account' : 'opensky:anonymous';
        await this.snapshots.updateOne(
          { key: 'global' },
          { key: 'global', at: this.at, flights: flights.map((f) => f.toRow()) },
          { upsert: true }
        );
        this.broadcast();
      }
    } catch (e) {
      this.failures += 1;   // keep serving the last good snapshot
      this.lastError = e instanceof Error ? e.message : String(e);
      // Swallowing this is how a globe froze for ninety minutes while still
      // looking healthy. The snapshot is a fallback, not a success.
      console.warn(`[sky-api] poll failed (${this.failures}): ${this.lastError}`);
    }
  }

  /**
   * Poll on a schedule the upstream budget can actually pay for, backing off
   * when it complains. The browser dead-reckons between polls — Flight.project
   * advances each aircraft along its own heading at its own velocity — so a
   * longer interval costs the animation nothing, only positional truth.
   */
  start(baseMs = this.authenticated ? 90_000 : 15 * 60_000) {
    const tick = async () => {
      await this.poll();
      const wait = this.limited
        ? 30 * 60_000                                   // budget spent: wait, do not double
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
