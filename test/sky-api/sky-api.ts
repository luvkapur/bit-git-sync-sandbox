import mongoose, { Schema, Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { promises as dns } from 'node:dns';
import { Flight, PlainFlight } from '@luvktest/test.flight';
import { FeedSnapshot, RarityIndex } from '@luvktest/test.spot';
import type { FeedAircraft } from '@luvktest/test.spot';
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
  /**
   * when the address was proved.
   *
   * Optional, and absent means unconfirmed — which is also how rows written
   * before confirmation existed read. That is the safe reading: such an
   * account cannot sign in until its owner asks for a link and clicks it.
   */
  confirmedAt: { type: String, required: false },
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
 *
 * Deliberately round-robined across continents rather than grouped by them.
 * Grouped, the sweep spent its first two ticks entirely over North America and
 * the globe showed traffic there and nowhere else for minutes — which reads as a
 * broken map, not a filling one. Interleaved, any three consecutive circles span
 * three continents, so the first tick already looks like a planet.
 */
const ADSB_CIRCLES: [number, number][] = [
  [42, -74], [52, -1], [28, 77],   // north america, europe, asia
  [39, 33], [-23, -46], [33, -84],   // middle east, south, north america
  [40, -4], [13, 101], [25, 52],   // europe, asia, middle east
  [-33, 151], [41, -88], [47, 3],   // south, north america, europe
  [31, 118], [31, -97], [51, 10],   // asia, north america, europe
  [36, 139], [36, -119], [42, 12],   // asia, north america, europe
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

/** the least time between two request-driven fetches, so traffic cannot stampede the feed */
const REQUEST_FETCH_GAP_MS = 3_000;

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

/**
 * The accumulated rarity index — one row, rewritten on every good poll.
 *
 * This is where rarity survives a restart, and it has to live somewhere
 * because a single snapshot is not a sample. `RarityIndex` needs 250
 * observations before it will put a band on anything and 2,500 before it calls
 * its own confidence high, and a snapshot only counts the airframes whose
 * *type* enrichment has already resolved — a few dozen here, not three
 * thousand. Rebuilt from the current feed at every boot, the index would spend
 * hours answering `unknown` to every question the UI asks it, and every
 * restart would reset the clock.
 *
 * Counts are stored as pairs rather than as an object keyed by designator.
 * ICAO type designators happen to be safe Mongo keys today, and a schema that
 * is only correct because of a fact about the data is a schema waiting for the
 * one designator that has a dot in it.
 */
const raritySchema = new Schema({
  key: { type: String, required: true, unique: true },
  /** unix ms of the last fold */
  at: { type: Number, required: true },
  /** how many snapshots are behind these counts, for the log */
  snapshots: { type: Number, default: 0 },
  counts: { type: [{ _id: false, t: String, n: Number }], default: [] },
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
  /**
   * ICAO type designator per airframe, mirrored from the enrichment cache.
   *
   * The feed says where an aircraft is; it never says what it is. Rarity is
   * measured on the type, so the join has to happen somewhere, and doing it in
   * memory keeps it at map-lookup cost per aircraft instead of a query per
   * poll over three thousand rows.
   */
  private types = new Map<string, string>();
  /** the running index. See raritySchema for why it is not rebuilt each boot. */
  private rarityIndex = new RarityIndex();
  private rarityFolds = 0;

  constructor(
    private users: Model<PlainUser>,
    private watches: Model<any>,
    private snapshots: Model<any>,
    private aircraftCache: Model<any>,
    private routeCache: Model<any>,
    private rarityStore?: Model<any>
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
      m.Route || mongoose.model('Route', routeSchema),
      m.Rarity || mongoose.model('Rarity', raritySchema)
    );
  }

  /**
   * Remove accounts created against reserved test domains.
   *
   * RFC 2606 sets aside example.com, example.net and example.org precisely so
   * that documentation and probes cannot collide with a real address, so an
   * account on one is by definition not a person. This app gets prodded — by me,
   * to prove the hosted database really persists — and the leavings should not
   * outlive the proof.
   */
  async purgeProbeAccounts(): Promise<number> {
    const { deletedCount } = await this.users.deleteMany({
      email: { $regex: /@example\.(com|net|org)$/i },
    });
    if (deletedCount) console.warn(`[sky-api] removed ${deletedCount} probe account(s)`);
    return deletedCount ?? 0;
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
          (t) => {
            // The echoed address is this host's egress IP. It answers the
            // question completely, and `diag` is served on a public endpoint,
            // so the verdict goes in the response and the address goes to the
            // log where an operator can read it and a stranger cannot.
            console.warn(`[sky-api] ipv4 egress address: ${t.trim()}`);
            out.ipv4Only = 'ok';
          },
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
  private async pollAdsb(circles = ADSB_PER_TICK): Promise<boolean> {
    const kept = new Map<string, Flight>();
    // carry forward what earlier ticks found, so partial sweeps accumulate
    const cutoff = Math.floor(Date.now() / 1000) - ADSB_TTL_S;
    if (this.source.startsWith('adsb')) {
      for (const f of this.flights) if (f.d.seen > cutoff) kept.set(f.icao, f);
    }

    let answered = 0;
    for (let n = 0; n < circles; n += 1) {
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
      // pause between circles, but never after the last one — a request is
      // waiting on this and the pause would be pure added latency
      if (n < circles - 1) await new Promise((r) => { setTimeout(r, ADSB_SPACING_MS); });
    }

    if (!kept.size) {
      await this.noteFailure(new Error(`adsb sweep: nothing from ${circles} circles (answered ${answered})`));
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
  private lastFetch = 0;

  async ensureData(): Promise<void> {
    const now = Date.now();
    if (now - this.lastFetch < REQUEST_FETCH_GAP_MS) return this.refreshing;
    this.lastFetch = now;
    this.refreshing ??= (async () => {
      try {
        const empty = !this.flights.length;
        if (empty) await this.warm();                    // a snapshot another instance left
        // One circle is about a second; three only when there is nothing at all
        // to show. Every request advances the cursor, so the list is walked by
        // traffic rather than by a clock, and each pass refreshes what it finds.
        await this.pollAdsb(this.flights.length ? 1 : ADSB_PER_TICK);
      } finally {
        this.refreshing = undefined;
      }
    })();
    // Awaited, always. Work left running after the response is sent does not
    // survive on a host that suspends the process between requests — that is
    // exactly how the background timer came to do nothing at all.
    return this.refreshing;
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
    await this.foldRarity();
    this.broadcast();
  }

  /**
   * Fold this snapshot into the running rarity index and persist it.
   *
   * Once per good poll, which is minutes apart, so the write is free. `plus`
   * counts airframes, so a type accumulates by the airborne-hours it is
   * actually visible for — which is the right measure: the question a spotter
   * asks is how often they see one, not how many exist.
   *
   * Failing to persist is not allowed to fail the poll. The map is the product
   * and the index is a scoreboard; losing one fold costs the scoreboard a few
   * counts and nothing else.
   */
  private async foldRarity(): Promise<void> {
    this.rarityIndex = this.rarityIndex.plus(this.feedAircraft());
    this.rarityFolds += 1;
    if (!this.rarityStore) return;
    try {
      const counts = Object.entries(this.rarityIndex.toObject().counts).map(([t, n]) => ({ t, n }));
      await this.rarityStore.updateOne(
        { key: 'global' },
        { key: 'global', at: Date.now(), snapshots: this.rarityFolds, counts },
        { upsert: true }
      );
    } catch (e) {
      console.warn(`[sky-api] rarity index not persisted: ${e instanceof Error ? e.message : String(e)}`);
    }
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
    await this.warmTypes();
    await this.warmRarity();
  }

  /**
   * Mirror the enrichment cache into memory.
   *
   * Once at boot and then kept current by `aircraft()`, because this process is
   * the only thing that writes that collection. The cache is one row per
   * airframe anyone has ever looked at — tens of thousands at the very worst,
   * two strings each — so holding it is cheaper than the per-poll query that
   * would replace it.
   */
  private async warmTypes(): Promise<void> {
    const docs = await this.aircraftCache.find({}, { icao: 1, info: 1 }).lean();
    for (const doc of (docs as any[]) ?? []) {
      this.rememberType(doc?.icao, doc?.info);
    }
  }

  /**
   * The ICAO designator, not the marketing name.
   *
   * `icaoType` is `A320` / `B78X` / `A124`, which is what the index counts.
   * `type` is `A320 214`, a different string for every variant of the same
   * aircraft — counting those would split one common type into a dozen rare
   * ones and make an A320 look like a find.
   */
  private rememberType(icao: unknown, info: unknown): void {
    if (typeof icao !== 'string' || !icao) return;
    const i = (info ?? {}) as { icaoType?: unknown; type?: unknown };
    const designator = typeof i.icaoType === 'string' && i.icaoType.trim() ? i.icaoType : i.type;
    if (typeof designator === 'string' && designator.trim()) this.types.set(icao.toLowerCase(), designator.trim().toUpperCase());
  }

  /** Restore the accumulated index, so a restart does not reset every band to `unknown`. */
  private async warmRarity(): Promise<void> {
    if (!this.rarityStore) return;
    const doc = await this.rarityStore.findOne({ key: 'global' }).lean();
    const rows = (doc?.counts as { t?: unknown; n?: unknown }[]) ?? [];
    const counts: Record<string, number> = {};
    for (const row of rows) {
      if (typeof row?.t === 'string' && typeof row?.n === 'number' && row.n > 0) counts[row.t] = row.n;
    }
    this.rarityIndex = RarityIndex.from({ counts });
    this.rarityFolds = typeof doc?.snapshots === 'number' ? doc.snapshots : 0;
    if (this.rarityIndex.sampleSize) {
      console.log(`[sky-api] rarity index restored: ${this.rarityIndex.sampleSize} observations of ${this.rarityIndex.distinctTypes} types over ${this.rarityFolds} snapshots`);
    }
  }

  // ---------- the spotting ports
  //
  // Three small methods, and what they have in common is the point: the
  // spotting routes are handed the feed and a directory of names, never this
  // class. Nothing above them can reach a password hash or an email address
  // through a route that only ever needed to say who took a spot.

  /**
   * The feed as the spot rules want it: position from the transponder, type
   * from the enrichment cache, and an airframe with no resolved type left
   * without one rather than given a guess.
   */
  feedAircraft(): FeedAircraft[] {
    return this.flights.map((f) => ({
      icao: f.d.icao,
      callsign: f.callsign,
      type: this.types.get(f.d.icao.toLowerCase()),
      lat: f.d.lat,
      lon: f.d.lon,
      altitude: f.d.altitude,
      onGround: f.d.onGround,
      seen: f.d.seen,
    }));
  }

  /**
   * The current feed, indexed.
   *
   * Deliberately does **not** call `ensureData()`. That method falls back to
   * sweeping a single 250 nm circle, which on a process whose last good read
   * was the global feed would replace three thousand aircraft with a few
   * hundred over one city — and every spot attempt in the world would answer
   * `not-in-feed` for a minute. The poller keeps this current; a spot reads
   * what is there.
   */
  async snapshot(): Promise<FeedSnapshot> {
    return new FeedSnapshot(this.feedAircraft());
  }

  /** The accumulated index, not this snapshot's. See raritySchema. */
  async rarity(): Promise<RarityIndex> {
    return this.rarityIndex;
  }

  /**
   * Display names for a set of accounts.
   *
   * Projected to `id` and `name` — the address never leaves this method, and
   * the feed a stranger can read is built from what this returns.
   */
  async namesOf(ids: readonly string[]): Promise<Record<string, string>> {
    const wanted = [...new Set(ids)].filter(Boolean);
    if (!wanted.length) return {};
    const docs = await this.users.find({ id: { $in: wanted } }, { id: 1, name: 1, _id: 0 }).lean();
    const names: Record<string, string> = {};
    for (const doc of (docs as any[]) ?? []) {
      if (typeof doc?.id === 'string' && typeof doc?.name === 'string') names[doc.id] = doc.name;
    }
    return names;
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
    if (hit) {
      this.rememberType(key, hit.info);
      return hit.info;
    }
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
    // A newly resolved type is worth counting from the next poll on, so the
    // mirror is updated here rather than waiting for a restart to notice.
    this.rememberType(key, info);
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

  // ---------- accounts: the AccountStore port, and nothing more
  //
  // Every rule about who may sign up, how a password is checked and when an
  // address counts as proved lives in the auth provider. This class only
  // stores and retrieves, which is why swapping the provider does not touch it.

  /** find an account by its normalised address. */
  async findByEmail(email: string): Promise<User | undefined> {
    const doc = await this.users.findOne({ email: email.trim().toLowerCase() }).lean();
    return doc ? User.from(doc as PlainUser) : undefined;
  }

  /**
   * Find an account by id.
   *
   * Called on every authenticated request and every refresh, so that a session
   * cannot outlive the account it belongs to.
   */
  async findById(id: string): Promise<User | undefined> {
    const doc = await this.users.findOne({ id }).lean();
    return doc ? User.from(doc as PlainUser) : undefined;
  }

  /** persist a new account. The caller has already hashed the password. */
  async create(user: PlainUser): Promise<void> {
    await this.users.create(user);
  }

  /**
   * Mark an address proved, atomically.
   *
   * The `$exists: false` makes a second confirmation a no-op rather than a
   * second write, so the timestamp records the first click.
   */
  async markEmailConfirmed(userId: string, confirmedAt: string): Promise<boolean> {
    const result = await this.users.updateOne(
      { id: userId, confirmedAt: { $exists: false } },
      { $set: { confirmedAt } }
    );
    return result.modifiedCount === 1;
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
