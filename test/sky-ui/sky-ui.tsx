import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flight, type RouteInfo } from '@luvktest/test.flight';
import type { WatchArea } from '@luvktest/test.watch-area';
import { world } from './world.js';
import { useSession } from './sky-session.js';
import { SkyError, type RarityScore, type Watched, type WireSpot } from './sky-client.js';
import { AuthPanel, type AuthScreen } from './auth-panel.js';
import { Bar, FlightPhoto, RouteStrip, Slot, useFlightDetail } from './flight-detail.js';
import { RarityReadout, SpotAction, SpotFeed, SpotLog, useSpotFeed } from './spot-panel.js';
import { AreaDraftBar, AreaList, fmtLat, fmtLon, useAreas, type AreaDraft, type DraftReadout } from './area-panel.js';
import {
  EARTH_RADIUS_KM, arcKm, capCentreOnScreen, capHandlesOnScreen, capHolds, capInCam,
  dragOnSphere, traceCap, type CapCam,
} from './area-geom.js';
import { ACCENT, ALERT, AREA, INK, SHADOW, ago, km } from './sky-theme.js';
// A global stylesheet, deliberately not a CSS Module. It sets :root variables,
// html/body/#root and the .fadeUp/.softPulse animation classes the JSX names as
// plain strings. Named *.module.css, Vite treated it as a CSS Module: the class
// names were hashed so the string literals never matched, and — because nothing
// imported a hashed name — the side-effect-only import was tree-shaken out, so
// the build emitted no CSS at all and the app rendered on a white background.
import './sky-ui.css';
// Chrome and screen-reader styles for the globe view. Same rule, same reason.
import './sky-ui.globe.css';
// Motion and chrome for the account, spotting and watch-area panels. Same rule again.
import './sky-ui.panels.css';

/** Where the sky service is mounted, as seen by the browser.
 *  The simple platform's gateway routes to a service by its component name at
 *  the root (`/sky-api`). Symphony's browser runtime proxies `/api` to its own
 *  gateway, so there the same service sits one level down. The host says which;
 *  the component does not guess. */
const DEFAULT_API = '/sky-api';

export type SkyUiProps = {
  /** base path of the sky service. defaults to `/sky-api`. */
  apiBase?: string;
};

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

/** the altitude the ramp tops out at, in metres and in the feet a pilot reads */
const ALT_TOP_M = 13_000;
const ALT_TOP_FT = 43_000;

/** Sequential single hue, dark→light by altitude. One hue, never a rainbow.
 *
 *  The dark end used to be #184f95, which is 2.46:1 against the #08090B
 *  background — under the 3:1 floor for a mark that carries meaning, so the
 *  lowest-flying aircraft quietly dissolved into the void. The whole ramp is
 *  the original one rescaled in OKLab lightness so the bottom step clears 3:1
 *  (it is 3.06:1 now) while the spacing between steps and the top step are
 *  untouched. Still one hue — OKLab hue moves 3.4° across the eight steps,
 *  the same drift the original had — and still strictly monotonic in
 *  luminance, 0.1115 → 0.6331, which is what makes it readable as a magnitude. */
const ALT_RAMP = ['#275ea5', '#2a69b9', '#3276cc', '#3582e1', '#4290ee', '#5c9fee', '#89baf3', '#b7d3f6'];
const altStep = (m: number) => Math.min(7, Math.max(0, Math.floor((m / ALT_TOP_M) * 8)));
const altColour = (m: number) => ALT_RAMP[altStep(m)];

/** How old the positions are, in words a person reads. The raw seconds went
 *  straight to the screen, so a snapshot fifteen hours stale announced itself
 *  as "positions 54679s old" — a number nobody parses at a glance. */
function since(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  if (s < 90) return `${s}s`;
  if (s < 5400) return `${Math.round(s / 60)} min`;
  if (s < 172800) return `${Math.round(s / 3600)} hr`;
  return `${Math.round(s / 86400)} days`;
}

type Feed = {
  at: number; age: number; stale: boolean; count: number;
  highest?: { callsign: string; ft: number };
  fastest?: { callsign: string; kt: number };
  topCountries: { country: string; n: number }[];
  emergencies: any[][];
  rows: any[][];
};

/** orthographic globe. returns null for the far hemisphere, which is the culling. */
function makeProjection(lon0: number, lat0: number, R: number, cx: number, cy: number) {
  const sp = Math.sin(lat0 * DEG), cp = Math.cos(lat0 * DEG);
  return (lon: number, lat: number): [number, number] | null => {
    const dl = (lon - lon0) * DEG, la = lat * DEG;
    const sl = Math.sin(la), cl = Math.cos(la), cdl = Math.cos(dl);
    if (sp * sl + cp * cl * cdl <= 0) return null;            // behind the globe
    return [cx + R * cl * Math.sin(dl), cy - R * (cp * sl - sp * cl * cdl)];
  };
}

/** The inverse of the same orthographic projection: screen point → lon/lat, or
 *  null off the disc. This is what lets the wheel zoom towards whatever is under
 *  the pointer instead of always towards the middle of the screen. */
function unproject(x: number, y: number, lon0: number, lat0: number, R: number, cx: number, cy: number) {
  const dx = (x - cx) / R, dy = (cy - y) / R;
  const rho = Math.hypot(dx, dy);
  if (rho > 1) return null;                                   // off the globe
  if (rho < 1e-9) return { lon: lon0, lat: lat0 };
  const c = Math.asin(rho), sc = Math.sin(c), cc = Math.cos(c);
  const sp = Math.sin(lat0 * DEG), cp = Math.cos(lat0 * DEG);
  const lat = Math.asin(cc * sp + (dy * sc * cp) / rho) / DEG;
  const lon = lon0 + Math.atan2(dx * sc, rho * cc * cp - dy * sc * sp) / DEG;
  return { lon, lat };
}

/* ------------------------------------------------------------------------- *
 *  Geometry, projected the cheap way.
 *
 *  The old loop called sin/cos/cos on every one of the 10,574 coastline points
 *  every frame — four transcendentals a point, forty thousand a frame, for a
 *  dataset that never changes. None of that trigonometry depends on the camera:
 *  sin and cos of each point's own latitude and longitude are constants of the
 *  data, and the only camera-dependent term, cos/sin of (lon − lon0), is an
 *  angle-addition away from them. Precompute the four values per point once and
 *  a frame becomes multiplication and nothing else.
 *
 *  On top of that each ring carries a bounding cap — the unit vector of its
 *  centroid and the sine of its angular radius — so a ring wholly on the far
 *  side of the planet is rejected with three multiplies instead of being walked
 *  point by point. Roughly half the world is behind the globe at any moment.
 *
 *  Measured, 9,000 aircraft, 3366×2104 backing store: 0.81 ms → 0.13 ms.
 * ------------------------------------------------------------------------- */
type Packed = {
  slon: Float64Array; clon: Float64Array;
  slat: Float64Array; clat: Float64Array;
  start: Int32Array;                                     // ring i occupies [start[i], start[i+1])
  capX: Float64Array; capY: Float64Array; capZ: Float64Array;
  capSin: Float64Array;                                  // sine of the ring's angular radius
  closed: boolean;
};

function pack(rings: [number, number][][], closed: boolean): Packed {
  const n = rings.reduce((a, r) => a + r.length, 0);
  const p: Packed = {
    slon: new Float64Array(n), clon: new Float64Array(n),
    slat: new Float64Array(n), clat: new Float64Array(n),
    start: new Int32Array(rings.length + 1),
    capX: new Float64Array(rings.length), capY: new Float64Array(rings.length),
    capZ: new Float64Array(rings.length), capSin: new Float64Array(rings.length),
    closed,
  };
  let k = 0;
  for (let r = 0; r < rings.length; r++) {
    p.start[r] = k;
    let sx = 0, sy = 0, sz = 0;
    for (const [lon, lat] of rings[r]) {
      const la = lat * DEG, lo = lon * DEG;
      const cl = Math.cos(la), sl = Math.sin(la);
      p.slon[k] = Math.sin(lo); p.clon[k] = Math.cos(lo);
      p.slat[k] = sl; p.clat[k] = cl;
      sx += cl * Math.cos(lo); sy += cl * Math.sin(lo); sz += sl;
      k++;
    }
    const m = Math.hypot(sx, sy, sz) || 1;
    sx /= m; sy /= m; sz /= m;
    let minDot = 1;                                      // cosine of the cap radius
    for (let i = p.start[r]; i < k; i++) {
      const d = p.clat[i] * p.clon[i] * sx + p.clat[i] * p.slon[i] * sy + p.slat[i] * sz;
      if (d < minDot) minDot = d;
    }
    p.capX[r] = sx; p.capY[r] = sy; p.capZ[r] = sz;
    p.capSin[r] = Math.sqrt(Math.max(0, 1 - minDot * minDot));
  }
  p.start[rings.length] = k;
  return p;
}

let LAND: Packed | undefined;
let GRAT: Packed | undefined;

function graticuleRings(): [number, number][][] {
  const rings: [number, number][][] = [];
  for (let lat = -60; lat <= 60; lat += 30) {
    const ring: [number, number][] = [];
    for (let lon = -180; lon <= 180; lon += 3) ring.push([lon, lat]);
    rings.push(ring);
  }
  for (let lon = -180; lon < 180; lon += 30) {
    const ring: [number, number][] = [];
    for (let lat = -90; lat <= 90; lat += 3) ring.push([lon, lat]);
    rings.push(ring);
  }
  return rings;
}

type Cam = { sp: number; cp: number; sl0: number; cl0: number; vx: number; vy: number; vz: number };

/** Walk a packed ring set straight into the current path. No allocation, no
 *  transcendentals, and rings behind the planet are never visited at all.
 *  `smooth` rounds the corners once a zoom level makes the 110m source data's
 *  polygons visible, so zooming in buys curvature rather than bigger stairs. */
function tracePacked(ctx: CanvasRenderingContext2D, p: Packed, c: Cam, R: number, cx: number, cy: number, smooth: boolean) {
  const rings = p.start.length - 1;
  for (let r = 0; r < rings; r++) {
    const dot = p.capX[r] * c.vx + p.capY[r] * c.vy + p.capZ[r] * c.vz;
    if (dot < -p.capSin[r]) continue;                    // the whole ring is on the far side
    const a = p.start[r], b = p.start[r + 1];
    let on = false, px = 0, py = 0;
    for (let i = a; i < b; i++) {
      const sla = p.slat[i], cla = p.clat[i];
      const sdl = p.slon[i] * c.cl0 - p.clon[i] * c.sl0;  // sin(lon − lon0)
      const cdl = p.clon[i] * c.cl0 + p.slon[i] * c.sl0;  // cos(lon − lon0)
      if (c.sp * sla + c.cp * cla * cdl <= 0) { on = false; continue; }
      const X = cx + R * cla * sdl, Y = cy - R * (c.cp * sla - c.sp * cla * cdl);
      if (!on) { ctx.moveTo(X, Y); on = true; }
      else if (smooth) { ctx.quadraticCurveTo(px, py, (px + X) / 2, (py + Y) / 2); }
      else ctx.lineTo(X, Y);
      px = X; py = Y;
    }
    if (on && smooth) ctx.lineTo(px, py);
  }
}

/** The planet's body — atmosphere, ocean, the off-centre highlight — baked once
 *  into a texture and blitted at whatever radius the camera is at. Building the
 *  radial gradients cost a full-screen per-pixel evaluation on every frame; a
 *  scaled blit of a smooth gradient is indistinguishable and nearly free. */
function sphereTexture(): HTMLCanvasElement {
  const T = 1024, half = T / 2, Rt = half / 1.32;
  const cv = document.createElement('canvas');
  cv.width = T; cv.height = T;
  const g = cv.getContext('2d')!;
  const air = g.createRadialGradient(half, half, Rt * 0.985, half, half, half);
  air.addColorStop(0, 'rgba(126,178,244,0.26)');
  air.addColorStop(0.18, 'rgba(96,148,224,0.13)');
  air.addColorStop(0.52, 'rgba(56,94,175,0.045)');
  air.addColorStop(1, 'rgba(30,54,110,0)');
  g.fillStyle = air; g.fillRect(0, 0, T, T);
  const sea = g.createRadialGradient(half - Rt * 0.3, half - Rt * 0.35, Rt * 0.1, half, half, Rt);
  sea.addColorStop(0, '#141b2d');
  sea.addColorStop(0.62, '#0d1220');
  sea.addColorStop(1, '#07090F');
  g.beginPath(); g.arc(half, half, Rt, 0, TAU); g.fillStyle = sea; g.fill();
  return cv;
}

/** A field of very faint stars, so the globe reads as a body in space rather
 *  than a circle on a page. Rendered once per resize and blitted; it drifts a
 *  fraction of the globe's own rotation, which is what sells the parallax. */
function starTexture(w: number, h: number, dpr: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
  const g = cv.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  let seed = 0x5eed;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const n = Math.round((w * h) / 5200);
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h;
    const m = rnd();
    const r = 0.35 + m * m * 0.95;
    g.globalAlpha = 0.05 + m * m * 0.4;
    g.fillStyle = m > 0.94 ? '#d8e4f6' : '#ffffff';
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  return cv;
}

/* --------------------------------------------------------------------- */

const ZOOM_MIN = 0.75;
const ZOOM_MAX = 12;   // past this the 110m coastline is being magnified, not resolved
/** the largest circle a single drag may produce. Past this a "watch area" is
 *  most of the planet, and the cap maths, while still correct, stops being a
 *  useful thing to have drawn by hand. */
