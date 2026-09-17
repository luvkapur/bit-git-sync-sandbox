/**
 * The aircraft detail panel's data and its reserved geometry.
 *
 * Selecting an aircraft used to open a panel that filled in piecemeal: two
 * independent fetches landed at different times, the photo had no box of its
 * own and shoved everything under it down when it arrived, and nothing said
 * "loading" — the panel simply rendered whatever it happened to hold. Measured
 * on the live app, a click grew the panel by up to 412 px in the 600 ms after
 * it opened.
 *
 * The rule this module exists to enforce: **the panel's layout is decided
 * before the data arrives and does not move afterwards.** Every slot below has
 * a fixed height whatever it ends up holding — a photo, a placeholder, a
 * skeleton, or a dash. Content fades into a box that was already the right
 * size; it never pushes anything.
 *
 * The numbers here were measured against the running gateway rather than
 * guessed — see JOIN_MS and PHOTO_AR.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AircraftInfo, RouteInfo } from '@luvktest/test.flight';
import { INK } from './sky-theme.js';

/* ------------------------------------------------------------------ *
 *  Measured constants.
 * ------------------------------------------------------------------ */

/**
 * How long the panel will hold a half-answer back so it can arrive composed.
 *
 * Measured in the browser, through the vite proxy and the gateway, over 18
 * aircraft picked across the feed: `/aircraft/:icao` median 147 ms (max 469),
 * `/route/:callsign` median 149 ms (max 469), and the *skew* between the pair
 * — which is what the eye reads as a second reflow — median 2 ms but up to
 * 135 ms when one half is already in the server's cache and the other is not.
 * That mixed case is the common one in practice: an airframe is cached forever
 * while its flight number is new every day.
 *
 * So waiting for both costs 0–2 ms at the median and is what removes the
 * second reflow. The deadline is set just above the slowest join measured
 * (469 ms) because the upstream can take 8 s and a half that has landed should
 * not be held hostage to one that has not: past it, whatever is ready is
 * shown and the straggler fades into the slot that was already reserved for
 * it. Nothing moves either way — the join is about composition, not layout.
 */
const JOIN_MS = 600;

/**
 * How long a slot stays quiet before it admits to loading.
 *
 * The join lands at ~150 ms at the median, so a shimmer that started at zero
 * would be a flicker on most clicks — a loading animation nobody had time to
 * read, which is worse than no animation. The reserved box is drawn from the
 * first frame regardless; only the shimmer waits.
 */
const SHIMMER_AFTER_MS = 180;

/**
 * The photo's box, as an aspect ratio.
 *
 * airport-data.com serves these as thumbnails and they are not one shape:
 * sampled across 18 airframes the width is 150 px or 200 px and the ratio runs
 * 1.33 to 1.74, median 1.53. At the panel's 242 px content width that is a
 * height anywhere between 139 px and 182 px — a 43 px jolt on arrival even
 * before you count the 161 px that appear out of nothing when there was no box
 * at all. 3:2 is the median shape; everything else is cropped to it.
 */
export const PHOTO_AR = '3 / 2';

/** Roughly two-thirds of airframes have a photograph at all (39 of 60 sampled),
 *  which is why the box is worth reserving and why its empty state is designed
 *  rather than collapsed. */

/* ------------------------------------------------------------------ *
 *  The client-side cache.
 *
 *  The server caches both of these forever in mongo, so the only thing a
 *  second lookup can cost is the round trip — measured at 7–20 ms warm, which
 *  is still a frame and a half of skeleton for an answer we already had.
 *  Re-selecting an aircraft should be instant, and here it is: the cache is
 *  read during render, so a known airframe is composed in its first frame and
 *  never shows a skeleton at all.
 * ------------------------------------------------------------------ */

const CACHE_MAX = 400;

const infoCache = new Map<string, AircraftInfo>();
const routeCache = new Map<string, RouteInfo>();
/** one request per key, however many callers want it */
const inFlight = new Map<string, Promise<any>>();
/** photo URLs the browser has already decoded, so a re-select paints at once */
const decodedPhotos = new Set<string>();

