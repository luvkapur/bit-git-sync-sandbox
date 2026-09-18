import { useCallback, useEffect, useRef, useState } from 'react';
import type { WatchArea } from '@luvktest/test.watch-area';
import { SkyClient, SkyError } from './sky-client.js';
import { AREA, INK, km } from './sky-theme.js';

/** a circle the user has drawn but not yet named.
 *
 *  `pinned` is set once a pointer has put the centre somewhere deliberate. An
 *  unpinned draft is the reticle that follows the camera, so a keyboard user
 *  aims by rotating the globe; the moment a drag places a centre, it stays. */
export type AreaDraft = { lat: number; lon: number; radiusKm: number; pinned?: boolean };

export type AreaState = {
  areas: WatchArea[];
  /** `absent` once the route 404s — the entity exists, the endpoint does not yet */
  status: 'loading' | 'ready' | 'absent' | 'signed-out';
  create: (draft: AreaDraft, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reload: () => void;
};

/**
 * The caller's watch areas.
 *
 * Optimistic on delete and pessimistic on create: a created area needs the
 * server's id and normalised centre before anything can be drawn against it,
 * while a deleted one can vanish immediately and come back if the server says
 * no. A row the entity refuses to build is dropped in the client rather than
 * taking the list down — see `hydrateAreas`.
 */
export function useAreas(client: SkyClient, signedIn: boolean): AreaState {
  const [areas, setAreas] = useState<WatchArea[]>([]);
  const [status, setStatus] = useState<AreaState['status']>('loading');
  const dead = useRef(false);

  const reload = useCallback(() => {
    if (!signedIn) { setAreas([]); setStatus('signed-out'); return; }
    if (dead.current) { setStatus('absent'); return; }
    client.areas().then(
      (list) => { setAreas(list); setStatus('ready'); },
      (e) => {
        if (e instanceof SkyError && (e.status === 404 || e.status === 501)) { dead.current = true; setStatus('absent'); return; }
        setAreas([]); setStatus('ready');
      }
    );
  }, [client, signedIn]);

  useEffect(() => { reload(); }, [reload]);

  const create = useCallback(async (draft: AreaDraft, name: string) => {
    const area = await client.createArea({ name, lat: draft.lat, lon: draft.lon, radiusKm: draft.radiusKm });
    setAreas((prev) => [...prev.filter((a) => a.id !== area.id), area]);
  }, [client]);

  const remove = useCallback(async (id: string) => {
    const before = areas;
    setAreas((prev) => prev.filter((a) => a.id !== id));
    try { await client.deleteArea(id); }
    catch { setAreas(before); }
  }, [client, areas]);

  return { areas, status, create, remove, reload };
}

/* ------------------------------------------------------------------ *
 *  Keeping a freshly drawn circle.
 *
 *  This used to be a modal in a full-screen scrim, which meant the reward for
 *  drawing a circle on a globe was a panel covering the circle you drew — and,
 *  signed out, a button reading "Sign in and keep it", so a drag on the planet
 *  read as the app throwing a signup at you. It is a bar now: it never covers
 *  the globe, it flips to whichever side of the screen the circle is not on,
 *  the circle stays live and adjustable behind it, and the account is asked for
 *  only when Keep is actually pressed.
 * ------------------------------------------------------------------ */

/** What the bar shows, sampled out of the render loop rather than rendered by it. */
export type DraftReadout = {
  lat: number; lon: number; radiusKm: number;
  /** aircraft inside the circle right now — the reason to keep it */
  inside: number;
  /** which edge of the screen the circle has left free */
  anchor: 'top' | 'bottom';
};

/**
 * The live numbers, polled rather than rendered.
 *
 * The circle's radius and its aircraft count change every frame while it is
 * being dragged, and the globe's whole architecture exists to keep that out of
 * React: a state update per frame would re-render the rail, the detail panel
 * and everything else sixty times a second. So the bar reads a getter on a
 * timer and re-renders only when a number a human could read has actually
 * changed. Eleven renders a second, of one small component, at most.
 */
function useReadout(read: () => DraftReadout | null): DraftReadout | null {
  const [seen, setSeen] = useState<DraftReadout | null>(read);
  const key = useRef('');
  useEffect(() => {
    const sample = () => {
      const r = read();
      const k = r ? `${r.inside}|${Math.round(r.radiusKm)}|${r.lat.toFixed(1)}|${r.lon.toFixed(1)}|${r.anchor}` : '';
      if (k === key.current) return;
      key.current = k;
      setSeen(r);
    };
    sample();
    const id = setInterval(sample, 90);
    return () => clearInterval(id);
  }, [read]);
  return seen;
}

export function AreaDraftBar({ read, signedIn, autoFocusName, retryKeep, onKeep, onDiscard }: {
  /** the live circle, read out of the draw loop's refs */
  read: () => DraftReadout | null;
  /** false only changes what the hint says — the bar works either way */
  signedIn: boolean;
  /** a token, bumped whenever focus should move into the name field. Only the
   *  keyboard path does that: a bar that grabs the caret the instant a drag
   *  ends is the modal problem again, one size smaller. */
  autoFocusName?: number;
  /** a token, bumped to press Keep again on the caller's behalf — what coming
   *  back from signing in does. It runs the same submit the button runs, so
   *  the busy state and, more importantly, the refusals are worded once. */
  retryKeep?: number;
  onKeep: (name: string) => Promise<void>;
  onDiscard: () => void;
}) {
  const live = useReadout(read);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocusName) input.current?.focus(); }, [autoFocusName]);

  const keep = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErr('Give it a name — that is how you will find it again.');
      input.current?.focus();
      return;
    }
    setBusy(true); setErr('');
    try { await onKeep(trimmed); }
    catch (e2) {
      setErr(e2 instanceof SkyError && e2.status === 404
        ? 'Watch areas are not stored yet on this deployment.'
        : 'That did not save. Try again.');
    }
    setBusy(false);
  };

  // A token, not a flag — and one that has to have *changed* since this bar
  // opened. Firing on whatever value happened to be there at mount meant the
  // next circle you drew submitted itself, empty, the instant it appeared.
  const latest = useRef(keep);
  latest.current = keep;
  const seenRetry = useRef(retryKeep);
  useEffect(() => {
    if (!retryKeep || retryKeep === seenRetry.current) return;
    seenRetry.current = retryKeep;
    void latest.current();
  }, [retryKeep]);

  const anchor = live?.anchor ?? 'bottom';
  return (
    <form
      onSubmit={keep}
      // Placement is a stylesheet's job here, not an inline style's: which edge
      // the bar takes depends on where the circle landed, and how much room
      // there is beside the two bottom corner blocks depends on the viewport.
      className={`skyKeepBar ${anchor === 'top' ? 'isTop' : 'isBottom'}`}
      style={A.bar}
      // Escape discards from anywhere inside the bar. The canvas has the same
      // key, so wherever focus happens to be, one press undoes the circle.
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onDiscard(); } }}
      // A pointer that lands on the bar is not a pointer that lost interest in
      // the globe, so the chrome must not start fading underneath it.
      onPointerDown={(e) => e.stopPropagation()}
      aria-label="Adjust and keep the area you drew"
    >
      <div style={A.barRow}>
        <span aria-hidden style={A.barGlyph}>◎</span>
        <div style={A.barStat}>
          <div style={A.barN}>{(live?.inside ?? 0).toLocaleString()}</div>
          <div style={A.barK}>inside now</div>
        </div>
        <div style={A.barStat}>
          <div style={A.barN}>{km(live?.radiusKm ?? 0)}</div>
          <div style={A.barK}>radius</div>
        </div>
        <span aria-hidden style={A.barRule} />
        <input
          ref={input}
          className="skyFocus"
          style={A.barInput}
          value={name}
          maxLength={60}
          disabled={busy}
          placeholder="Name it — Heathrow approach, my street…"
          aria-label="Name this watch area"
          onChange={(e) => { setName(e.target.value); setErr(''); }}
        />
        <button className="skyFocus" style={{ ...A.barKeep, opacity: busy ? 0.65 : 1 }} type="submit" disabled={busy}>
          {busy ? 'Keeping…' : 'Keep'}
        </button>
        <button className="skyFocus" style={A.barDrop} type="button" onClick={onDiscard}>Discard</button>
      </div>

      <div style={A.barHint}>
        {err
          ? <span style={A.barErr} role="alert">{err}</span>
          : (
            <>
              <span style={A.barWhere}>{fmtLat(live?.lat ?? 0)} {fmtLon(live?.lon ?? 0)}</span>
              <span aria-hidden style={A.barDot}>·</span>
              drag inside to move, the edge to resize
              <span aria-hidden style={A.barDot}>·</span>
              <kbd style={A.barKbd}>←↑↓→</kbd> <kbd style={A.barKbd}>[</kbd> <kbd style={A.barKbd}>]</kbd> <kbd style={A.barKbd}>Esc</kbd>
              {!signedIn && <><span aria-hidden style={A.barDot}>·</span><span style={A.barNote}>an account is needed to keep it</span></>}
            </>
          )}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ *
 *  The list.
 * ------------------------------------------------------------------ */