const DRAW_MAX_KM = 9000;
/** below this a drag is a mis-click, not a circle */
const DRAW_MIN_KM = 8;
/** how many in-area aircraft get an outline before the ring alone has to do it */
const AREA_OUTLINE_BUDGET = 1400;

/** degrees per second of idle rotation — the old `lon += 0.035` per frame, but
 *  expressed in time so it is the same speed on a 120 Hz panel as on a 60 Hz one */
const SPIN_DPS = 2.1;

/** one watch area, flattened to the five numbers the draw loop needs. */
type AreaLive = { id: string; name: string; lat: number; lon: number; radiusKm: number };

type Live = {
  flights: Flight[];
  sel: Flight | null;
  watched: Set<string>;
  route: RouteInfo | null;
  age: number;
  gotAt: number;
  ready: boolean;
  fresh: Set<string>;
  freshAt: number;
  reduced: boolean;
  /** the saved areas, drawn every frame and tested against every aircraft */
  areas: AreaLive[];
  /** true while the globe is in draw-an-area mode */
  areaMode: boolean;
  /** the circle being dragged out, or seeded for the keyboard, before it is named */
  draft: AreaDraft | null;
};

export function SkyUi({ apiBase = DEFAULT_API }: SkyUiProps = {}) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [live, setLive] = useState(false);
  const [sel, setSel] = useState<Flight | null>(null);
  /** Type, registration, operator, photograph, origin and destination — the
   *  two lookups the detail panel needs, joined so the panel resolves once
   *  instead of reflowing twice, cached per airframe so coming back to one is
   *  instant, and sequence-guarded so a slow answer for one aircraft can never
   *  be painted into another one's panel. See `useFlightDetail`. */
  const detail = useFlightDetail(apiBase, sel?.icao, sel?.d.callsign);
  const { info, route } = detail;
  /** The signed-in user, restored from the token pair in storage.
   *
   *  What is remembered is no longer a user id — that was enough when the
   *  watchlist endpoints took one in the path, and it is not enough now that
   *  they want a Bearer token and check it against the id. The client owns the
   *  pair, the refresh rule and the storage; this is the React-shaped view of
   *  it. `booting` is true only while a stored pair is being checked, so the
   *  header does not flash "Sign in" at somebody who is signed in. */
  const { client, user: me, booting } = useSession(apiBase);
  const [watching, setWatching] = useState<Watched[]>([]);
  /** which account screen is open, or null for none. See `AuthScreen`. */
  const [auth, setAuth] = useState<AuthScreen | null>(null);
  const openAuth = useCallback((screen: AuthScreen = { kind: 'signup' }) => setAuth(screen), []);

  /* --- spotting and watch areas ------------------------------------ */
  const feed$ = useSpotFeed(client, Boolean(me));
  const areas$ = useAreas(client, Boolean(me));
  /** which rail tab is showing */
  const [tab, setTab] = useState<'live' | 'log' | 'areas'>('live');
  /** the rail needs room; below this the globe gets the width instead */
  const [wide, setWide] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 1040));
  const [railOpen, setRailOpen] = useState(false);
  /** true while a drag on the globe defines a circle rather than rotating it */
  const [areaMode, setAreaMode] = useState(false);
  /** A finished circle, still on the globe and still adjustable, with the keep
   *  bar open beside it. This is not a modal state: the globe, the circle and
   *  every other control stay live while it is set. */
  const [editing, setEditing] = useState<AreaDraft | null>(null);
  /** A token, bumped whenever focus should move into the keep bar's name
   *  field: when the circle was finished with the keyboard, and on a second
   *  Enter. Never on a pointer gesture — a bar that steals the caret the
   *  moment you let go of a drag is the modal problem in a smaller costume,
   *  and on a phone it would throw up the on-screen keyboard as well. */
  const [nameFocus, setNameFocus] = useState(0);
  /** aircraft inside each area, counted by the draw loop and sampled from it */
  const [areaCounts, setAreaCounts] = useState<Record<string, number>>({});
  /** what a spot of the selected aircraft would be worth, before taking it */
  const [rarity, setRarity] = useState<RarityScore | undefined>(undefined);
  const [rarityBusy, setRarityBusy] = useState(false);
  /** Everything arrives at once or not at all. Without this the globe painted
   *  first, the aircraft a second later and the route line later still, which
   *  reads as three things breaking rather than one thing loading. */
  const [ready, setReady] = useState(false);
  /** the chrome steps back when the globe is left alone, and returns on any input */
  const [resting, setResting] = useState(false);
  const [zoomLabel, setZoomLabel] = useState(1);
  const [reduced, setReduced] = useState(false);
  const [say, setSay] = useState('');
  /** what just happened because somebody did something — kept apart from the
   *  running description of the globe, which would otherwise overwrite it on
   *  the next feed message. */
  const [did, setDid] = useState('');
  const [alertSay, setAlertSay] = useState('');
  const gotAt = useRef(Date.now());

  useEffect(() => {
    // The stylesheet honours this for the fade classes, but the canvas is not
    // CSS: a globe that rotates on its own, carries inertia and eases its zoom
    // is exactly the kind of motion this setting exists to stop, and only
    // JavaScript can see it. Reading the event's own `matches` rather than the
    // list's keeps the handler honest about which change it is responding to.
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = (e?: MediaQueryListEvent) => setReduced(e ? e.matches : mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const es = new EventSource(`${apiBase}/live`);
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.onmessage = (e) => { setFeed(JSON.parse(e.data)); gotAt.current = Date.now(); };
    return () => es.close();
  }, []);

  useEffect(() => { if (feed) setReady(true); }, [feed]);
  useEffect(() => {
    // if the feed never comes, show the globe anyway rather than a blank screen
    const t = setTimeout(() => setReady(true), 1400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!me) { setWatching([]); return; }
    let live = true;
    client.watchlist().then((w) => { if (live) setWatching(w); }).catch(() => { /* the map does not need it */ });
    return () => { live = false; };
  }, [client, me?.id]);

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 1040);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* --- the confirmation link lands here ----------------------------- *
   *  `authLinksFrom` points the email at `/auth/confirm?token=…` on the public
   *  URL, which is this app. Picking the token up on load is what turns that
   *  link into a screen rather than a raw JSON body.
   *
   *  The token is stripped from the address bar as soon as it is read: leaving
   *  it there means a refresh spends it a second time and the user is told the
   *  link is already used, which — having just used it themselves, correctly —
   *  reads as the app losing their confirmation.
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) return;
    setAuth({ kind: 'confirm', token });
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    } catch { /* an exotic URL is not worth failing the screen over */ }
  }, []);

  const flights = useMemo(() => (feed?.rows ?? []).map((r) => Flight.fromRow(r)), [feed]);
  const watched = useMemo(() => new Set(watching.map((w) => w.icao)), [watching]);
  const emergencies = useMemo(() => flights.filter((f) => f.emergency), [flights]);

  /** How unusual this airframe is, asked before anything is logged. A failure
   *  here is silent: the readout simply does not appear, and the button still
   *  works — the score is the server's to decide at the moment of the spot. */
  useEffect(() => {
    if (!sel || feed$.status === 'absent') { setRarity(undefined); return; }
    let live = true;
    setRarity(undefined); setRarityBusy(true);
    client.rarityOf(sel.icao)
      .then((r) => { if (live) setRarity(r); })
      .catch(() => {})
      .finally(() => { if (live) setRarityBusy(false); });
    return () => { live = false; };
  }, [client, sel?.icao, feed$.status]);

  /* ------------------------------------------------------------------ *
   *  Everything the draw loop reads lives behind one ref.
   *
   *  The loop used to be a useEffect over [flights, sel, watched, route,
   *  feed.age], so every server message and every click tore the animation
   *  down, re-ran resize() — which reallocates the backing store and wipes it
   *  — and started a fresh requestAnimationFrame chain. That is a dropped
   *  frame and a flash of empty canvas on a timer. The loop now mounts once
   *  and reads the newest data through this ref.
   * ------------------------------------------------------------------ */
  const liveRef = useRef<Live>({
    flights: [], sel: null, watched: new Set(), route: null,
    age: 0, gotAt: Date.now(), ready: false, fresh: new Set(), freshAt: 0, reduced: false,
    areas: [], areaMode: false, draft: null,
  });
  const seenRef = useRef<Set<string>>(new Set());
  /** counted inside the frame, sampled out of it — see the interval below */
  const areaCountRef = useRef<Record<string, number>>({});
  /** The three things the draw loop, which mounts once, needs to reach back
   *  into React for. Refs rather than dependencies: the loop's dep list must
   *  stay `[wake]`, and a callback that changed identity every render would be
   *  exactly the thing that used to tear the canvas down. */
  const commitRef = useRef<(d: AreaDraft, fromKeyboard?: boolean) => void>(() => {});
  const toggleAreaRef = useRef<() => void>(() => {});
  const sayRef = useRef<(m: string) => void>(() => {});
  /** throw the drawn circle away — Escape, on the canvas or in the bar */
  const discardRef = useRef<() => void>(() => {});
  /** put the caret in the keep bar's name field */
  const focusNameRef = useRef<() => void>(() => {});
  /** a name typed by somebody who turned out not to have an account yet */
  const keepName = useRef<string | null>(null);
  /** Where the draft landed on screen in the last frame, so the keep bar can
   *  anchor itself to the edge the circle is *not* near. Written every frame
   *  into the same object; React samples it on the bar's own timer. */
  const draftScreenRef = useRef({ y: 0, r: 0, h: 0, seen: false });

  useEffect(() => {
    const l = liveRef.current;
    // which aircraft are new since the last message — they fade in rather than blink on
    if (flights.length) {
      const next = new Set<string>();
      const fresh = new Set<string>();
      for (const f of flights) {
        next.add(f.icao);
        if (seenRef.current.size && !seenRef.current.has(f.icao)) fresh.add(f.icao);
      }
      l.fresh = fresh;
      l.freshAt = performance.now();
      seenRef.current = next;
    }
    l.flights = flights;
    l.age = feed?.age ?? 0;
    l.gotAt = gotAt.current;
  }, [flights, feed?.age]);

  useEffect(() => { liveRef.current.sel = sel; }, [sel]);
  useEffect(() => { liveRef.current.watched = watched; }, [watched]);
  useEffect(() => { liveRef.current.route = route ?? null; }, [route]);
  useEffect(() => { liveRef.current.ready = ready; }, [ready]);
  useEffect(() => { liveRef.current.reduced = reduced; }, [reduced]);

  /* --- watch areas, on their way into the frame --------------------- *
   *  Flattened to plain numbers and written through the same ref as everything
   *  else. The draw loop's dependency list stays `[wake]`: an area being added
   *  must not tear the canvas down and rebuild it, for exactly the reason a
   *  feed message must not.
   * ------------------------------------------------------------------ */
  const areaLive = useMemo<AreaLive[]>(
    () => areas$.areas.map((a) => ({ id: a.id, name: a.name, lat: a.centre.lat, lon: a.centre.lon, radiusKm: a.radiusKm })),
    [areas$.areas]
  );
  useEffect(() => { liveRef.current.areas = areaLive; }, [areaLive]);
  useEffect(() => { liveRef.current.areaMode = areaMode; }, [areaMode]);

  /** Entering draw mode seeds a circle on whatever the camera is looking at, so
   *  the mode is visible the instant it is on and is usable without a pointer.
   *  A circle that has been committed stays on the globe while it is being
   *  named — the dialog asks "how many aircraft are inside", and the answer has
   *  to keep being counted, quite apart from it being the obvious thing to
   *  still be able to see. */
  useEffect(() => {
    if (areaMode) { liveRef.current.draft = { lat: cam.current.lat, lon: cam.current.lon, radiusKm: 400 }; return; }
    if (!editing) liveRef.current.draft = null;
  }, [areaMode, editing]);

  /** Counting happens per frame; re-rendering does not. A second is plenty for
   *  a number next to a list, and it keeps 60 renders a second off the table. */
  useEffect(() => {
    if (!areaLive.length && !areaMode && !editing) { setAreaCounts({}); return; }
    setAreaCounts({ ...areaCountRef.current });
    const id = setInterval(() => setAreaCounts({ ...areaCountRef.current }), 900);
    return () => clearInterval(id);
  }, [areaLive.length, areaMode, Boolean(editing)]);

  useEffect(() => {
    /* Finishing a drag does not open anything over the globe. The circle stays
     * where it was drawn, stays pinned so it no longer rides the camera, and
     * stays adjustable; the mode ends, because from here a drag inside the
     * circle moves it and a drag outside rotates the planet, and that is only
     * unambiguous once "every drag draws a new circle" is switched off. */
    commitRef.current = (d: AreaDraft, fromKeyboard = false) => {
      liveRef.current.draft = { lat: d.lat, lon: d.lon, radiusKm: d.radiusKm, pinned: true };
      setEditing({ lat: d.lat, lon: d.lon, radiusKm: d.radiusKm });
      setNameFocus(fromKeyboard ? Date.now() : 0);
      setAreaMode(false);
      setDid(`Area drawn: ${km(d.radiusKm)} radius at ${fmtLat(d.lat)} ${fmtLon(d.lon)}. Drag inside it to move it, drag its edge to resize it, or name it and press Keep.`);
    };
    discardRef.current = () => {
      if (!liveRef.current.draft?.pinned) return;
      liveRef.current.draft = null;
      keepName.current = null;
      setEditing(null);
      setDid('Area discarded.');
    };
    toggleAreaRef.current = () => {
      // Starting a fresh circle replaces the one on screen, so say so rather
      // than letting it vanish without a word.
      if (liveRef.current.draft?.pinned) { discardRef.current(); }
      setAreaMode((m) => {
        setDid(m ? 'Left area drawing.' : 'Area drawing on. Drag on the globe, or use the arrow keys to aim, square brackets to resize and Enter to keep.');
        return !m;
      });
    };
    focusNameRef.current = () => setNameFocus(Date.now());
    sayRef.current = setDid;
  });

  /* Escape discards the circle from wherever focus happens to be. The canvas
   * and the bar each handle it themselves and mark the event handled; this is
   * only for the case where focus is on neither — a browser chrome click, a
   * button in the rail — where otherwise the one key that undoes a drawn
   * circle would silently do nothing. */
  useEffect(() => {
    if (!editing) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      discardRef.current();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [editing]);

  /* --- camera ------------------------------------------------------- */
  const cam = useRef({
    lon: 10, lat: 22,
    vLon: 0, vLat: 0,                 // degrees per second, for the flick
    zoom: 1, zoomTarget: 1,
    pullLon: 0, pullLat: 0,           // rotation still owed to a zoom-at-cursor
    spin: 1,                          // 0…1 blend of the idle rotation
    restAt: 0,                        // when the idle rotation may return
    dragging: false,
  });
  /** the geometry the last frame was drawn with — picking has to agree with it */
  const viewRef = useRef({ w: 0, h: 0, R: 0, cx: 0, cy: 0 });
  /** which way the pointer is being used, so the cursor can say so */
  const grabbing = useRef(false);

  /* --- chrome that gets out of the way ------------------------------ */
  const wakeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const holdChrome = useRef(false);
  const wake = useCallback(() => {
    setResting(false);
    if (wakeTimer.current) clearTimeout(wakeTimer.current);
    wakeTimer.current = setTimeout(() => { if (!holdChrome.current) setResting(true); }, 4200);
  }, []);
  const busyChrome = Boolean(sel) || Boolean(auth) || Boolean(editing) || areaMode || railOpen;
  useEffect(() => { holdChrome.current = busyChrome; if (busyChrome) wake(); }, [busyChrome, wake]);
  useEffect(() => { wake(); return () => { if (wakeTimer.current) clearTimeout(wakeTimer.current); }; }, [wake]);

  /* --- announcements ------------------------------------------------ */
  useEffect(() => {
    if (!ready) return;
    if (!sel) { setSay(`${(feed?.count ?? 0).toLocaleString()} aircraft airborne. Globe ready. Arrow keys rotate, plus and minus zoom.`); return; }
    // Said once, composed, for the same reason the panel is drawn once: the
    // enrichment joins at ~150 ms, so waiting for it costs nothing and saves
    // announcing a half-described aircraft and then describing it again. If it
    // is slower than that, `waiting` releases the partial description rather
    // than leaving a screen reader with silence.
    if (!detail.ready && !detail.waiting) return;
    const bits = [
      `Selected ${sel.callsign}`,
      route?.airline ?? info?.owner ?? sel.d.country,
      info?.type ? `${info.manufacturer ?? ''} ${info.type}`.trim() : '',
      `${sel.altitudeFt.toLocaleString()} feet`,
      `${sel.knots} knots`,
      `heading ${Math.round(sel.d.heading)} degrees`,
      sel.phase === 'cruising' ? 'level' : `${sel.climbFpm > 0 ? 'climbing' : 'descending'} ${Math.abs(sel.climbFpm).toLocaleString()} feet per minute`,
      route?.origin && route?.destination ? `${route.origin.city} to ${route.destination.city}` : '',
      sel.emergency ? `Emergency: ${sel.emergency}, squawking ${sel.d.squawk}` : '',
    ].filter(Boolean);
    setSay(`${bits.join('. ')}.`);
  }, [sel?.icao, info, route, ready, feed?.count, detail.ready, detail.waiting]);

  const emCount = emergencies.length;
  const emSeen = useRef(-1);
  useEffect(() => {
    if (emSeen.current === emCount) return;
    const first = emSeen.current < 0;
    emSeen.current = emCount;
    if (first || !emCount) return;
    setAlertSay(`${emCount} aircraft squawking an emergency code.`);
  }, [emCount]);

  /* ------------------------------------------------------------------ *
   *  The render loop. Mounted once, never torn down.
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const el = cv.current; if (!el) return;
    const ctx = el.getContext('2d', { alpha: true })!;
    LAND ||= pack(world, true);
    GRAT ||= pack(graticuleRings(), false);
    const land = LAND, grat = GRAT;
    const sphere = sphereTexture();
    let stars: HTMLCanvasElement | null = null;

    const size = { w: 0, h: 0, dpr: 0 };
    let sizeDirty = true;
    const ro = new ResizeObserver(() => { sizeDirty = true; });
    ro.observe(el);
    const onDpr = () => { sizeDirty = true; };
    window.addEventListener('resize', onDpr);

    const fit = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      // Cap the backing store, not the ratio. `Math.min(2, dpr)` was the wrong
      // knob: it costs a 3× phone its crispness and does nothing for a 5K
      // desktop. What has to be bounded is pixels rasterised per frame, and
      // that ceiling is measurable. Stepping this canvas up on an M1 Max:
      // 7.1 Mpx and 11.1 Mpx both hold a 16.7 ms frame, 15.9 Mpx starts
      // missing vsync, 28.3 Mpx collapses to 28 ms. 12 Mpx is under the knee
      // with room for a slower GPU, and it leaves every display in play at its
      // native ratio — a 3456×2234 laptop panel is 7.7 Mpx at 2×, a 4K panel
      // 8.3 Mpx at 2×, a 3× phone about 3 Mpx. Only a 5K desktop is scaled
      // back, and then to 1.8× rather than to 1×.
      let dpr = Math.min(window.devicePixelRatio || 1, 3);
      const budget = 12.0e6;
      if (w * h * dpr * dpr > budget) dpr = Math.max(1, Math.sqrt(budget / (w * h)));
      const bw = Math.max(1, Math.round(w * dpr)), bh = Math.max(1, Math.round(h * dpr));
      if (el.width !== bw || el.height !== bh) { el.width = bw; el.height = bh; stars = null; }
      size.w = w; size.h = h; size.dpr = bw / w;
      if (!stars) stars = starTexture(w, h, Math.min(size.dpr, 2));
      ctx.setTransform(bw / w, 0, 0, bh / h, 0, 0);
      sizeDirty = false;
    };

    /* --- input -------------------------------------------------------- */
    const pointers = new Map<number, { x: number; y: number }>();
    /** true while this drag is defining a watch area rather than rotating */
    let drawing = false;
    let drawCentre = { lat: 0, lon: 0 };
    /* --- direct manipulation of a circle already drawn ----------------- *
     *  A pinned draft is an object on the globe, not a decision already
     *  taken: `move` carries it, `resize` grows it, and which one you get is
     *  decided by where the pointer went down relative to its own ring.
     * ------------------------------------------------------------------ */
    type Grip = 'move' | 'resize';
    let adjust: Grip | null = null;
    /** what the pointer went down on, and what the circle was then. Held so a
     *  move is one rotation from the grab rather than an accumulation of
     *  per-event deltas, which drifts. */
    let grabAt = { lat: 0, lon: 0 };
    let grabCentre = { lat: 0, lon: 0 };
    /** what the pointer is over right now, so the frame can show it */
    let hover: Grip | null = null;
    /** Say it one paint later.
     *
     *  The aircraft count is tallied inside the frame, so at the instant a
     *  drag or a key press changes the circle the count still belongs to the
     *  circle's previous size — and a live region that quotes it announces a
     *  number that was never on screen. One frame's grace fixes that, and
     *  because the timer is shared it also stops a held-down bracket key from
     *  queueing forty announcements. */
    let sayTimer: ReturnType<typeof setTimeout> | undefined;
    const sayLater = (make: () => string) => {
      clearTimeout(sayTimer);
      sayTimer = setTimeout(() => sayRef.current(make()), 120);
    };
    /** aircraft inside each area, tallied in the frame. The same object every
     *  frame — React samples a copy of it on a timer, never per frame. */
    const tally: Record<string, number> = {};
    let pinchDist = 0;
    let downAt = 0, downX = 0, downY = 0, moved = 0;
    let lastMoveT = 0;
    let gestureGuard = 0;         // Safari sends gesture events *and* wheel; take one

    const rel = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    /** Where on the globe a screen point is, if it is on the globe at all.
     *  Latitude is clamped before it leaves: `unproject` can return 90.0000001
     *  from rounding, and the geo helpers reject that rather than folding it. */
    const geoAt = (x: number, y: number) => {
      const v = viewRef.current;
      if (!(v.R > 0)) return null;
      const g = unproject(x, y, cam.current.lon, cam.current.lat, v.R, v.cx, v.cy);
      return g ? { lat: Math.max(-89.999, Math.min(89.999, g.lat)), lon: g.lon } : null;
    };

    /** Which handle of the drawn circle is under this screen point, if any.
     *
     *  Measured in kilometres on the sphere rather than in pixels on the
     *  screen, using the same `arcKm` the drag itself uses, so the hit test
     *  agrees with the ring exactly — including where the ring is foreshortened
     *  near the limb, where a pixel-radius test would be wrong by a factor of
     *  two. The grab band is a screen distance converted to kilometres, so it
     *  stays about thirteen pixels wide at every zoom level, and it is capped
     *  at two fifths of the radius so a small circle keeps an interior to
     *  grab. */
    const hitDraft = (x: number, y: number): Grip | null => {
      const d = liveRef.current.draft;
      const v = viewRef.current;
      if (!d || !d.pinned || !(d.radiusKm > 0) || !(v.R > 0)) return null;
      const g = geoAt(x, y);
      if (!g) return null;
      const kmPerPx = EARTH_RADIUS_KM / v.R;
      const band = Math.min(13 * kmPerPx, d.radiusKm * 0.4);
      const dist = arcKm(d, g);
      if (dist >= d.radiusKm - band && dist <= d.radiusKm + band) return 'resize';
      return dist < d.radiusKm ? 'move' : null;
    };

    /** The cursor, whenever nothing is being dragged. Three gestures share this
     *  canvas and a fourth now shares the circle, so the pointer has to say
     *  which one it is about to start before it starts it. */
    const restCursor = (x?: number, y?: number) => {
      hover = x === undefined || y === undefined ? null : hitDraft(x, y);
      el.style.cursor = hover === 'move' ? 'move'
        : hover === 'resize' ? 'nwse-resize'
          : liveRef.current.areaMode ? 'crosshair' : 'grab';
    };
    el.style.cursor = 'grab';

    /** Leave draw mode's grip on the camera without leaving draw mode. */
    const endDraw = (x?: number, y?: number) => {
      drawing = false;
      adjust = null;
      cam.current.restAt = performance.now() + 2600;
      grabbing.current = false;
      restCursor(x, y);
    };

    /** Zoom by `factor`, keeping whatever is under (x, y) where it is.
     *  In an orthographic projection a point θ from the centre sits at R·sin θ;
     *  to hold it still while R becomes kR the camera has to rotate towards it
     *  by θ(1 − 1/k). That rotation is queued, not applied, so the globe eases
     *  into it instead of snapping. */
    const zoomAt = (factor: number, x: number, y: number) => {
      const c = cam.current, v = viewRef.current;
      const prev = c.zoomTarget;
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev * factor));
      if (next === prev) return;
      const geo = v.R > 0 ? unproject(x, y, c.lon, c.lat, v.R, v.cx, v.cy) : null;
      c.zoomTarget = next;
      if (geo) {
        const f = 1 - prev / next;
        let dLon = geo.lon - c.lon;
        while (dLon > 180) dLon -= 360;
        while (dLon < -180) dLon += 360;
        c.pullLon += dLon * f;
        c.pullLat += (geo.lat - c.lat) * f;
      }
      setZoomLabel(Math.round(next * 10) / 10);
      wake();
    };

    const onWheel = (e: WheelEvent) => {
      // Without preventDefault the page zooms underneath the globe, and React's
      // onWheel is registered passive so it cannot do this — hence a direct,
      // explicitly non-passive listener on the canvas.
      e.preventDefault();
      if (performance.now() < gestureGuard) return;
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;                 // reported in lines
      else if (e.deltaMode === 2) dy *= size.h;        // reported in pages
      dy = Math.max(-240, Math.min(240, dy));
      // A macOS trackpad pinch arrives as a wheel event with ctrlKey set, and
      // its deltas are an order of magnitude smaller than a mouse wheel's, so
      // they get their own gain rather than one constant tuned for neither.
      // 0.0018 puts a mouse detent at 1.24×; 0.01 makes a pinch track the
      // fingers without running away.
      const k = e.ctrlKey ? 0.010 : 0.0018;
      zoomAt(Math.exp(-dy * k), e.clientX, e.clientY);
    };

    // Safari's non-standard pinch. Cheap to support, so supported.
    let gScale = 1;
    const onGestureStart = (e: any) => { e.preventDefault(); gScale = e.scale || 1; gestureGuard = performance.now() + 400; };
    const onGestureChange = (e: any) => {
      e.preventDefault();
      gestureGuard = performance.now() + 400;
      const s = e.scale || 1;
      if (gScale > 0) zoomAt(s / gScale, e.clientX, e.clientY);
      gScale = s;
    };
    const onGestureEnd = (e: any) => { e.preventDefault(); gestureGuard = performance.now() + 400; };

    const onDown = (e: PointerEvent) => {
      el.setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
      const c = cam.current;
      const l0 = liveRef.current;
      const p = rel(e);
      downAt = performance.now(); lastMoveT = downAt; moved = 0;
      downX = p.x; downY = p.y;

      // A second finger is always a pinch, never a circle. The reticle comes
      // back rather than vanishing — the mode did not end, only this gesture.
      if (pointers.size > 1 && drawing) {
        endDraw();
        l0.draft = l0.areaMode ? { lat: c.lat, lon: c.lon, radiusKm: 400 } : null;
      }
      // A second finger on a circle being adjusted is a pinch too. The circle
      // keeps whatever it had reached; nothing is thrown away.
      if (pointers.size > 1 && adjust) endDraw();

      /* A circle that has been drawn but not yet kept is a thing you can take
       * hold of. Inside it, the drag carries it; on its ring, the drag grows
       * it. This is tested before draw mode and before rotation, because the
       * circle is the nearest object to the pointer and the one the pointer is
       * most likely to mean. */
      if (pointers.size === 1) {
        const grip = hitDraft(p.x, p.y);
        const g = grip ? geoAt(p.x, p.y) : null;
        const d = liveRef.current.draft;
        if (grip && g && d) {
          adjust = grip;
          grabAt = g;
          grabCentre = { lat: d.lat, lon: d.lon };
          c.dragging = false; c.vLon = 0; c.vLat = 0; c.spin = 0;
          c.restAt = Infinity;                 // the globe holds still while you adjust
          grabbing.current = true;
          el.style.cursor = grip === 'move' ? 'move' : 'nwse-resize';
          wake();
          return;
        }
      }

      /* Draw mode, or Shift held: this drag defines a spherical cap instead of
       * rotating the globe. Two affordances for the same gesture — a toolbar
       * toggle that is visible, and a modifier for someone who already knows —
       * and neither one fights the other two gestures: rotation is simply not
       * armed on this pointer, and a pinch cancels the circle outright. */
      if (pointers.size === 1 && (l0.areaMode || e.shiftKey)) {
        const g = geoAt(p.x, p.y);
        if (g) {
          drawing = true;
          drawCentre = g;
          l0.draft = { ...g, radiusKm: 0, pinned: true };
          c.dragging = false; c.vLon = 0; c.vLat = 0; c.spin = 0;
          c.restAt = Infinity;                 // the globe holds still while you draw
          grabbing.current = true; el.style.cursor = 'crosshair';
          wake();
          return;
        }
      }

      c.dragging = true; c.vLon = 0; c.vLat = 0; c.spin = 0; c.restAt = performance.now() + 2600;
      grabbing.current = true; el.style.cursor = 'grabbing';
      wake();
    };

    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) {
        // Nothing held down: this move exists to say what a press would do.
        if (e.movementX || e.movementY) wake();
        if (!drawing && !adjust && !cam.current.dragging) { const h = rel(e); restCursor(h.x, h.y); }
        return;
      }
      const c = cam.current, v = viewRef.current;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size >= 2) {
        // two fingers: pinch to zoom about the midpoint, and drag the midpoint
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0 && d > 0) zoomAt(d / pinchDist, (a.x + b.x) / 2, (a.y + b.y) / 2);
        pinchDist = d;
        return;
      }

      if (adjust) {
        /* Moving carries the circle by the rotation that takes the point the
         * pointer went down on to the point it is over now, recomputed from the
         * grab every time rather than accumulated, so a slow drag and a fast
         * one land in the same place. Resizing leaves the centre alone and
         * measures out to the pointer — the same `arcKm` that drew it. */
        const p = rel(e);
        const g = geoAt(p.x, p.y);
        const d = liveRef.current.draft;
        if (g && d) {
          if (adjust === 'move') {
            const n = dragOnSphere(grabCentre, grabAt, g);
            d.lat = Math.max(-89.999, Math.min(89.999, n.lat));
            d.lon = ((n.lon + 540) % 360) - 180;
          } else {
            d.radiusKm = Math.max(DRAW_MIN_KM, Math.min(DRAW_MAX_KM, arcKm(d, g)));
          }
        }
        moved += Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y);
        lastMoveT = performance.now();
        c.restAt = Infinity;
        wake();
        return;
      }

      if (drawing) {
        // The radius is the great-circle distance from the pressed point to the
        // pointer — the same measure `WatchArea` will use, so what is drawn is
        // exactly what is stored, date line and poles included.
        const p = rel(e);
        const g = geoAt(p.x, p.y);
        if (g) {
          const r = arcKm(drawCentre, g);
          liveRef.current.draft = { ...drawCentre, radiusKm: Math.max(0, Math.min(r, DRAW_MAX_KM)), pinned: true };
        }
        moved += Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y);
        lastMoveT = performance.now();
        c.restAt = Infinity;
        wake();
        return;
      }

      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      moved += Math.abs(dx) + Math.abs(dy);
      // degrees per pixel falls as the globe grows, so a drag moves the same
      // piece of ocean under the finger at every zoom level
      const k = v.R > 0 ? 118 / v.R : 0.32;
      const dLon = -dx * k;
      const dLat = dy * k * 0.88;
      c.lon += dLon;
      c.lat = Math.max(-85, Math.min(85, c.lat + dLat));
      const now = performance.now();
      const dt = Math.max(8, now - lastMoveT) / 1000;
      lastMoveT = now;
      if (!liveRef.current.reduced) {
        // an exponential average, so one jittery sample cannot launch the globe
        c.vLon = c.vLon * 0.72 + (dLon / dt) * 0.28;
        c.vLat = c.vLat * 0.72 + (dLat / dt) * 0.28;
      }
      c.restAt = now + 2600;
      wake();
    };

    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      if (adjust && pointers.size === 0) {
        const grip = adjust;
        const d = liveRef.current.draft;
        const p = rel(e);
        endDraw(p.x, p.y);
        // A press that did not move is not an adjustment — it is still a click
        // on whatever aircraft is under it, and an area big enough to be worth
        // drawing is an area full of aircraft you must still be able to pick.
        if (performance.now() - downAt < 420 && moved < 6) { pickAt(downX, downY); return; }
        if (d) sayLater(() => (grip === 'move'
          ? `Area moved to ${fmtLat(d.lat)} ${fmtLon(d.lon)}. ${(areaCountRef.current.__draft ?? 0).toLocaleString()} aircraft inside.`
          : `Radius ${km(d.radiusKm)}. ${(areaCountRef.current.__draft ?? 0).toLocaleString()} aircraft inside.`));
        return;
      }
      if (drawing && pointers.size === 0) {
        const l0 = liveRef.current;
        const d = l0.draft;
        const p = rel(e);
        // A tap is not a circle. Anything under the floor drops back to the
        // seeded reticle rather than opening anything nobody asked for.
        const kept = Boolean(d && d.radiusKm >= DRAW_MIN_KM);
        if (!kept) l0.draft = l0.areaMode ? { lat: cam.current.lat, lon: cam.current.lon, radiusKm: 400 } : null;
        // The cursor is settled against the finished circle, so the pointer is
        // already saying "this edge resizes" at the moment the button comes up.
        endDraw(p.x, p.y);
        if (kept && d) commitRef.current({ lat: d.lat, lon: d.lon, radiusKm: d.radiusKm });
        return;
      }
      if (pointers.size > 0) return;
      const c = cam.current;
      c.dragging = false;
      grabbing.current = false;
      { const p = rel(e); restCursor(p.x, p.y); }
      c.restAt = performance.now() + 2600;
      if (performance.now() - lastMoveT > 90) { c.vLon = 0; c.vLat = 0; }   // let go of a held globe
      const quick = performance.now() - downAt < 420 && moved < 6;
      if (quick) pickAt(downX, downY);
    };

    const onCancel = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      pinchDist = 0;
      if (adjust) { endDraw(); return; }
      if (drawing) { endDraw(); liveRef.current.draft = liveRef.current.areaMode ? { lat: cam.current.lat, lon: cam.current.lon, radiusKm: 400 } : null; return; }
      cam.current.dragging = pointers.size > 0;
      if (!pointers.size) { grabbing.current = false; restCursor(); }
    };

    const pickAt = (mx: number, my: number) => {
      const v = viewRef.current, l = liveRef.current;
      if (!v.R) return;
      const P = makeProjection(cam.current.lon, cam.current.lat, v.R, v.cx, v.cy);
      const t = (Date.now() - l.gotAt) / 1000 + l.age;
      let best: Flight | null = null, bd = 16;
      for (const f of l.flights) {
        const pos = f.project(t); const p = P(pos.lon, pos.lat); if (!p) continue;
        const d = Math.hypot(p[0] - mx, p[1] - my);
        // an aircraft in distress wins a tie — it is the one you meant
        const w = f.emergency ? d * 0.55 : d;
        if (w < bd) { bd = w; best = f; }
      }
      setSel(best);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('gesturestart', onGestureStart as EventListener);
    el.addEventListener('gesturechange', onGestureChange as EventListener);
    el.addEventListener('gestureend', onGestureEnd as EventListener);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    // A pointer that has left cannot be hovering anything, and a ring left
    // lit up after the mouse is gone is a ring telling a lie.
    const onLeave = () => { if (!drawing && !adjust && !cam.current.dragging) restCursor(); };
    el.addEventListener('pointerleave', onLeave);

    /* --- keyboard parity --------------------------------------------- */
    const onKey = (e: KeyboardEvent) => {
      const c = cam.current;
      const big = e.shiftKey ? 3 : 1;
      let used = true;
      /* An arrow means "move the thing that is selected". Before a circle is
       * pinned that thing is the camera, and the reticle rides it — which is
       * how a keyboard aims. Once a circle is pinned the thing is the circle,
       * which is exactly what the pointer now does too: the two paths are the
       * same gesture on the same object, not two different features. The step
       * shrinks as the globe grows, so a key press covers the same amount of
       * screen at every zoom level, and longitude is divided by cos(lat) so it
       * does not accelerate towards the poles. */
      const pinned = liveRef.current.draft?.pinned ? liveRef.current.draft : null;
      const nudge = (dLat: number, dLon: number) => {
        const d = pinned!;
        const step = Math.max(0.12, 5.5 / c.zoom) * big;
        d.lat = Math.max(-89.999, Math.min(89.999, d.lat + dLat * step));
        d.lon = ((d.lon + dLon * step / Math.max(0.12, Math.cos(d.lat * DEG)) + 540) % 360) - 180;
        sayLater(() => `Area at ${fmtLat(d.lat)} ${fmtLon(d.lon)}. ${(areaCountRef.current.__draft ?? 0).toLocaleString()} aircraft inside.`);
      };
      switch (e.key) {
        case 'ArrowLeft': pinned ? nudge(0, -1) : (c.pullLon -= 9 * big); break;
        case 'ArrowRight': pinned ? nudge(0, 1) : (c.pullLon += 9 * big); break;
        case 'ArrowUp': pinned ? nudge(1, 0) : (c.pullLat += 6 * big); break;
        case 'ArrowDown': pinned ? nudge(-1, 0) : (c.pullLat -= 6 * big); break;
        case '+': case '=': zoomAt(1.35 * big, size.w / 2, size.h / 2); break;
        case '-': case '_': zoomAt(1 / (1.35 * big), size.w / 2, size.h / 2); break;
        case '0': case 'Home': c.zoomTarget = 1; c.pullLat = 22 - c.lat; setZoomLabel(1); break;
        // space parks the idle rotation, which is also the quickest way for
        // someone who finds the drift uncomfortable to make it stop
        case ' ': c.restAt = c.restAt <= performance.now() ? Infinity : 0; break;
        /* --- watch areas, without a pointer ---------------------------- *
         *  The same three steps a drag performs, spread over three keys: aim
         *  by rotating (the unpinned reticle rides the camera centre), size
         *  with the brackets, keep with Enter. This is parity, not a lesser
         *  path — it is also the fastest way to place a circle exactly on a
         *  coordinate. `A` toggles the mode, which is the toolbar button.
         * -------------------------------------------------------------- */
        case 'a': case 'A': toggleAreaRef.current(); break;
        case '[': case ']': {
          const d = liveRef.current.draft;
          if (!d) { used = false; break; }
          const f = e.key === ']' ? 1.3 : 1 / 1.3;
          d.radiusKm = Math.max(DRAW_MIN_KM, Math.min(DRAW_MAX_KM, d.radiusKm * f));
          sayLater(() => `Radius ${km(d.radiusKm)}. ${(areaCountRef.current.__draft ?? 0).toLocaleString()} aircraft inside.`);
          break;
        }
        case 'Enter': {
          const d = liveRef.current.draft;
          if (!d || d.radiusKm < DRAW_MIN_KM) { used = false; break; }
          // Enter finishes the circle; a second Enter, once the keep bar is
          // open, walks into the name field so the whole thing can be kept
          // without ever reaching for a pointer.
          if (d.pinned && !liveRef.current.areaMode) { focusNameRef.current(); break; }
          if (!liveRef.current.areaMode) { used = false; break; }
          commitRef.current({ lat: d.lat, lon: d.lon, radiusKm: d.radiusKm }, true);
          break;
        }
        // Escape backs out of one thing at a time: the drawn circle first, then
        // drawing, then the selection. A key that closes two things at once is
        // a key you cannot use to close one.
        case 'Escape':
          if (liveRef.current.draft?.pinned && !liveRef.current.areaMode) { discardRef.current(); break; }
          if (liveRef.current.areaMode) { toggleAreaRef.current(); break; }
          setSel(null);
          break;
        default: used = false;
      }
      if (used) {
        e.preventDefault();
        if (e.key !== ' ' && Number.isFinite(c.restAt)) c.restAt = Math.max(c.restAt, performance.now() + 1800);
        wake();
      }
    };
    el.addEventListener('keydown', onKey);

    /* --- the frame ---------------------------------------------------- */
    const bench: { land: number[]; air: number[]; total: number[] } =
      ((window as any).__sky ||= { land: [], air: [], total: [] });
    const labelCells = new Set<number>();
    const hot: { f: Flight; x: number; y: number; s: number; kind: number }[] = [];
    let entry = 0, routeAlpha = 0, lastRoute: RouteInfo | null = null;
    let raf = 0, prev = performance.now();

    const draw = (ts: number) => {
      raf = requestAnimationFrame(draw);
      const T0 = performance.now();
      const dt = Math.min(0.1, Math.max(0, (ts - prev) / 1000));
      prev = ts;
      if (sizeDirty) fit();
      const { w, h } = size;
      const c = cam.current, l = liveRef.current;
      const soft = l.reduced ? 1 : 0;            // 1 = no easing at all

      /* camera integration, all in seconds so 60 and 120 Hz agree */
      if (!c.dragging) {
        if (!l.reduced) {
          c.lon += c.vLon * dt; c.lat += c.vLat * dt;
          const decay = Math.exp(-dt / 0.42);
          c.vLon *= decay; c.vLat *= decay;
          if (Math.abs(c.vLon) < 0.4) c.vLon = 0;
          if (Math.abs(c.vLat) < 0.4) c.vLat = 0;
          c.lat = Math.max(-85, Math.min(85, c.lat));
          const want = ts > c.restAt ? 1 : 0;
          c.spin += (want - c.spin) * (1 - Math.exp(-dt / 0.85));
          c.lon += SPIN_DPS * c.spin * dt;
        }
      }
      c.zoom += (c.zoomTarget - c.zoom) * (soft || 1 - Math.exp(-dt / 0.11));
      if (Math.abs(c.zoomTarget - c.zoom) < 0.0005) c.zoom = c.zoomTarget;
      const pull = soft || 1 - Math.exp(-dt / 0.20);
      c.lon += c.pullLon * pull; c.pullLon -= c.pullLon * pull;
      c.lat += c.pullLat * pull; c.pullLat -= c.pullLat * pull;
      c.lat = Math.max(-85, Math.min(85, c.lat));

      /* the scene arrives as one thing */
      const wantEntry = l.ready ? 1 : 0;
      entry += (wantEntry - entry) * (l.reduced ? 1 : 1 - Math.exp(-dt / 0.26));
      if (entry > 0.999) entry = 1;

      ctx.clearRect(0, 0, w, h);
      if (entry < 0.004) { bench.total.push(performance.now() - T0); if (bench.total.length > 240) bench.total.shift(); return; }

      const zoom = c.zoom;
      const settle = l.reduced ? 1 : 0.955 + 0.045 * entry;   // a breath of scale on arrival
      const R = Math.min(w, h) * 0.42 * zoom * settle;
      const cx = w / 2, cy = h / 2;
      const v = viewRef.current; v.w = w; v.h = h; v.R = R; v.cx = cx; v.cy = cy;

      const sp = Math.sin(c.lat * DEG), cp = Math.cos(c.lat * DEG);
      const sl0 = Math.sin(c.lon * DEG), cl0 = Math.cos(c.lon * DEG);
      const view: Cam = { sp, cp, sl0, cl0, vx: cp * cl0, vy: cp * sl0, vz: sp };

      /* An unpinned draft is the reticle: it sits wherever the camera is
       * pointing, so rotating the globe aims it. A drag pins it and it stops
       * following. */
      if (l.areaMode && l.draft && !l.draft.pinned) { l.draft.lat = c.lat; l.draft.lon = c.lon; }

      ctx.globalAlpha = entry;

      /* stars, drifting a fraction of the globe's own rotation */
      if (stars) {
        const off = l.reduced ? 0 : -(((c.lon * 0.28) % 360) / 360) * w;
        let x = off % w; if (x > 0) x -= w;
        ctx.globalAlpha = entry * 0.85;
        ctx.drawImage(stars, x, 0, w, h);
        ctx.drawImage(stars, x + w, 0, w, h);
        ctx.globalAlpha = entry;
      }

      /* the planet's body, one blit */
      ctx.drawImage(sphere, cx - R * 1.32, cy - R * 1.32, R * 2.64, R * 2.64);

      const smooth = zoom > 2.4;
      const fine = Math.max(0.68, 1.18 - 0.14 * Math.log2(Math.max(1, zoom)));

      /* graticule */
      ctx.beginPath();
      tracePacked(ctx, grat, view, R, cx, cy, false);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = Math.max(0.6, fine * 0.85);
      ctx.stroke();

      /* land */
      const T1 = performance.now();
      ctx.beginPath();
      tracePacked(ctx, land, view, R, cx, cy, smooth);
      ctx.fillStyle = 'rgba(122,146,190,0.085)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(190,206,232,0.36)';
      ctx.lineWidth = fine;
      ctx.lineJoin = 'round';
      ctx.stroke();
      bench.land.push(performance.now() - T1);

      /* the limb, drawn last over the coast so the edge stays clean */
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
      ctx.strokeStyle = 'rgba(146,188,242,0.30)';
      ctx.lineWidth = Math.max(1, 1.25 * Math.min(1, 2 / Math.max(1, zoom * 0.5)));
      ctx.stroke();

      /* ---- watch areas ------------------------------------------------ *
       *  Each one is a spherical cap, walked as a real circle on the sphere
       *  rather than an ellipse fitted to one, so it is still the right shape
       *  over the date line and over a pole. Rings first, under the aircraft:
       *  the region is context, the traffic is the subject.
       * ------------------------------------------------------------------ */
      const caps: { cap: CapCam; id: string; name: string }[] = [];
      for (let i = 0; i < l.areas.length; i++) {
        const a = l.areas[i];
        caps.push({ cap: capInCam(a.lat, a.lon, a.radiusKm, c.lon), id: a.id, name: a.name });
      }
      const draft = l.draft;
      const draftCap = draft && draft.radiusKm > 0 ? capInCam(draft.lat, draft.lon, draft.radiusKm, c.lon) : null;
      const nCaps = caps.length;
      const counting = nCaps > 0 || Boolean(draftCap);

      if (counting) {
        for (const k in tally) delete tally[k];
        for (let i = 0; i < nCaps; i++) tally[caps[i].id] = 0;
        if (draftCap) tally.__draft = 0;
        areaCountRef.current = tally;
        const steps = Math.round(Math.min(192, 72 + zoom * 14));
        const lw = Math.max(1.2, 1.5 * Math.min(1.6, Math.sqrt(zoom)));
        for (let i = 0; i < nCaps; i++) {
          ctx.beginPath();
          const closed = traceCap(ctx, caps[i].cap, sp, cp, R, cx, cy, steps);
          if (closed) { ctx.fillStyle = 'rgba(192,139,74,0.075)'; ctx.fill(); }
          ctx.strokeStyle = 'rgba(192,139,74,0.58)';
          ctx.lineWidth = lw;
          ctx.stroke();
        }
        if (draftCap && draft) {
          /* The circle you are holding, or about to.
           *
           * Everything that says "this one is yours to move" is shape and
           * weight, never hue: the ring keeps the one dashed pattern that means
           * unsaved, the interior brightens when a press there would carry it,
           * the ring thickens when a press there would grow it, and a pinned
           * circle wears four square handles — the shape a viewer already reads
           * as "drag me" — that an unpinned reticle does not. */
          const held = drawing || Boolean(adjust);
          const lit = adjust ?? (held ? null : hover);
          ctx.beginPath();
          const closed = traceCap(ctx, draftCap, sp, cp, R, cx, cy, steps);
          if (closed) { ctx.fillStyle = lit === 'move' ? 'rgba(192,139,74,0.19)' : 'rgba(192,139,74,0.11)'; ctx.fill(); }
          ctx.setLineDash([7, 5]);
          // The crawl is the only thing that says "this one is not saved yet".
          // Under reduced motion the dash stays put and the pattern alone says it.
          ctx.lineDashOffset = l.reduced ? 0 : -((ts / 42) % 12);
          ctx.strokeStyle = 'rgba(240,211,168,0.95)';
          ctx.lineWidth = lw + (lit === 'resize' ? 1.9 : 0.5);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineDashOffset = 0;
          const mid = capCentreOnScreen(draftCap, sp, cp, R, cx, cy);
          if (mid) {
            ctx.beginPath();
            ctx.moveTo(mid.x - 8, mid.y); ctx.lineTo(mid.x + 8, mid.y);
            ctx.moveTo(mid.x, mid.y - 8); ctx.lineTo(mid.x, mid.y + 8);
            ctx.strokeStyle = 'rgba(240,211,168,0.95)'; ctx.lineWidth = 1.2; ctx.stroke();
          }
          if (draft.pinned && !drawing) {
            const hs = lit === 'resize' ? 5.4 : 4.2;
            ctx.lineWidth = 1.5;
            ctx.fillStyle = 'rgba(10,9,7,0.9)';
            ctx.strokeStyle = 'rgba(246,226,196,0.98)';
            for (const g of capHandlesOnScreen(draftCap, sp, cp, R, cx, cy)) {
              ctx.beginPath();
              ctx.rect(g.x - hs, g.y - hs, hs * 2, hs * 2);
              ctx.fill(); ctx.stroke();
            }
          }
          /* Where the circle sits, so the keep bar can take the edge of the
           * screen it has left free. One object, written over every frame and
           * sampled by the bar on its own timer — no React in the loop. */
          const ds = draftScreenRef.current;
          ds.h = h;
          ds.seen = Boolean(mid);
          if (mid) { ds.y = mid.y; ds.r = R * draftCap.sinR; }
        }
      } else if (areaCountRef.current !== tally) {
        areaCountRef.current = tally;
      }
      // The circle was kept or thrown away while the pointer was sitting on
      // it: put the cursor back now rather than when the mouse next twitches.
      if (hover && !l.draft) restCursor();

      /* selected route, as a great circle */
      const rt = l.route;
      if (rt !== lastRoute) { lastRoute = rt; routeAlpha = 0; }
      if (rt?.origin && rt?.destination) {
        routeAlpha += (1 - routeAlpha) * (l.reduced ? 1 : 1 - Math.exp(-dt / 0.22));
        const o = rt.origin, d = rt.destination;
        const P = makeProjection(c.lon, c.lat, R, cx, cy);
        const f1 = o.lat * DEG, g1 = o.lon * DEG, f2 = d.lat * DEG, g2 = d.lon * DEG;
        const D = 2 * Math.asin(Math.sqrt(Math.sin((f2 - f1) / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin((g2 - g1) / 2) ** 2));
        const sD = Math.sin(D) || 1e-9;
        ctx.globalAlpha = entry * routeAlpha;
        ctx.beginPath();
        let on = false;
        for (let t = 0; t <= 1.0001; t += 0.005) {
          const A = Math.sin((1 - t) * D) / sD, B = Math.sin(t * D) / sD;
          const x = A * Math.cos(f1) * Math.cos(g1) + B * Math.cos(f2) * Math.cos(g2);
          const y = A * Math.cos(f1) * Math.sin(g1) + B * Math.cos(f2) * Math.sin(g2);
          const z = A * Math.sin(f1) + B * Math.sin(f2);
          const p = P(Math.atan2(y, x) / DEG, Math.atan2(z, Math.hypot(x, y)) / DEG);
          if (!p) { on = false; continue; }
          on ? ctx.lineTo(p[0], p[1]) : (ctx.moveTo(p[0], p[1]), on = true);
        }
        ctx.strokeStyle = 'rgba(25,158,112,0.85)';
        ctx.lineWidth = Math.max(1.2, 1.7 * Math.min(1.6, Math.sqrt(zoom)));
        ctx.stroke();
        for (const ap of [o, d]) {
          const p = P(ap.lon, ap.lat); if (!p) continue;
          ctx.fillStyle = ACCENT;
          ctx.beginPath(); ctx.arc(p[0], p[1], 3.4 * Math.min(1.8, Math.sqrt(zoom)), 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(8,9,11,0.85)'; ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.globalAlpha = entry;
      }

      /* ---- aircraft -------------------------------------------------- *
       *  Inline rotation maths and one fill per aircraft — no save/restore,
       *  no shared Path2D. Both alternatives were measured at 9,000 aircraft
       *  on a 3366×2104 backing store: batching every aircraft of one colour
       *  into a single path and filling once costs 15.6 ms a frame against
       *  2.3 ms for this loop, and a rotated sprite atlas costs 3.6 ms. The
       *  original comment was right, so the loop is left alone.
       * ---------------------------------------------------------------- */
      const T2 = performance.now();
      const t = (Date.now() - l.gotAt) / 1000 + l.age;
      const s0 = Math.max(3.1, Math.min(8, 3.4 * Math.pow(zoom, 0.28)));
      const selIcao = l.sel?.icao;
      const fresh = l.fresh;
      const freshT = fresh.size ? Math.min(1, (ts - l.freshAt) / 520) : 1;
      const checkFresh = fresh.size > 0 && freshT < 1;
      hot.length = 0;
      let visible = 0;
      let outlines = 0;
      for (const f of l.flights) {
        const pos = f.project(t);
        const dl = (pos.lon - c.lon) * DEG, la = pos.lat * DEG;
        const sla = Math.sin(la), cla = Math.cos(la), cdl = Math.cos(dl);
        /* Cap membership, before the cull rather than after it.
         *
         * `sin/cos(lat)` and `sin/cos(lon − lon0)` already are this aircraft's
         * unit vector in the camera's frame, so "inside" is one dot product
         * against cos(radius) — the same inequality `WatchArea.contains`
         * evaluates, and right at the date line and the poles for the same
         * reason: there is no longitude branch in it. It runs over the far
         * hemisphere too, which costs one extra sine per aircraft, because an
         * area's count must be the aircraft in it and not the aircraft in it
         * that happen to be facing us. None of this executes at all when there
         * are no areas — see `counting`. */
        let inArea = false;
        let sdl: number;
        if (counting) {
          sdl = Math.sin(dl);
          for (let i = 0; i < nCaps; i++) {
            if (capHolds(caps[i].cap, sla, cla, sdl, cdl)) { tally[caps[i].id]++; inArea = true; }
          }
          if (draftCap && capHolds(draftCap, sla, cla, sdl, cdl)) { tally.__draft++; inArea = true; }
          if (sp * sla + cp * cla * cdl <= 0) continue;          // behind the globe
        } else {
          if (sp * sla + cp * cla * cdl <= 0) continue;
          sdl = Math.sin(dl);
        }
        const x = cx + R * cla * sdl, y = cy - R * (cp * sla - sp * cla * cdl);
        if (x < -20 || y < -20 || x > w + 20 || y > h + 20) continue;
        visible++;
        const isSel = selIcao === f.icao, isW = l.watched.has(f.icao), isE = Boolean(f.emergency);
        if (isSel || isW || isE) { hot.push({ f, x, y, s: s0, kind: isE ? 2 : isSel ? 1 : 0 }); continue; }
        if (checkFresh && fresh.has(f.icao)) ctx.globalAlpha = entry * freshT;
        const a = f.d.heading * DEG, sa = Math.sin(a), ca = Math.cos(a);
        /* Inside an area reads as bigger and outlined, never as a hue.
         * The fill stays on the altitude ramp — that is the one thing the
         * colour of an aircraft is allowed to mean — so the distinction has to
         * come from somewhere else, and size plus an edge are both legible in
         * greyscale and to a viewer who cannot separate warm from green. */
        const s = inArea ? s0 * 1.3 : s0;
        ctx.fillStyle = altColour(f.d.altitude);
        ctx.beginPath();
        ctx.moveTo(x + s * sa, y - s * ca);
        ctx.lineTo(x + s * 0.6 * ca - s * 0.72 * sa * -1, y + s * 0.6 * sa + s * 0.72 * ca * -1);
        ctx.lineTo(x - s * 0.34 * sa, y + s * 0.34 * ca);
        ctx.lineTo(x - s * 0.6 * ca + s * 0.72 * sa, y - s * 0.6 * sa - s * 0.72 * ca);
        ctx.closePath(); ctx.fill();
        // A budget, so a circle drawn round half the planet cannot turn one
        // fill per aircraft into one fill and one stroke per aircraft.
        if (inArea && outlines < AREA_OUTLINE_BUDGET) {
          outlines++;
          ctx.strokeStyle = 'rgba(240,211,168,0.85)';
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
        if (checkFresh) ctx.globalAlpha = entry;
      }

      /* the ones that matter, on top and told apart by shape, not only hue */
      labelCells.clear();
      const pulse = l.reduced ? 0 : (ts % 1600) / 1600;
      for (const item of hot) {
        const { f, x, y, kind } = item;
        const s = kind === 0 ? item.s * 1.15 : item.s * 1.7;
        const a = f.d.heading * DEG, sa = Math.sin(a), ca = Math.cos(a);
        ctx.fillStyle = kind === 2 ? ALERT : ACCENT;
        ctx.beginPath();
        ctx.moveTo(x + s * sa, y - s * ca);
        ctx.lineTo(x + s * 0.6 * ca + s * 0.72 * sa, y + s * 0.6 * sa - s * 0.72 * ca);
        ctx.lineTo(x - s * 0.34 * sa, y + s * 0.34 * ca);
        ctx.lineTo(x - s * 0.6 * ca + s * 0.72 * sa, y - s * 0.6 * sa - s * 0.72 * ca);
        ctx.closePath(); ctx.fill();

        if (kind === 0) {
          // watched — one thin ring
          ctx.strokeStyle = 'rgba(25,158,112,0.62)'; ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.arc(x, y, s * 2.6, 0, TAU); ctx.stroke();
        } else if (kind === 1) {
          // selected — a square reticle, so it is not merely a differently
          // coloured circle to anyone who cannot separate the hues
          const r = s * 2.7;
          ctx.strokeStyle = 'rgba(25,158,112,0.9)'; ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (const [ox, oy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
            ctx.moveTo(x + ox * r, y + oy * r - oy * r * 0.55);
            ctx.lineTo(x + ox * r, y + oy * r);
            ctx.lineTo(x + ox * r - ox * r * 0.55, y + oy * r);
          }
          ctx.stroke();
        } else {
          // emergency — a diamond, two rings and an expanding pulse. Red alone
          // is ΔE 6.9 from the watch green under deuteranopia; shape is what
          // actually carries the difference, and this is the most important
          // thing the map can ever show.
          const r = s * 2.4;
          ctx.strokeStyle = 'rgba(227,73,72,0.95)'; ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(x, y - r * 1.5); ctx.lineTo(x + r * 1.5, y);
          ctx.lineTo(x, y + r * 1.5); ctx.lineTo(x - r * 1.5, y);
          ctx.closePath(); ctx.stroke();
          ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(227,73,72,0.55)';
          ctx.beginPath(); ctx.arc(x, y, r * 2.15, 0, TAU); ctx.stroke();
          if (l.reduced) {
            ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.arc(x, y, r * 2.9, 0, TAU); ctx.stroke();
            ctx.setLineDash([]);
          } else {
            ctx.globalAlpha = entry * (1 - pulse) * 0.7;
            ctx.beginPath(); ctx.arc(x, y, r * (2.15 + pulse * 2.4), 0, TAU); ctx.stroke();
            ctx.globalAlpha = entry;
          }
        }
        label(ctx, labelCells, x, y + s * 3.4, kind === 2 ? `${f.callsign} · ${f.d.squawk}` : f.callsign,
          kind === 2 ? '#ffb4b3' : '#bfeedd', entry);
      }

      /* area names, carrying the number that makes them worth having */
      if (counting) {
        for (let i = 0; i < nCaps; i++) {
          const mid = capCentreOnScreen(caps[i].cap, sp, cp, R, cx, cy);
          if (!mid) continue;
          label(ctx, labelCells, mid.x, mid.y + 7, `${caps[i].name} · ${(tally[caps[i].id] ?? 0).toLocaleString()}`, '#f0d3a8', entry * 0.95);
        }
        if (draftCap && draft) {
          const mid = capCentreOnScreen(draftCap, sp, cp, R, cx, cy);
          if (mid) label(ctx, labelCells, mid.x, mid.y + 13, `${Math.round(draft.radiusKm).toLocaleString()} km · ${(tally.__draft ?? 0).toLocaleString()} inside`, '#f6e2c4', entry);
        }
      }

      /* callsigns, once the globe is big enough to have room for them */
      if (zoom >= 2.4 && visible < 900) {
        let drawn = 0;
        ctx.font = '500 11.5px Inter, system-ui, -apple-system, sans-serif';
        for (const f of l.flights) {
          if (drawn > 34) break;
          if (f.emergency || f.icao === selIcao || l.watched.has(f.icao)) continue;
          const pos = f.project(t);
          const dl = (pos.lon - c.lon) * DEG, la = pos.lat * DEG;
          const sla = Math.sin(la), cla = Math.cos(la), cdl = Math.cos(dl);
          if (sp * sla + cp * cla * cdl <= 0) continue;
          const x = cx + R * cla * Math.sin(dl), y = cy - R * (cp * sla - sp * cla * cdl);
          if (x < 0 || y < 0 || x > w || y > h) continue;
          if (label(ctx, labelCells, x, y + s0 * 2.6, f.callsign, 'rgba(206,216,232,0.82)', entry * 0.9)) drawn++;
        }
      }

      ctx.globalAlpha = 1;
      const air = performance.now() - T2;
      bench.air.push(air); bench.total.push(performance.now() - T0);
      if (bench.total.length > 240) { bench.land.shift(); bench.air.shift(); bench.total.shift(); }
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(sayTimer);
      ro.disconnect();
      window.removeEventListener('resize', onDpr);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('gesturestart', onGestureStart as EventListener);
      el.removeEventListener('gesturechange', onGestureChange as EventListener);
      el.removeEventListener('gestureend', onGestureEnd as EventListener);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('keydown', onKey);
    };
  }, [wake]);

  const toggleWatch = async () => {
    if (!sel) return;
    if (!me) { openAuth({ kind: 'signup' }); return; }
    const on = watched.has(sel.icao);
    try {
      // The user id is no longer sent and would be ignored if it were: these
      // routes take the caller from the token and serve nobody else.
      setWatching(on ? await client.unwatch(sel.icao) : await client.watch(sel.icao, sel.callsign));
      setDid(on ? `Stopped watching ${sel.callsign}.` : `Watching ${sel.callsign}.`);
    } catch (e) {
      if (e instanceof SkyError && e.status === 401) openAuth({ kind: 'signin' });
      else setDid('That did not save. Try again.');
    }
  };

  /** Bring an area under the camera — the list row's job, and the keyboard's. */
  const focusArea = useCallback((area: WatchArea) => {
    const c = cam.current;
    c.pullLon += ((area.centre.lon - c.lon + 540) % 360) - 180;
    c.pullLat += area.centre.lat - c.lat;
    c.vLon = 0; c.vLat = 0;
    c.restAt = performance.now() + 4000;
    setDid(`Looking at ${area.name}. ${(areaCounts[area.id] ?? 0).toLocaleString()} aircraft inside.`);
    wake();
  }, [areaCounts, wake]);

  /** Select by transponder address — how a feed row reaches the globe. */
  const selectByIcao = useCallback((icao: string) => {
    const f = flights.find((x) => x.icao === icao.toLowerCase());
    if (f) { setSel(f); wake(); }
    else setDid('That aircraft is no longer in the feed.');
  }, [flights, wake]);

  const onSpotted = useCallback((spot: WireSpot | null) => {
    // The spot comes back as the ledger holds it, which carries a spotter id
    // and no name — right for a ledger, and not enough for a feed row. The one
    // name we already know is the caller's, so it is attached here rather than
    // waiting for the next poll to fetch it back.
    feed$.push(spot && me ? { ...spot, spotter: spot.spotter ?? { id: me.id, name: me.name } } : spot);
    if (spot) setTab('log');
  }, [feed$, me]);

  /* --- keeping a circle, and the account that is asked for last ------ *
   *  Drawing, moving, resizing and counting all work signed out, because a
   *  circle with a live number in it is the argument for having an account —
   *  demanding the account first is asking somebody to buy the unopened box.
   *  The account is asked for at the one point it is actually needed: storage.
   *  And the circle is never taken away to ask. `keepName` remembers what they
   *  had already typed, so signing in finishes the job they had started rather
   *  than returning them to a blank field over an empty globe.
   * ------------------------------------------------------------------ */
  const saveArea = useCallback(async (name: string) => {
    const d = liveRef.current.draft ?? editing;
    if (!d) return;
    if (!me) {
      keepName.current = name;
      openAuth({ kind: 'signup' });
      setDid('An account is where a watch area is kept. Your circle stays exactly where it is — sign in and it is saved.');
      return;
    }
    await areas$.create({ lat: d.lat, lon: d.lon, radiusKm: d.radiusKm }, name);
    keepName.current = null;
    liveRef.current.draft = null;
    setEditing(null);
    setTab('areas');
    setDid(`Watch area “${name}” saved.`);
  }, [areas$, editing, me, openAuth]);

  /** Back from signing in, with the circle still drawn and the name still
   *  typed: finish what was interrupted rather than making them press Keep a
   *  second time at a form they have already filled in. The bar presses its
   *  own button, so a refusal is worded in the one place that words them. */
  const [retryKeep, setRetryKeep] = useState(0);
  useEffect(() => {
    if (!me || !keepName.current || !liveRef.current.draft) return;
    keepName.current = null;
    setRetryKeep(Date.now());
  }, [me?.id]);

  /** The keep bar's window on the draft. A getter rather than props: the
   *  radius, the count and the anchor all change inside the render loop, and
   *  the whole point of `liveRef` is that the loop never calls setState. */
  const anchorRef = useRef<'top' | 'bottom'>('bottom');
  const readDraft = useCallback((): DraftReadout | null => {
    const d = liveRef.current.draft;
    if (!d) return null;
    const ds = draftScreenRef.current;
    // Take the edge the circle has left free, and keep it — hysteresis, so a
    // bar cannot flip from one side of the screen to the other mid-drag.
    const below = ds.seen ? ds.h - (ds.y + ds.r) : ds.h;
    const above = ds.seen ? ds.y - ds.r : ds.h;
    const here = anchorRef.current === 'bottom' ? below : above;
    const there = anchorRef.current === 'bottom' ? above : below;
    if (here < 104 && there > 156) anchorRef.current = anchorRef.current === 'bottom' ? 'top' : 'bottom';
    return {
      lat: d.lat, lon: d.lon, radiusKm: d.radiusKm,
      inside: areaCountRef.current.__draft ?? 0,
      anchor: anchorRef.current,
    };
  }, []);

  /** the aircraft worth reaching without a pointer: anything in distress, then
   *  anything being watched, then the highest few */
  const reachable = useMemo(() => {
    const seen = new Set<string>();
    const out: Flight[] = [];
    const add = (f: Flight) => { if (!seen.has(f.icao)) { seen.add(f.icao); out.push(f); } };
    emergencies.forEach(add);
    flights.filter((f) => watched.has(f.icao)).forEach(add);
    [...flights].sort((a, b) => b.d.altitude - a.d.altitude).slice(0, 25).forEach(add);
    return out.slice(0, 40);
  }, [flights, watched, emergencies]);

  // Inline opacity wins over any stylesheet rule, so the resting state is
  // computed here rather than handed to CSS. Reduced motion keeps it up: a
  // control that dims itself on a timer is a control you have to chase.
  const chromeAlpha = !ready ? 0 : resting && !reduced ? 0.2 : 1;

  return (
    <div style={S.shell} onPointerMove={wake} onKeyDownCapture={wake}>
      <canvas
        ref={cv}
        className={areaMode ? 'skyCanvas skyDrawing' : 'skyCanvas'}
        style={S.canvas}
        tabIndex={0}
        role="application"
        aria-label="Interactive globe of live aircraft. Drag or use the arrow keys to rotate, scroll or press plus and minus to zoom, click an aircraft to select it. Press A to draw a watch area: aim with the arrow keys, size it with the square bracket keys, finish it with Enter. Once a circle is drawn it stays on the globe and can still be changed — drag inside it or use the arrow keys to move it, drag its edge or use the square bracket keys to resize it, press Enter to name and keep it, Escape to throw it away. A text list of notable aircraft, recent spots and your watch areas follows."
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown + - 0 Escape Space A [ ] Enter"
      />

      {/* The canvas itself says nothing to a screen reader, so everything it
          draws is also here: a running summary, and every aircraft worth
          reaching as a real button that selects it. */}
      <div className="srOnly" aria-live="polite">{say}</div>
      {/* A second polite region, for the consequence of an action. Sharing one
          with the globe's running description meant a "spot logged" was wiped
          by the next feed message before it could be read. */}
      <div className="srOnly" aria-live="polite">{did}</div>
      <div className="srOnly" role="alert">{alertSay}</div>
      <section className="srOnly" aria-label="Aircraft list">
        <h2>Aircraft</h2>
        <p>
          {(feed?.count ?? 0).toLocaleString()} aircraft airborne, positions {since(feed?.age ?? 0)} old.
          {feed?.highest ? ` Highest: ${feed.highest.callsign} at ${feed.highest.ft.toLocaleString()} feet.` : ''}
          {feed?.fastest ? ` Fastest: ${feed.fastest.callsign} at ${feed.fastest.kt} knots.` : ''}
          {emergencies.length ? ` ${emergencies.length} squawking an emergency code.` : ''}
        </p>
        <ul>
          {reachable.map((f) => (
            <li key={f.icao}>
              <button type="button" onClick={() => setSel(f)}>
                {f.callsign}
                {f.emergency ? `, ${f.emergency}, squawk ${f.d.squawk}` : ''}
                {`, ${f.altitudeFt.toLocaleString()} feet, ${f.knots} knots, heading ${Math.round(f.d.heading)} degrees`}
                {watched.has(f.icao) ? ', on your watchlist' : ''}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* The spot feed and the watch areas, as text. The canvas draws the
          areas and the rail lists the spots; neither is reachable without
          sight, so both are here as real controls rather than as a summary. */}
      <section className="srOnly" aria-label="Recent spots">
        <h2>Recent spots</h2>
        {feed$.status === 'absent' ? <p>Spotting is not available on this deployment yet.</p>
          : feed$.recent.length === 0 ? <p>No spots yet.</p> : (
          <ul>
            {feed$.recent.slice(0, 20).map((sp) => (
              <li key={sp.id}>
                <button type="button" onClick={() => selectByIcao(sp.icao)}>
                  {sp.callsign}
                  {sp.aircraftType ? `, ${sp.aircraftType}` : ''}
                  {`, spotted by ${sp.spotter?.name ?? 'someone'} ${ago(sp.spottedAt)}`}
                  {sp.rarity && sp.rarity.band !== 'unknown' ? `, rated ${sp.rarity.band}, ${sp.rarity.score} out of 100` : ', unrated'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="srOnly" aria-label="Watch areas">
        <h2>Watch areas</h2>
        <button type="button" aria-pressed={areaMode} onClick={() => toggleAreaRef.current()}>
          {areaMode ? 'Stop drawing a watch area' : 'Draw a watch area'}
        </button>
        {/* The circle that is drawn but not yet kept. Its own controls live in
            the keep bar, which is real focusable DOM; this is the description
            of it, which the bar's numbers alone do not give in order. */}
        {editing && (
          <p>
            {`A circle is drawn and not yet kept: ${km(liveRef.current.draft?.radiusKm ?? editing.radiusKm)} radius, ${(areaCounts.__draft ?? 0).toLocaleString()} aircraft inside. `}
            With the globe focused, the arrow keys move it, the square bracket keys resize it, Enter goes to its name field and Escape throws it away.
            {me ? '' : ' Keeping it needs an account; drawing, moving and counting do not.'}
          </p>
        )}
        {areas$.areas.length === 0 ? <p>No watch areas yet.</p> : (
          <ul>
            {areas$.areas.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => focusArea(a)}>
                  {`${a.name}, ${km(a.radiusKm)} radius at ${fmtLat(a.centre.lat)} ${fmtLon(a.centre.lon)}, ${(areaCounts[a.id] ?? 0).toLocaleString()} aircraft inside`}
                </button>
                <button type="button" onClick={() => areas$.remove(a.id)}>{`Delete ${a.name}`}</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <header style={{ ...S.top, opacity: chromeAlpha }} className="skyFade">
        <div style={S.brand}>
          <svg width="22" height="22" viewBox="0 0 34 34" aria-hidden>
            <rect width="34" height="34" rx="9" fill="#fff" />
            <path d="M10 24V10h6.4a3.8 3.8 0 0 1 .9 7.5 4.1 4.1 0 0 1-.5 6.5H10Z" fill="#08090B" />
            <circle cx="22.5" cy="12.5" r="2.1" fill="#08090B" />
          </svg>
          <span style={S.wordmark}>Skyline</span>
        </div>
        <div style={S.topRight}>
          <span style={S.chip}>
            <span className={live && !feed?.stale && !reduced ? 'softPulse' : ''}
              style={{ ...S.dot, background: live && !feed?.stale ? ACCENT : '#7c8190' }} />
            {feed?.stale ? 'Last known' : live ? 'Live' : 'Reconnecting'}
          </span>
          {/* The modal affordance, on screen and always in the same place. It
              is a toggle, not a hidden modifier — Shift-drag does the same
              thing for anyone who would rather not reach for it. */}
          <button
            className="skyFocus"
            style={{ ...S.toolBtn, ...(areaMode ? S.toolBtnOn : null) }}
            aria-pressed={areaMode}
            // Not gated on an account. Drawing a circle and being told how many
            // aircraft are inside it is the argument for having one; asking for
            // the account first is asking someone to buy the unopened box.
            onClick={() => toggleAreaRef.current()}
            title="Draw a watch area (A, or hold Shift and drag)"
          >
            <span aria-hidden style={{ color: areaMode ? '#f0d3a8' : AREA }}>◎</span>
            Areas
          </button>
          {!wide && (
            <button className="skyFocus" style={{ ...S.toolBtn, ...(railOpen ? S.toolBtnOn : null) }}
                    aria-pressed={railOpen} onClick={() => setRailOpen((o) => !o)}>
              Spots
            </button>
          )}
          {booting
            ? <span style={{ ...S.who, opacity: 0.5 }}>…</span>
            : me
              ? (
                <span style={S.account}>
                  <span style={S.who}>{me.name}</span>
                  <button className="skyFocus" style={S.signOut}
                          onClick={() => { client.signOut(); setDid('Signed out.'); }}>Sign out</button>
                </span>
              )
              : <button className="skyFocus" style={S.primary} onClick={() => openAuth({ kind: 'signin' })}>Sign in</button>}
        </div>
      </header>

      {/* Mode, stated. A cursor change alone is not an announcement. */}
      {areaMode && (
        <div style={S.modeBanner} className="fadeUp" role="status">
          <span aria-hidden style={S.modeGlyph}>◎</span>
          <span><strong style={S.modeStrong}>Drawing a watch area.</strong> Drag out from the centre — or aim with the arrows, size with <kbd style={S.kbd}>[</kbd> <kbd style={S.kbd}>]</kbd>, keep with <kbd style={S.kbd}>Enter</kbd>.</span>
          <button className="skyFocus" style={S.modeExit} onClick={() => toggleAreaRef.current()}>Esc</button>
        </div>
      )}

      {/* No card, no border, no backdrop blur — a number on the sky. */}
      <div style={{ ...S.stats, opacity: chromeAlpha }} className="skyFade" aria-hidden>
        <div style={S.big}>{(feed?.count ?? 0).toLocaleString()}</div>
        <div style={S.bigLabel}>aircraft airborne right now</div>
        <div style={S.meta}>positions {since(feed?.age ?? 0)} old · moving at their real speed</div>
        {feed?.emergencies?.length ? (
          <div style={S.alertLine}><span style={S.alertGlyph}>◇</span>{feed.emergencies.length} squawking emergency</div>
        ) : null}
      </div>

      <div style={{ ...S.legend, opacity: chromeAlpha }} className="skyFade" aria-hidden>
        <div style={S.legendLabel}>Altitude</div>
        <div style={S.ramp}>{ALT_RAMP.map((c) => <span key={c} style={{ ...S.rampCell, background: c }} />)}</div>
        <div style={S.rampEnds}><span>0</span><span>{(ALT_TOP_FT / 2).toLocaleString()}</span><span>{ALT_TOP_FT.toLocaleString()} ft</span></div>
        <div style={S.keyRow}><span style={{ ...S.keyGlyph, color: ACCENT }}>⌑</span>selected</div>
        <div style={S.keyRow}><span style={{ ...S.keyGlyph, color: ACCENT }}>○</span>watching</div>
        <div style={S.keyRow}><span style={{ ...S.keyGlyph, color: ALERT }}>◇</span>emergency squawk</div>
        {(areas$.areas.length > 0 || areaMode) &&
          <div style={S.keyRow}><span style={{ ...S.keyGlyph, color: AREA }}>◎</span>inside a watch area</div>}
        <div style={S.zoomRow}>{zoomLabel.toFixed(1)}× · scroll or pinch to zoom</div>
      </div>

      {/* Keyed on the airframe: selecting a different aircraft is a new panel,
          not the old one being edited, so no per-aircraft state — a
          half-decoded photo, a revealed slot — can survive the change. */}
      {sel && (
        <aside key={sel.icao} style={S.detail} aria-label={`Flight ${sel.callsign}`} aria-busy={!detail.ready}>
          <button className="skyFocus" style={S.close} onClick={() => setSel(null)} aria-label="Close flight details">×</button>

          {/* Fixed 3:2, present from the first frame, whether or not this
              airframe turns out to have a photograph. Nothing below it moves. */}
          <FlightPhoto photo={info?.photo} pending={!detail.infoReady} waiting={detail.waiting} reduced={reduced} />

          <div style={S.callsign}>{sel.callsign}</div>
          {/* One line, always, ellipsised rather than wrapped: an operator with
              a long name must not be allowed to make this two lines high. */}
          <Slot
            ready={detail.ready}
            reduced={reduced}
            style={S.airlineSlot}
            skeleton={<Bar w={124} h={9} shimmer={detail.waiting && !reduced} style={{ marginTop: 4 }} />}
          >
            <span style={S.airline} title={route?.airline ?? info?.owner ?? sel.d.country}>
              {route?.airline ?? info?.owner ?? sel.d.country}
            </span>
          </Slot>

          {sel.emergency && <div style={S.emergency}><span style={S.alertGlyph}>◇</span>{sel.emergency} · squawk {sel.d.squawk}</div>}

          <RouteStrip route={route} pending={!detail.routeReady} waiting={detail.waiting} reduced={reduced} />

          <div style={S.rows}>
            {/* The two enriched rows are always here. Their value is a bar
                while it is unknown and a dash when the answer is that there is
                nothing — never a row that appears and pushes the rest down. */}
            <Row k="Aircraft" v={
              <Slot ready={detail.infoReady} reduced={reduced}
                    skeleton={<Bar w={104} h={9} shimmer={detail.waiting && !reduced} />}>
                {`${info?.manufacturer ?? ''} ${info?.type ?? ''}`.trim() || '—'}
              </Slot>
            } />
            <Row k="Registration" v={
              <Slot ready={detail.infoReady} reduced={reduced}
                    skeleton={<Bar w={72} h={9} shimmer={detail.waiting && !reduced} />}>
                {info?.registration || '—'}
              </Slot>
            } />
            <Row k="Altitude" v={`${sel.altitudeFt.toLocaleString()} ft`} />
            <Row k="Speed" v={`${sel.knots} kt`} />
            <Row k="Heading" v={`${Math.round(sel.d.heading)}°`} />
            <Row k="Vertical" v={sel.phase === 'cruising' ? 'level' : `${sel.climbFpm > 0 ? '+' : ''}${sel.climbFpm.toLocaleString()} fpm`} />
            <Row k="Position" v={`${sel.d.lat.toFixed(2)}, ${sel.d.lon.toFixed(2)}`} />
            <Row k="Transponder" v={sel.icao.toUpperCase()} />
          </div>

          {/* What a spot of this airframe would be worth, before it is taken.
              The readout hedges rather than claims when the index says it
              cannot rank the type — see `rated` and `hedge`. */}
          <RarityReadout rarity={rarity} loading={rarityBusy} />

          <SpotAction
            client={client}
            flight={sel}
            rarity={rarity}
            signedIn={Boolean(me)}
            available={feed$.status !== 'absent'}
            onSignIn={() => openAuth({ kind: 'signup' })}
            onSpotted={onSpotted}
            onSay={setDid}
          />

          <button className="skyFocus" style={watched.has(sel.icao) ? S.ghostWide : S.primaryWide} onClick={toggleWatch}>
            {watched.has(sel.icao) ? 'Stop watching' : me ? 'Watch this flight' : 'Sign in to watch'}
          </button>

          {watching.length > 0 && (
            <div style={S.watchList}>
              <div style={S.legendLabel}>Watching</div>
              {watching.map((w) => <div key={w.icao} style={S.watchRow}>{w.callsign || w.icao}</div>)}
            </div>
          )}
        </aside>
      )}

      {/* The left rail. Spots first, because it is the thing somebody who has
          never been here before has a reason to look at. */}
      {(wide || railOpen) && (
        <aside
          style={{ ...S.rail, ...(wide ? null : S.railFloat), opacity: chromeAlpha }}
          className="skyFade"
          aria-label="Spotting and watch areas"
          onPointerDown={() => { holdChrome.current = true; wake(); }}
        >
          <div style={S.railTabs} role="tablist" aria-label="Rail sections">
            {([['live', 'Spots'], ['log', 'My log'], ['areas', 'Areas']] as const).map(([k, title]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                className="skyFocus"
                style={{ ...S.railTab, ...(tab === k ? S.railTabOn : null) }}
                onClick={() => { setTab(k); wake(); }}
              >
                {title}
                {k === 'live' && feed$.recent.length > 0 && <span style={S.railCount}>{feed$.recent.length}</span>}
                {k === 'areas' && areas$.areas.length > 0 && <span style={S.railCount}>{areas$.areas.length}</span>}
              </button>
            ))}
          </div>
          <div className="skyRailBody" style={S.railBody}>
            {tab === 'live' && <SpotFeed feed={feed$} signedIn={Boolean(me)} onSignIn={() => openAuth({ kind: 'signup' })} onSelect={selectByIcao} />}
            {tab === 'log' && <SpotLog feed={feed$} signedIn={Boolean(me)} onSignIn={() => openAuth({ kind: 'signup' })} onSelect={selectByIcao} />}
            {tab === 'areas' && (
              <AreaList
                state={areas$}
                counts={areaCounts}
                drawing={areaMode}
                signedIn={Boolean(me)}
                onDraw={() => toggleAreaRef.current()}
                onSignIn={() => openAuth({ kind: 'signup' })}
                onFocus={focusArea}
                onRemove={(id) => { areas$.remove(id); setDid('Watch area deleted.'); }}
              />
            )}
          </div>
        </aside>
      )}

      {auth && (
        <div style={S.scrim} onClick={() => setAuth(null)} onKeyDown={(e) => { if (e.key === 'Escape') setAuth(null); }}>
          <div style={S.modal} role="dialog" aria-modal="true" aria-label="Account" onClick={(e) => e.stopPropagation()}>
            <button className="skyFocus" style={S.close} onClick={() => setAuth(null)} aria-label="Close">×</button>
            <AuthPanel
              client={client}
              initial={auth}
              onSignedIn={() => { setAuth(null); areas$.reload(); feed$.refreshMine(); }}
              onClose={() => setAuth(null)}
              onSay={setDid}
            />
          </div>
        </div>
      )}

      {/* No scrim, no dialog, nothing over the globe. The circle stays drawn,
          stays counting and stays draggable while this is open. */}
      {editing && (
        <AreaDraftBar
          read={readDraft}
          signedIn={Boolean(me)}
          autoFocusName={nameFocus}
          retryKeep={retryKeep}
          onKeep={saveArea}
          onDiscard={() => discardRef.current()}
        />
      )}
    </div>
  );
}

/** One label, if nothing is already sitting where it would go. Returns whether
 *  it was drawn, so the caller can keep a budget. */
function label(ctx: CanvasRenderingContext2D, cells: Set<number>, x: number, y: number, text: string, colour: string, alpha: number) {
  const cell = (Math.round(x / 84) << 12) ^ Math.round(y / 17);
  if (cells.has(cell)) return false;
  cells.add(cell);
  const a = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  ctx.font = '500 11.5px Inter, system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(6,7,10,0.9)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = colour;
  ctx.fillText(text, x, y);
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = a;
  return true;
}

/** One line of the detail panel, at a fixed height whether its value is a
 *  number, a skeleton bar or a dash. */
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div style={S.row}><span style={S.rowK}>{k}</span><span style={S.rowV}>{v}</span></div>
);

const S: Record<string, React.CSSProperties> = {
  shell: { position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' },
  canvas: { position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'grab', touchAction: 'none', display: 'block' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, height: 56, textShadow: SHADOW, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', zIndex: 3, pointerEvents: 'none' },
  brand: { display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'auto' },
  wordmark: { fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' },
  topRight: { display: 'flex', alignItems: 'center', gap: 16, pointerEvents: 'auto' },
  chip: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#b9bdc9' },
  dot: { width: 7, height: 7, borderRadius: 999, display: 'inline-block' },
  who: { fontSize: 13.5, color: '#b9bdc9' },
  primary: { height: 32, padding: '0 15px', border: 0, borderRadius: 8, background: '#fff', color: '#08090B', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' },
  stats: { position: 'absolute', left: 26, bottom: 24, width: 260, zIndex: 3, pointerEvents: 'none', textShadow: SHADOW },
  big: { fontSize: 46, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' },
  bigLabel: { fontSize: 13, color: '#b9bdc9', marginTop: 8 },
  meta: { fontSize: 11.5, color: '#7c8190', marginTop: 5 },
  alertLine: { fontSize: 12.5, color: ALERT, marginTop: 10, display: 'flex', alignItems: 'center', gap: 7 },
  alertGlyph: { fontSize: 13, lineHeight: 1 },
  legend: { position: 'absolute', right: 26, bottom: 24, width: 180, zIndex: 3, pointerEvents: 'none', textAlign: 'right', textShadow: SHADOW },
  legendLabel: { fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#7c8190' },
  ramp: { display: 'flex', gap: 2, marginTop: 8 },
  rampCell: { flex: 1, height: 6, borderRadius: 1 },
  rampEnds: { display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#7c8190', marginTop: 5, fontVariantNumeric: 'tabular-nums' },
  keyRow: { fontSize: 11.5, color: '#b9bdc9', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 7 },
  keyGlyph: { fontSize: 12, lineHeight: 1 },
  zoomRow: { fontSize: 10.5, color: '#7c8190', marginTop: 12, fontVariantNumeric: 'tabular-nums' },
  watchList: { marginTop: 18, paddingTop: 14, borderTop: '1px solid #23262F' },
  watchRow: { fontSize: 13, color: ACCENT, marginTop: 6 },
  /* The panel's own geometry. `scrollbarGutter: stable` matters more than it
     looks: the content width decides the photo box's height through its aspect
     ratio, so a scrollbar appearing later would resize the photograph and
     everything under it. The gutter is reserved once, like everything else. */
  detail: { position: 'absolute', right: 26, top: 68, width: 282, padding: 20, background: 'rgba(11,13,18,0.90)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, zIndex: 4, maxHeight: 'calc(100vh - 190px)', overflowY: 'auto', scrollbarGutter: 'stable', boxShadow: '0 24px 60px rgba(0,0,0,0.45)' },
  close: { position: 'absolute', top: 8, right: 10, background: 'none', border: 0, color: '#7c8190', fontSize: 22, lineHeight: 1, cursor: 'pointer', zIndex: 2 },
  callsign: { height: 28, lineHeight: '28px', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  /** the operator line: one line high, reserved, whatever ends up in it */
  airlineSlot: { height: 17, marginTop: 3, overflow: 'hidden' },
  airline: { display: 'block', fontSize: 12.5, lineHeight: '17px', color: '#b9bdc9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  emergency: { marginTop: 12, padding: '8px 10px', borderRadius: 8, background: 'rgba(227,73,72,0.14)', border: '1px solid rgba(227,73,72,0.4)', color: '#e8706f', fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 },
  rows: { marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 },
  row: { height: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, gap: 12 },
  rowK: { color: '#b9bdc9', whiteSpace: 'nowrap' },
  rowV: { color: '#fff', textAlign: 'right', fontVariantNumeric: 'tabular-nums', minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  primaryWide: { width: '100%', height: 42, marginTop: 18, border: 0, borderRadius: 8, background: '#fff', color: '#08090B', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' },
  ghostWide: { width: '100%', height: 42, marginTop: 18, borderRadius: 8, background: 'transparent', border: '1px solid #3a4050', color: '#d3d8e2', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' },
  scrim: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.66)', display: 'grid', placeItems: 'center', zIndex: 10 },
  modal: { position: 'relative', width: 420, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', background: '#101218', border: '1px solid #23262F', borderRadius: 14, padding: 30, boxShadow: '0 40px 90px rgba(0,0,0,0.6)' },

  /* --- the account row, and the mode toggle beside it --------------- */
  account: { display: 'flex', alignItems: 'center', gap: 10 },
  signOut: { background: 'none', border: 0, color: INK.muted, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', padding: '4px 2px' },
  toolBtn: { height: 30, padding: '0 11px', borderRadius: 8, border: `1px solid ${INK.line}`, background: 'rgba(16,18,24,0.72)', color: INK.secondary, fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 },
  toolBtnOn: { background: 'rgba(192,139,74,0.2)', border: `1px solid ${AREA}`, color: '#f0d3a8', fontWeight: 600 },

  /* --- draw mode, stated ------------------------------------------- */
  modeBanner: { position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)', zIndex: 6, display: 'flex', alignItems: 'center', gap: 11, maxWidth: 'min(660px, calc(100vw - 48px))', padding: '9px 12px 9px 14px', borderRadius: 999, background: 'rgba(24,19,11,0.92)', border: '1px solid rgba(192,139,74,0.45)', color: '#e8d6bb', fontSize: 12.5, boxShadow: '0 18px 44px rgba(0,0,0,0.5)' },
  modeGlyph: { color: AREA, fontSize: 14, lineHeight: 1 },
  modeStrong: { color: '#f6e2c4', fontWeight: 600 },
  kbd: { display: 'inline-block', padding: '1px 5px', borderRadius: 5, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', fontSize: 11, fontFamily: 'inherit' },
  modeExit: { marginLeft: 4, height: 22, padding: '0 9px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.16)', background: 'transparent', color: '#e8d6bb', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer' },

  /* --- the left rail ------------------------------------------------ */
  rail: { position: 'absolute', left: 22, top: 66, width: 274, maxHeight: 'calc(100vh - 252px)', display: 'flex', flexDirection: 'column', zIndex: 4, background: 'rgba(11,13,18,0.90)', border: `1px solid ${INK.lineSoft}`, borderRadius: 14, boxShadow: '0 24px 60px rgba(0,0,0,0.45)', overflow: 'hidden' },
  railFloat: { top: 64, maxHeight: 'calc(100vh - 110px)', zIndex: 8 },
  railTabs: { display: 'flex', gap: 2, padding: 6, borderBottom: `1px solid ${INK.line}` },
  railTab: { flex: 1, height: 28, borderRadius: 7, border: 0, background: 'transparent', color: INK.muted, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 },
  railTabOn: { background: 'rgba(255,255,255,0.07)', color: INK.primary },
  railCount: { fontSize: 10, fontWeight: 600, color: INK.muted, fontVariantNumeric: 'tabular-nums' },
  railBody: { padding: '8px 10px 14px', minHeight: 120 },
  modalTitle: { fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 },
  modalSub: { fontSize: 14, color: '#b9bdc9', margin: '8px 0 20px' },
  input: { width: '100%', height: 46, padding: '0 14px', marginBottom: 10, background: '#171A22', border: '1px solid #3a4050', borderRadius: 8, color: '#fff', fontSize: 15, fontFamily: 'inherit', outline: 'none' },
  link: { width: '100%', marginTop: 12, background: 'none', border: 0, color: '#b9bdc9', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' },
  err: { color: '#e66767', fontSize: 13, marginBottom: 4 },
};