function remember<T>(cache: Map<string, T>, key: string, value: T) {
  cache.set(key, value);
  // Map iterates in insertion order, so the first key is the oldest.
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/**
 * One enrichment lookup, cached and de-duplicated.
 *
 * A refusal from the server is an answer and is cached — the server has
 * already decided there is nothing to know about this airframe and will keep
 * saying so. A dead network is **not** an answer and is not cached, so a
 * dropped packet does not permanently blank a panel.
 */
async function lookup<T extends object>(cache: Map<string, T>, key: string, url: string): Promise<T> {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const running = inFlight.get(url) as Promise<T> | undefined;
  if (running) return running;

  const p = (async (): Promise<T> => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
      if (!res.ok) {
        // 404 and friends: the server knows, and the answer is "nothing".
        if (res.status >= 400 && res.status < 500) remember(cache, key, {} as T);
        return {} as T;
      }
      const body = await res.json();
      const value = (body && typeof body === 'object' ? body : {}) as T;
      remember(cache, key, value);
      return value;
    } catch {
      return {} as T;
    } finally {
      inFlight.delete(url);
    }
  })();
  inFlight.set(url, p);
  return p;
}

/* ------------------------------------------------------------------ *
 *  The hook.
 * ------------------------------------------------------------------ */

export type FlightDetail = {
  info: AircraftInfo | null;
  route: RouteInfo | null;
  /** the type/registration/operator/photo half has landed */
  infoReady: boolean;
  /** the origin/destination half has landed */
  routeReady: boolean;
  /** both halves have landed */
  ready: boolean;
  /** outstanding long enough that a shimmer is worth showing */
  waiting: boolean;
};

const NOTHING: RouteInfo = {};

/**
 * Enrichment for one airframe, composed.
 *
 * Takes the icao and callsign as strings rather than the `Flight`, so that a
 * new object for the same aircraft cannot restart the lookups.
 *
 * A slow answer for aircraft A can never render into aircraft B's panel: every
 * resolution is checked against a sequence number that the effect's own
 * cleanup bumps, so the moment the selection changes every outstanding
 * response for the old one is inert. The requests themselves are deliberately
 * *not* aborted — they are shared, and their answers still populate the cache
 * that makes coming back to that aircraft instant.
 */
export function useFlightDetail(apiBase: string, icao?: string, callsign?: string): FlightDetail {
  const key = icao ? icao.toLowerCase() : '';
  const cs = callsign ? callsign.trim().toUpperCase() : '';
  const selKey = `${key}|${cs}`;

  /** What the caches already know, read during render so a repeat selection
   *  is composed in the first frame rather than one frame later. */
  const cached = useMemo(() => {
    const i = key ? infoCache.get(key) : NOTHING;
    const r = cs ? routeCache.get(cs) : NOTHING;   // no callsign is a settled answer, not a pending one
    return {
      info: i === undefined ? null : (i as AircraftInfo),
      route: r === undefined ? null : r,
      infoReady: i !== undefined,
      routeReady: r !== undefined,
    };
  }, [selKey]);

  const [landed, setLanded] = useState<{ key: string } & typeof cached | null>(null);
  const [waitKey, setWaitKey] = useState('');
  const seq = useRef(0);

  const live = landed && landed.key === selKey ? landed : cached;

  useEffect(() => {
    if (!key) return undefined;
    if (cached.infoReady && cached.routeReady) return undefined;

    const mine = ++seq.current;
    let infoDone = cached.infoReady;
    let routeDone = cached.routeReady;
    let iv = cached.info;
    let rv = cached.route;
    let past = false;

    const settle = () => {
      if (seq.current !== mine) return;                 // a different aircraft is selected now
      if (!past && !(infoDone && routeDone)) return;    // hold the first half back, briefly
      if (!infoDone && !routeDone) return;              // nothing to compose yet
      setLanded({ key: selKey, info: iv, route: rv, infoReady: infoDone, routeReady: routeDone });
    };

    if (!infoDone) {
      lookup<AircraftInfo>(infoCache, key, `${apiBase}/aircraft/${encodeURIComponent(key)}`).then((v) => {
        if (seq.current !== mine) return;
        iv = v; infoDone = true; settle();
      });
    }
    if (!routeDone) {
      lookup<RouteInfo>(routeCache, cs, `${apiBase}/route/${encodeURIComponent(cs)}`).then((v) => {
        if (seq.current !== mine) return;
        rv = v; routeDone = true; settle();
      });
    }

    const join = setTimeout(() => { past = true; settle(); }, JOIN_MS);
    const shimmer = setTimeout(() => { if (seq.current === mine) setWaitKey(selKey); }, SHIMMER_AFTER_MS);
    return () => {
      clearTimeout(join);
      clearTimeout(shimmer);
      // Anything still in the air for this selection is now stale by definition.
      seq.current += 1;
    };
  }, [apiBase, selKey]);

  return {
    info: live.info,
    route: live.route,
    infoReady: live.infoReady,
    routeReady: live.routeReady,
    ready: live.infoReady && live.routeReady,
    waiting: waitKey === selKey,
  };
}