export function AreaList({ state, counts, drawing, onDraw, onSignIn, signedIn, onFocus, onRemove }: {
  state: AreaState;
  /** live aircraft count per area id */
  counts: Record<string, number>;
  drawing: boolean;
  onDraw: () => void;
  onSignIn: () => void;
  signedIn: boolean;
  onFocus: (area: WatchArea) => void;
  onRemove: (id: string) => void;
}) {
  if (state.status === 'absent') {
    return (
      <div style={A.empty}>
        <CapMark dim />
        <div style={A.emptyTitle}>Areas are not stored yet</div>
        <p style={A.emptyBody}>The geometry is done — caps, not boxes, correct across the date line and the poles. Storage is next.</p>
      </div>
    );
  }
  if (!signedIn) {
    return (
      <div style={A.empty}>
        <CapMark />
        <div style={A.emptyTitle}>Watch a piece of sky</div>
        <p style={A.emptyBody}>Draw a circle over your airport, your street, an ocean track. Everything inside it is picked out on the globe.</p>
        <button className="skyFocus" style={A.cta} onClick={onSignIn}>Create an account</button>
      </div>
    );
  }

  return (
    <div>
      <button className="skyFocus" style={{ ...A.drawBtn, ...(drawing ? A.drawBtnOn : null) }} onClick={onDraw} aria-pressed={drawing}>
        <span aria-hidden style={A.drawGlyph}>◎</span>
        {drawing ? 'Drawing — press Esc to stop' : 'Draw an area'}
      </button>

      {state.areas.length === 0 ? (
        <div style={A.empty}>
          <CapMark />
          <div style={A.emptyTitle}>No areas yet</div>
          <p style={A.emptyBody}>Press <em style={A.em}>Draw an area</em>, then drag on the globe from the centre outwards.</p>
        </div>
      ) : (
        <div style={A.list}>
          {state.areas.map((a, i) => (
            <div key={a.id} style={{ ...A.row, animationDelay: `${Math.min(i, 8) * 34}ms` }} className="fadeUp">
              <button type="button" className="skyFocus" style={A.rowMain} onClick={() => onFocus(a)}>
                <span aria-hidden style={A.rowGlyph}>◎</span>
                <span style={A.rowBody}>
                  <span style={A.rowName}>{a.name}</span>
                  <span style={A.rowMeta}>
                    {km(a.radiusKm)} · {fmtLat(a.centre.lat)} {fmtLon(a.centre.lon)}
                    {a.isShared ? ' · shared' : ''}
                  </span>
                </span>
                <span style={A.rowCount}>{(counts[a.id] ?? 0).toLocaleString()}</span>
              </button>
              <button type="button" className="skyFocus" style={A.rowX} aria-label={`Delete ${a.name}`} onClick={() => onRemove(a.id)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const CapMark = ({ dim = false }: { dim?: boolean }) => (
  <svg viewBox="0 0 72 72" style={A.mark} aria-hidden>
    <circle cx="36" cy="36" r="27" fill="none" stroke={INK.line} strokeWidth="1.2" />
    <path d="M14 27 q10 5 22 5 t22 -5" fill="none" stroke={INK.line} strokeWidth="1.2" />
    <path d="M14 45 q10 -5 22 -5 t22 5" fill="none" stroke={INK.line} strokeWidth="1.2" />
    <circle cx="44" cy="30" r="13" fill={dim ? 'none' : 'rgba(192,139,74,0.13)'} stroke={dim ? INK.edge : AREA} strokeWidth="1.6" strokeDasharray="3 3" />
    <circle cx="44" cy="30" r="1.8" fill={dim ? INK.muted : AREA} />
  </svg>
);

/** Coordinates the way a chart says them, not the way a float prints. */
export const fmtLat = (lat: number) => `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`;
export const fmtLon = (lon: number) => `${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;

const A: Record<string, React.CSSProperties> = {
  /* --- the bar that keeps a drawn circle ---------------------------- *
   *  Anchored to one edge and centred, at a width that leaves the stats and
   *  the legend in their corners alone. `pointerEvents` is on for the bar and
   *  nothing sits behind it, so the globe under the rest of the screen is
   *  still draggable while it is open.
   * ------------------------------------------------------------------ */
  bar: { padding: '11px 13px 10px', borderRadius: 14, background: 'rgba(20,16,10,0.93)', border: '1px solid rgba(192,139,74,0.5)', boxShadow: '0 20px 54px rgba(0,0,0,0.58)', backdropFilter: 'blur(9px)' },
  barRow: { display: 'flex', alignItems: 'center', gap: 13 },
  barGlyph: { color: AREA, fontSize: 16, lineHeight: 1, flex: '0 0 auto' },
  barStat: { flex: '0 0 auto', minWidth: 62 },
  barN: { fontSize: 19, fontWeight: 700, letterSpacing: '-0.03em', color: '#f6e2c4', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 },
  barK: { fontSize: 9.5, color: '#9c8b74', letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: 2 },
  barRule: { flex: '0 0 auto', width: 1, alignSelf: 'stretch', background: 'rgba(192,139,74,0.3)' },
  barInput: { flex: 1, minWidth: 0, height: 38, padding: '0 13px', background: 'rgba(0,0,0,0.42)', border: '1px solid rgba(192,139,74,0.38)', borderRadius: 9, color: INK.primary, fontSize: 14, fontFamily: 'inherit', outline: 'none' },
  barKeep: { flex: '0 0 auto', height: 38, padding: '0 20px', border: 0, borderRadius: 9, background: '#f6e2c4', color: '#1a1208', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' },
  barDrop: { flex: '0 0 auto', height: 38, padding: '0 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: '#cdbda6', fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer' },
  barHint: { marginTop: 8, fontSize: 11.5, lineHeight: 1.5, color: '#a8998a' },
  barWhere: { color: '#e0cbab', fontVariantNumeric: 'tabular-nums' },
  barDot: { margin: '0 7px', color: 'rgba(192,139,74,0.6)' },
  barKbd: { display: 'inline-block', padding: '0 5px', margin: '0 1px', borderRadius: 4, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.13)', fontSize: 10.5, fontFamily: 'inherit', color: '#cdbda6' },
  barNote: { color: '#e0cbab' },
  barErr: { color: '#ef8180' },

  drawBtn: { width: '100%', height: 36, marginBottom: 12, borderRadius: 8, border: `1px solid ${INK.edge}`, background: 'transparent', color: '#d3d8e2', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  drawBtnOn: { background: 'rgba(192,139,74,0.18)', border: `1px solid ${AREA}`, color: '#f0d3a8' },
  drawGlyph: { fontSize: 13, color: AREA },

  list: { display: 'flex', flexDirection: 'column', gap: 2 },
  row: { display: 'flex', alignItems: 'stretch', gap: 2 },
  rowMain: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 0, borderRadius: 9, padding: '9px 8px', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', textAlign: 'left' },
  rowGlyph: { flex: '0 0 auto', color: AREA, fontSize: 13 },
  rowBody: { flex: 1, minWidth: 0 },
  rowName: { display: 'block', fontSize: 13, fontWeight: 600, color: INK.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowMeta: { display: 'block', fontSize: 11, color: INK.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowCount: { fontSize: 12.5, fontWeight: 700, color: AREA, fontVariantNumeric: 'tabular-nums', paddingLeft: 6 },
  rowX: { flex: '0 0 26px', background: 'none', border: 0, color: INK.muted, fontSize: 17, lineHeight: 1, cursor: 'pointer', borderRadius: 7, fontFamily: 'inherit' },

  empty: { textAlign: 'center', padding: '14px 4px 6px' },
  mark: { width: 64, height: 64, display: 'block', margin: '0 auto 10px' },
  emptyTitle: { fontSize: 13.5, fontWeight: 600, color: INK.primary },
  emptyBody: { fontSize: 12, lineHeight: 1.5, color: INK.muted, margin: '6px 0 0' },
  em: { fontStyle: 'normal', color: INK.secondary, fontWeight: 600 },
  cta: { marginTop: 14, height: 34, padding: '0 16px', border: 0, borderRadius: 8, background: '#fff', color: '#08090B', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' },
};
