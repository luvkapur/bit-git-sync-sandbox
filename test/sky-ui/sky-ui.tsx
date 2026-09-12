import { useEffect, useMemo, useRef, useState } from 'react';
import { Flight, type AircraftInfo, type RouteInfo } from '@luvktest/test.flight';
import world from './world.json';
import './sky-ui.module.css';

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

/** sequential single hue, dark→light by altitude. one hue, never a rainbow. */
const ALT_RAMP = ['#184f95', '#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#5598e7', '#86b6ef', '#b7d3f6'];
const altColour = (m: number) => ALT_RAMP[Math.min(7, Math.max(0, Math.floor((m / 13000) * 8)))];

type Feed = {
  at: number; age: number; stale: boolean; count: number;
  highest?: { callsign: string; ft: number };
  fastest?: { callsign: string; kt: number };
  topCountries: { country: string; n: number }[];
  emergencies: any[][];
  rows: any[][];
};
type Me = { id: string; name: string; email: string };

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

export function SkyUi({ apiBase = DEFAULT_API }: SkyUiProps = {}) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [live, setLive] = useState(false);
  const [sel, setSel] = useState<Flight | null>(null);
  const [info, setInfo] = useState<AircraftInfo | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [watching, setWatching] = useState<{ icao: string; callsign: string }[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const rx = useRef({ lon: 10, lat: 22, spin: true });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const gotAt = useRef(Date.now());

  useEffect(() => {
    const es = new EventSource(`${apiBase}/live`);
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.onmessage = (e) => { setFeed(JSON.parse(e.data)); gotAt.current = Date.now(); };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (!me) { setWatching([]); return; }
    fetch(`${apiBase}/watchlist/${me.id}`).then((r) => r.json()).then((d) => setWatching(d.watching ?? []));
  }, [me]);

  const flights = useMemo(() => (feed?.rows ?? []).map((r) => Flight.fromRow(r)), [feed]);
  const watched = useMemo(() => new Set(watching.map((w) => w.icao)), [watching]);

  // enrich on selection — one lookup per airframe, cached server-side forever
  useEffect(() => {
    if (!sel) { setInfo(null); setRoute(null); return; }
    setInfo(null); setRoute(null);
    fetch(`${apiBase}/aircraft/${sel.icao}`).then((r) => r.json()).then(setInfo).catch(() => {});
    if (sel.d.callsign.trim()) fetch(`${apiBase}/route/${sel.d.callsign.trim()}`).then((r) => r.json()).then(setRoute).catch(() => {});
  }, [sel?.icao]);

  useEffect(() => {
    const el = cv.current; if (!el) return;
    const ctx = el.getContext('2d')!;
    let raf = 0;
    const rings = world as [number, number][][];

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      el.width = el.clientWidth * dpr; el.height = el.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); window.addEventListener('resize', resize);

    const draw = () => {
      const w = el.clientWidth, h = el.clientHeight;
      const R = Math.min(w, h) * 0.42, cx = w / 2, cy = h / 2;
      if (rx.current.spin && !drag.current) rx.current.lon += 0.035;
      const P = makeProjection(rx.current.lon, rx.current.lat, R, cx, cy);

      ctx.clearRect(0, 0, w, h);

      // ocean + limb glow
      const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
      g.addColorStop(0, '#111726'); g.addColorStop(1, '#080A10');
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(137,182,239,0.22)'; ctx.lineWidth = 1.2; ctx.stroke();

      // graticule
      ctx.strokeStyle = 'rgba(255,255,255,0.045)'; ctx.lineWidth = 1;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath(); let on = false;
        for (let lon = -180; lon <= 180; lon += 3) {
          const p = P(lon, lat); if (!p) { on = false; continue; }
          on ? ctx.lineTo(p[0], p[1]) : (ctx.moveTo(p[0], p[1]), on = true);
        }
        ctx.stroke();
      }
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath(); let on = false;
        for (let lat = -90; lat <= 90; lat += 3) {
          const p = P(lon, lat); if (!p) { on = false; continue; }
          on ? ctx.lineTo(p[0], p[1]) : (ctx.moveTo(p[0], p[1]), on = true);
        }
        ctx.stroke();
      }

      // land
      ctx.strokeStyle = 'rgba(185,200,225,0.34)'; ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(120,140,180,0.07)';
      for (const ring of rings) {
        ctx.beginPath(); let on = false;
        for (const [lon, lat] of ring) {
          const p = P(lon, lat); if (!p) { on = false; continue; }
          on ? ctx.lineTo(p[0], p[1]) : (ctx.moveTo(p[0], p[1]), on = true);
        }
        ctx.fill(); ctx.stroke();
      }

      // selected route, as a great circle
      if (route?.origin && route?.destination) {
        const o = route.origin, d = route.destination;
        ctx.strokeStyle = 'rgba(25,158,112,0.85)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); let on = false;
        for (let t = 0; t <= 1.0001; t += 0.01) {
          // spherical interpolation between the two airports
          const φ1 = o.lat * DEG, λ1 = o.lon * DEG, φ2 = d.lat * DEG, λ2 = d.lon * DEG;
          const Δ = 2 * Math.asin(Math.sqrt(Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2));
          const A = Math.sin((1 - t) * Δ) / Math.sin(Δ), B = Math.sin(t * Δ) / Math.sin(Δ);
          const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
          const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
          const z = A * Math.sin(φ1) + B * Math.sin(φ2);
          const p = P(Math.atan2(y, x) / DEG, Math.atan2(z, Math.hypot(x, y)) / DEG);
          if (!p) { on = false; continue; }
          on ? ctx.lineTo(p[0], p[1]) : (ctx.moveTo(p[0], p[1]), on = true);
        }
        ctx.stroke();
        for (const ap of [o, d]) {
          const p = P(ap.lon, ap.lat); if (!p) continue;
          ctx.fillStyle = '#199e70'; ctx.beginPath(); ctx.arc(p[0], p[1], 3.4, 0, 7); ctx.fill();
        }
      }

      // aircraft. inline rotation maths — no save/restore per aircraft, which is
      // what lets nine thousand of them hold 60fps.
      const el2 = (Date.now() - gotAt.current) / 1000 + (feed?.age ?? 0);
      for (const f of flights) {
        const pos = f.project(el2);
        const p = P(pos.lon, pos.lat); if (!p) continue;
        const [x, y] = p;
        const isSel = sel?.icao === f.icao, isW = watched.has(f.icao), isE = Boolean(f.emergency);
        const a = f.d.heading * DEG, sa = Math.sin(a), ca = Math.cos(a);
        const s = isSel ? 6.5 : 3.4;
        ctx.fillStyle = isE ? '#e34948' : isSel || isW ? '#199e70' : altColour(f.d.altitude);
        ctx.beginPath();
        ctx.moveTo(x + s * sa, y - s * ca);
        ctx.lineTo(x + s * 0.6 * ca - s * 0.72 * sa * -1, y + s * 0.6 * sa + s * 0.72 * ca * -1);
        ctx.lineTo(x - s * 0.34 * sa, y + s * 0.34 * ca);
        ctx.lineTo(x - s * 0.6 * ca + s * 0.72 * sa, y - s * 0.6 * sa - s * 0.72 * ca);
        ctx.closePath(); ctx.fill();
        if (isSel || isW || isE) {
          ctx.strokeStyle = isE ? 'rgba(227,73,72,0.8)' : 'rgba(25,158,112,0.65)';
          ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [flights, sel, watched, route, feed?.age]);

  // drag to spin
  const onDown = (e: React.MouseEvent) => { drag.current = { x: e.clientX, y: e.clientY }; rx.current.spin = false; };
  const onMove = (e: React.MouseEvent) => {
    if (!drag.current) return;
    rx.current.lon -= (e.clientX - drag.current.x) * 0.32;
    rx.current.lat = Math.max(-80, Math.min(80, rx.current.lat + (e.clientY - drag.current.y) * 0.28));
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = () => { drag.current = null; };

  const pick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const el = cv.current!, r = el.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const R = Math.min(r.width, r.height) * 0.42;
    const P = makeProjection(rx.current.lon, rx.current.lat, R, r.width / 2, r.height / 2);
    const el2 = (Date.now() - gotAt.current) / 1000 + (feed?.age ?? 0);
    let best: Flight | null = null, bd = 15;
    for (const f of flights) {
      const pos = f.project(el2); const p = P(pos.lon, pos.lat); if (!p) continue;
      const d = Math.hypot(p[0] - mx, p[1] - my);
      if (d < bd) { bd = d; best = f; }
    }
    setSel(best);
  };

  const toggleWatch = async () => {
    if (!sel) return;
    if (!me) { setAuthOpen(true); return; }
    const on = watched.has(sel.icao);
    const res = await fetch(`${apiBase}/${on ? 'unwatch' : 'watch'}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: me.id, icao: sel.icao, callsign: sel.callsign }),
    });
    setWatching((await res.json()).watching ?? []);
  };

  return (
    <div style={S.shell}>
      <canvas ref={cv} style={S.canvas} onClick={pick}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} />

      <header style={S.top}>
        <div style={S.brand}>
          <svg width="24" height="24" viewBox="0 0 34 34" aria-hidden>
            <rect width="34" height="34" rx="9" fill="#fff" />
            <path d="M10 24V10h6.4a3.8 3.8 0 0 1 .9 7.5 4.1 4.1 0 0 1-.5 6.5H10Z" fill="#08090B" />
            <circle cx="22.5" cy="12.5" r="2.1" fill="#08090B" />
          </svg>
          <span style={S.wordmark}>Skyline</span>
          <span style={S.sub}>every aircraft on Earth</span>
        </div>
        <div style={S.topRight}>
          <span style={S.chip}>
            <span className={live && !feed?.stale ? 'softPulse' : ''}
              style={{ ...S.dot, background: live && !feed?.stale ? '#199e70' : '#7c8190' }} />
            {feed?.stale ? 'Last known' : live ? 'Live' : 'Reconnecting'}
          </span>
          {me ? <span style={S.who}>{me.name}</span>
              : <button style={S.primary} onClick={() => setAuthOpen(true)}>Sign in</button>}
        </div>
      </header>

      <div style={S.stats} className="fadeUp">
        <div style={S.big}>{(feed?.count ?? 0).toLocaleString()}</div>
        <div style={S.bigLabel}>aircraft airborne right now</div>
        <div style={S.meta}>positions {feed?.age ?? 0}s old · moving at their real speed</div>
        <div style={S.divider} />
        {feed?.highest && <Stat k="Highest" v={`${feed.highest.callsign} · ${feed.highest.ft.toLocaleString()} ft`} />}
        {feed?.fastest && <Stat k="Fastest" v={`${feed.fastest.callsign} · ${feed.fastest.kt} kt`} />}
        {feed?.emergencies?.length ? <Stat k="Squawking emergency" v={`${feed.emergencies.length}`} alert /> : null}
        <div style={S.divider} />
        <div style={S.legendLabel}>Altitude</div>
        <div style={S.ramp}>{ALT_RAMP.map((c) => <span key={c} style={{ ...S.rampCell, background: c }} />)}</div>
        <div style={S.rampEnds}><span>low</span><span>43,000 ft</span></div>
        {watching.length > 0 && (
          <>
            <div style={S.divider} />
            <div style={S.legendLabel}>Watching</div>
            {watching.map((w) => <div key={w.icao} style={S.watchRow}>{w.callsign || w.icao}</div>)}
          </>
        )}
      </div>

      {sel && (
        <aside style={S.detail} className="fadeUp">
          <button style={S.close} onClick={() => setSel(null)}>×</button>
          {info?.photo && <img src={info.photo} alt="" style={S.photo} />}
          <div style={S.callsign}>{sel.callsign}</div>
          <div style={S.airline}>{route?.airline ?? info?.owner ?? sel.d.country}</div>

          {sel.emergency && <div style={S.emergency}>{sel.emergency} · squawk {sel.d.squawk}</div>}

          {route?.origin && route?.destination && (
            <div style={S.routeBox}>
              <div style={S.routeRow}>
                <div><div style={S.iata}>{route.origin.iata}</div><div style={S.city}>{route.origin.city}</div></div>
                <div style={S.arrow}>→</div>
                <div style={{ textAlign: 'right' }}><div style={S.iata}>{route.destination.iata}</div><div style={S.city}>{route.destination.city}</div></div>
              </div>
            </div>
          )}

          <div style={S.rows}>
            {info?.type && <Row k="Aircraft" v={`${info.manufacturer ?? ''} ${info.type}`.trim()} />}
            {info?.registration && <Row k="Registration" v={info.registration} />}
            <Row k="Altitude" v={`${sel.altitudeFt.toLocaleString()} ft`} />
            <Row k="Speed" v={`${sel.knots} kt`} />
            <Row k="Heading" v={`${Math.round(sel.d.heading)}°`} />
            <Row k="Vertical" v={sel.phase === 'cruising' ? 'level' : `${sel.climbFpm > 0 ? '+' : ''}${sel.climbFpm.toLocaleString()} fpm`} />
            <Row k="Position" v={`${sel.d.lat.toFixed(2)}, ${sel.d.lon.toFixed(2)}`} />
            <Row k="Transponder" v={sel.icao.toUpperCase()} />
          </div>

          <button style={watched.has(sel.icao) ? S.ghostWide : S.primaryWide} onClick={toggleWatch}>
            {watched.has(sel.icao) ? 'Stop watching' : me ? 'Watch this flight' : 'Sign in to watch'}
          </button>
        </aside>
      )}

      {authOpen && (
        <div style={S.scrim} onClick={() => setAuthOpen(false)}>
          <div style={S.modal} className="fadeUp" onClick={(e) => e.stopPropagation()}>
            <Auth api={apiBase} onDone={(u) => { setMe(u); setAuthOpen(false); }} />
          </div>
        </div>
      )}
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div style={S.row}><span style={S.rowK}>{k}</span><span style={S.rowV}>{v}</span></div>
);
const Stat = ({ k, v, alert }: { k: string; v: string; alert?: boolean }) => (
  <div style={S.statRow}><span style={S.rowK}>{k}</span><span style={{ ...S.rowV, color: alert ? '#e34948' : undefined }}>{v}</span></div>
);

function Auth({ api, onDone }: { api: string; onDone: (u: Me) => void }) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    const res = await fetch(`${api}/${mode}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mode === 'signup' ? { name, email, password } : { email, password }),
    });
    const d = await res.json();
    if (!res.ok) { setErr(d.error ?? 'that did not work'); return; }
    onDone(d.user);
  };
  return (
    <form onSubmit={go}>
      <h2 style={S.modalTitle}>{mode === 'signup' ? 'Create an account' : 'Sign in'}</h2>
      <p style={S.modalSub}>Keep a watchlist. Your password is a bcrypt hash in our own database.</p>
      {mode === 'signup' && <input style={S.input} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />}
      <input style={S.input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input style={S.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {err && <div style={S.err}>{err}</div>}
      <button style={S.primaryWide} type="submit">{mode === 'signup' ? 'Create account' : 'Sign in'}</button>
      <button type="button" style={S.link} onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setErr(''); }}>
        {mode === 'signup' ? 'I already have an account' : 'I need an account'}
      </button>
    </form>
  );
}