/* ------------------------------------------------------------------ *
 *  The parts that hold the space.
 * ------------------------------------------------------------------ */

/** A skeleton bar. Decorative by construction: it is not content and must not
 *  be read out as though it were, so it is hidden from the accessibility tree
 *  and the panel carries `aria-busy` instead. */
export function Bar({ w, h = 10, shimmer, style }: { w: number | string; h?: number; shimmer: boolean; style?: React.CSSProperties }) {
  return (
    <span
      aria-hidden
      className={shimmer ? 'skyShimmer' : undefined}
      style={{ display: 'block', width: w, height: h, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.045)', ...style }}
    />
  );
}

/**
 * One slot of the panel: a skeleton and then its content, in the same box.
 *
 * Both states are rendered by the same element, so the geometry is written
 * once and cannot drift between them. The fade is applied only on the first
 * transition out of pending — an airframe composed from the cache in its first
 * frame has nothing to arrive from, and fading it in would be an animation
 * announcing that nothing happened.
 *
 * A `span` rather than a `div` so a slot is legal wherever it is needed,
 * including inside the value cell of a key/value row.
 */
export function Slot({
  ready, reduced, skeleton, style, children,
}: { ready: boolean; reduced: boolean; skeleton: React.ReactNode; style?: React.CSSProperties; children: React.ReactNode }) {
  const wasPending = useRef(!ready);
  if (!ready) wasPending.current = true;
  const fade = ready && wasPending.current && !reduced;
  return (
    <span className={fade ? 'skyReveal' : undefined} style={{ display: 'block', ...style }}>
      {ready ? children : skeleton}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 *  The photograph.
 * ------------------------------------------------------------------ */

/**
 * The airframe's photograph, in a box that exists before it does.
 *
 * Three things happen here and all three are about not moving:
 *
 *  - the box is a fixed 3:2 whatever the source turns out to be, and it is
 *    there from the first frame, before anyone knows whether there is a photo
 *    at all;
 *  - the image is decoded off-screen and only shown once `decode()` has
 *    resolved. Setting `src` on a visible element and letting the browser
 *    paint it whenever it is ready is what produces the flash;
 *  - a missing photo, a 404 and a decode failure all land on the same designed
 *    empty state, which is the same size as a photo. A third of airframes have
 *    no picture; that is a normal outcome, not an error.
 */
export function FlightPhoto({
  photo: src, pending, waiting, reduced,
}: { photo?: string; pending: boolean; waiting: boolean; reduced: boolean }) {
  const [shown, setShown] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  // Read through the decoded set during render: an airframe looked at twice
  // paints its photo in the first frame instead of flashing a skeleton.
  const ready = Boolean(src) && (decodedPhotos.has(src) || shown === src);
  const broken = Boolean(src) && failed === src;

  useEffect(() => {
    if (!src || decodedPhotos.has(src)) return undefined;
    let live = true;
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    const ok = () => { if (!live) return; decodedPhotos.add(src); setShown(src); };
    const no = () => { if (!live) return; setFailed(src); };
    if (typeof img.decode === 'function') {
      img.decode().then(ok, () => {
        // Some browsers reject decode() for an image they would happily paint.
        if (img.complete && img.naturalWidth > 0) ok(); else no();
      });
    } else {
      img.onload = ok;
      img.onerror = no;
    }
    return () => {
      live = false;
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  const loading = pending || (Boolean(src) && !ready && !broken);
  const empty = !pending && (!src || broken);

  return (
    <div style={P.box} aria-hidden>
      {/* The fill is the floor of the stack: it is the skeleton while the panel
          waits, and it is the photograph's backdrop afterwards, so the photo
          fades up out of the panel rather than over a hole in it. */}
      <span
        className={loading && waiting && !reduced ? 'skyShimmer' : undefined}
        style={{ ...P.fill, backgroundColor: 'rgba(255,255,255,0.045)' }}
      />
      {empty && (
        <span style={P.empty}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={INK.muted} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16Z" />
          </svg>
          <span style={P.emptyLabel}>No photograph</span>
        </span>
      )}
      {ready && !broken && (
        <img
          src={src}
          alt=""
          className={reduced ? undefined : 'skyPhotoIn'}
          style={P.img}
          onError={() => setFailed(src)}
        />
      )}
      {/* A hairline and a floor of shadow, so a bright sky in the photo does
          not run straight into the panel. */}
      <span style={P.scrim} />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Origin and destination.
 * ------------------------------------------------------------------ */

/**
 * The route strip, at one height in all three of its states.
 *
 * About one flight in five has no published route — a positioning flight, a
 * private aircraft, a callsign the upstream has never seen. That is an answer
 * and it says so, at exactly the height a known route would have taken.
 */
export function RouteStrip({
  route, pending, waiting, reduced,
}: { route: RouteInfo | null; pending: boolean; waiting: boolean; reduced: boolean }) {
  const known = Boolean(route && route.origin && route.destination);
  const shimmer = pending && waiting && !reduced;

  const skeleton = (
    <span style={P.routeRow} aria-hidden>
      <span style={P.routeEnd}>
        <Bar w={52} h={15} shimmer={shimmer} />
        <Bar w={70} h={9} shimmer={shimmer} style={{ marginTop: 6 }} />
      </span>
      <Bar w={14} h={9} shimmer={shimmer} style={{ flex: '0 0 auto' }} />
      <span style={{ ...P.routeEnd, alignItems: 'flex-end' }}>
        <Bar w={52} h={15} shimmer={shimmer} />
        <Bar w={62} h={9} shimmer={shimmer} style={{ marginTop: 6 }} />
      </span>
    </span>
  );

  return (
    <div style={P.routeBox}>
      <Slot ready={!pending} reduced={reduced} skeleton={skeleton}>
        {known ? (
          <span style={P.routeRow}>
            <span style={P.routeEnd}>
              <span style={P.iata}>{route.origin.iata || route.origin.icao || '—'}</span>
              <span style={P.city}>{route.origin.city || route.origin.name || ''}</span>
            </span>
            <span style={P.arrow} aria-hidden>→</span>
            <span style={{ ...P.routeEnd, alignItems: 'flex-end', textAlign: 'right' }}>
              <span style={P.iata}>{route.destination.iata || route.destination.icao || '—'}</span>
              <span style={P.city}>{route.destination.city || route.destination.name || ''}</span>
            </span>
          </span>
        ) : (
          <span style={P.routeUnknown}>
            <span style={P.routeUnknownGlyph} aria-hidden>⋯</span>
            <span>No route published for this callsign</span>
          </span>
        )}
      </Slot>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Styles.
 *
 *  Every height below is written down rather than left to the content, which
 *  is the whole point: the panel is 282 px wide with 20 px of padding, so a
 *  slot is 242 px across and its height is a constant of the design, not of
 *  whatever the upstream happened to return.
 * ------------------------------------------------------------------ */

const P: Record<string, React.CSSProperties> = {
  box: {
    position: 'relative',
    width: '100%',
    aspectRatio: PHOTO_AR,
    marginBottom: 14,
    borderRadius: 9,
    overflow: 'hidden',
    background: 'radial-gradient(120% 120% at 50% 0%, rgba(255,255,255,0.05), rgba(255,255,255,0.015) 60%, rgba(255,255,255,0.01))',
  },
  fill: { position: 'absolute', inset: 0, display: 'block' },
  img: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' },
  empty: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7 },
  emptyLabel: { fontSize: 11, letterSpacing: '0.04em', color: INK.muted },
  scrim: {
    position: 'absolute', inset: 0, borderRadius: 9, pointerEvents: 'none',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07), inset 0 -34px 40px -28px rgba(8,9,11,0.95)',
  },

  routeBox: {
    height: 64, marginTop: 16, padding: '11px 0',
    borderTop: `1px solid ${INK.line}`, borderBottom: `1px solid ${INK.line}`,
  },
  routeRow: { height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  routeEnd: { display: 'flex', flexDirection: 'column', minWidth: 0, flex: '1 1 0' },
  iata: { height: 22, lineHeight: '22px', fontSize: 19, fontWeight: 700, letterSpacing: '-0.01em', whiteSpace: 'nowrap' },
  city: { height: 14, lineHeight: '14px', fontSize: 11.5, color: INK.secondary, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  arrow: { flex: '0 0 auto', color: '#199e70', fontSize: 15, lineHeight: 1 },
  routeUnknown: { height: 40, display: 'flex', alignItems: 'center', gap: 9, fontSize: 12, color: INK.muted },
  routeUnknownGlyph: { fontSize: 15, lineHeight: 1, letterSpacing: '0.08em' },
};