const S: Record<string, React.CSSProperties> = {
  shell: { position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' },
  canvas: { position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'grab' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 3 },
  brand: { display: 'flex', alignItems: 'center', gap: 12 },
  wordmark: { fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' },
  sub: { fontSize: 12.5, color: '#7c8190', paddingLeft: 12, borderLeft: '1px solid #23262F' },
  topRight: { display: 'flex', alignItems: 'center', gap: 16 },
  chip: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#b9bdc9' },
  dot: { width: 7, height: 7, borderRadius: 999, display: 'inline-block' },
  who: { fontSize: 13.5, color: '#b9bdc9' },
  primary: { height: 34, padding: '0 16px', border: 0, borderRadius: 8, background: '#fff', color: '#08090B', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' },
  stats: { position: 'absolute', left: 24, bottom: 24, width: 252, padding: 20, background: 'rgba(16,18,24,0.84)', backdropFilter: 'blur(14px)', border: '1px solid #23262F', borderRadius: 12, zIndex: 3 },
  big: { fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' },
  bigLabel: { fontSize: 13, color: '#b9bdc9', marginTop: 6 },
  meta: { fontSize: 11.5, color: '#7c8190', marginTop: 8 },
  divider: { height: 1, background: '#23262F', margin: '16px 0' },
  statRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 7 },
  legendLabel: { fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#7c8190' },
  ramp: { display: 'flex', gap: 2, marginTop: 8 },
  rampCell: { flex: 1, height: 8, borderRadius: 2 },
  rampEnds: { display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#7c8190', marginTop: 6 },
  watchRow: { fontSize: 13, color: '#199e70', marginTop: 6 },
  detail: { position: 'absolute', right: 24, top: 76, width: 280, padding: 22, background: 'rgba(16,18,24,0.88)', backdropFilter: 'blur(14px)', border: '1px solid #23262F', borderRadius: 12, zIndex: 3, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' },
  close: { position: 'absolute', top: 10, right: 12, background: 'none', border: 0, color: '#7c8190', fontSize: 22, lineHeight: 1, cursor: 'pointer' },
  photo: { width: '100%', borderRadius: 8, marginBottom: 14, display: 'block' },
  callsign: { fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' },
  airline: { fontSize: 12.5, color: '#7c8190', marginTop: 3 },
  emergency: { marginTop: 12, padding: '8px 10px', borderRadius: 8, background: 'rgba(227,73,72,0.14)', border: '1px solid rgba(227,73,72,0.4)', color: '#e34948', fontSize: 12.5, fontWeight: 600 },
  routeBox: { marginTop: 16, padding: '12px 0', borderTop: '1px solid #23262F', borderBottom: '1px solid #23262F' },
  routeRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  iata: { fontSize: 19, fontWeight: 700, letterSpacing: '-0.01em' },
  city: { fontSize: 11.5, color: '#7c8190', marginTop: 1 },
  arrow: { color: '#199e70', fontSize: 15 },
  rows: { marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 },
  row: { display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 12 },
  rowK: { color: '#7c8190', whiteSpace: 'nowrap' },
  rowV: { color: '#fff', textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  primaryWide: { width: '100%', height: 42, marginTop: 18, border: 0, borderRadius: 8, background: '#fff', color: '#08090B', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' },
  ghostWide: { width: '100%', height: 42, marginTop: 18, borderRadius: 8, background: 'transparent', border: '1px solid #23262F', color: '#b9bdc9', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' },
  scrim: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.66)', display: 'grid', placeItems: 'center', zIndex: 10 },
  modal: { width: 420, background: '#101218', border: '1px solid #23262F', borderRadius: 14, padding: 30 },
  modalTitle: { fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 },
  modalSub: { fontSize: 14, color: '#b9bdc9', margin: '8px 0 20px' },
  input: { width: '100%', height: 46, padding: '0 14px', marginBottom: 10, background: '#171A22', border: '1px solid #23262F', borderRadius: 8, color: '#fff', fontSize: 15, fontFamily: 'inherit', outline: 'none' },
  link: { width: '100%', marginTop: 12, background: 'none', border: 0, color: '#7c8190', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' },
  err: { color: '#e66767', fontSize: 13, marginBottom: 4 },
};
