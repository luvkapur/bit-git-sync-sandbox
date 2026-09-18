import { useCallback, useEffect, useRef, useState } from 'react';
import type { Flight } from '@luvktest/test.flight';
import {
  SkyClient, SkyError, OFFLINE, spotAccepted, spotRejected,
  type RarityScore, type WireRarityTop, type WireSpot,
} from './sky-client.js';
import { ACCENT, INK, RARITY, ago, confidenceNote, countdown, hedge, rated } from './sky-theme.js';

/* ------------------------------------------------------------------ *
 *  Rarity, on screen.
 * ------------------------------------------------------------------ */

/**
 * A band, encoded three ways at once: word, glyph and pip count.
 *
 * Hue is the fourth and least of them. `rare` green and `exceptional` gold sit
 * close together for a deuteranope, and the pips do not — four filled beats
 * three whatever your cones are doing, and it survives a greyscale screenshot,
 * which is how half of these will be seen.
 */
export function RarityChip({ rarity, compact = false }: { rarity?: RarityScore; compact?: boolean }) {
  if (!rated(rarity)) {
    return (
      <span style={{ ...C.chip, ...C.chipUnknown, ...(compact ? C.chipSmall : null) }} title={hedge(rarity)}>
        <span aria-hidden style={C.chipGlyph}>{RARITY.unknown.glyph}</span>
        unrated
      </span>
    );
  }
  const band = RARITY[rarity.band];
  return (
    <span
      style={{ ...C.chip, color: band.colour, borderColor: `${band.colour}55`, background: `${band.colour}1a`, ...(compact ? C.chipSmall : null) }}
      aria-label={`${band.label}, score ${rarity.score} out of 100`}
    >
      <span aria-hidden style={C.chipGlyph}>{band.glyph}</span>
      {band.label}
      <span aria-hidden style={C.pips}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} style={{ ...C.pip, background: i < band.pips ? band.colour : 'rgba(255,255,255,0.16)' }} />
        ))}
      </span>
    </span>
  );
}

/** The full rating block in the flight panel: score, band, and what we do not know. */
export function RarityReadout({ rarity, loading }: { rarity?: RarityScore; loading: boolean }) {
  // One height, four states. This box sits in the middle of the flight panel,
  // and a box that is 60 px tall while it loads, 84 px once it has an answer
  // and gone altogether when it has none is a third reflow on top of the two
  // the enrichment used to cause. The note is clamped to two lines so that the
  // longest hedge cannot make it taller than the shortest rating.
  if (loading) {
    return (
      <div style={C.rarityBox} aria-hidden>
        <div style={C.rarityTop}><div style={{ ...C.skeletonLine, width: 92, height: 24, borderRadius: 999 }} className="skyShimmer" /></div>
        <div style={{ ...C.skeletonLine, marginTop: 13 }} className="skyShimmer" />
        <div style={{ ...C.skeletonLine, width: '62%', marginTop: 7 }} className="skyShimmer" />
      </div>
    );
  }
  // No score at all — the request failed, or spotting is not answering. That
  // is still an answer about rarity, and it is given at the same height as one.
  if (!rarity || !rated(rarity)) {
    return (
      <div style={C.rarityBox}>
        <div style={C.rarityTop}>
          <RarityChip rarity={rarity} />
          {/* no number at all. A score next to "unrated" is read as a rating. */}
          <span style={C.rarityNoScore} aria-hidden>—</span>
        </div>
        <p style={C.rarityNote}>{hedge(rarity)}</p>
      </div>
    );
  }

  const band = RARITY[rarity.band];
  const note = confidenceNote(rarity.confidence);
  const oneIn = rarity.frequency > 0 ? Math.round(1 / rarity.frequency) : 0;
  return (
    <div style={{ ...C.rarityBox, borderColor: `${band.colour}44`, background: `${band.colour}0f` }}>
      <div style={C.rarityTop}>
        <RarityChip rarity={rarity} />
        <span style={{ ...C.rarityScore, color: band.colour }}>
          {rarity.score}<span style={C.rarityOutOf}>/100</span>
        </span>
      </div>
      <p style={C.rarityNote}>
        {oneIn > 1
          ? `About one aircraft in ${oneIn.toLocaleString()} up right now is this type.`
          : 'One of the commonest types in the sky right now.'}
        {note ? ` ${note[0].toUpperCase()}${note.slice(1)}.` : ''}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Taking a spot.
 * ------------------------------------------------------------------ */

type Outcome =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'kept'; callsign: string; rarity: RarityScore }
  | { kind: 'refused'; message: string; until?: number }
  | { kind: 'broken'; message: string };

/** Copy per rejection reason. The domain's own message is a fallback, not the plan. */
const REFUSAL: Record<string, string> = {
  'not-in-feed': 'That aircraft has dropped off the feed. Pick one that is still up.',
  'not-airborne': 'It is on the ground. Spots are for aircraft in the sky.',
  'stale-contact': 'Its last position report is too old to count as a sighting.',
  duplicate: 'You already have this airframe in your log today.',
  'no-spotter': 'Sign in first.',
};

export function SpotAction({
  client, flight, rarity, signedIn, available, onSignIn, onSpotted, onSay,
}: {
  client: SkyClient;
  flight: Flight;
  rarity?: RarityScore;
  signedIn: boolean;
  available: boolean;
  onSignIn: () => void;
  onSpotted: (spot: WireSpot | null) => void;
  onSay: (m: string) => void;
}) {
  const [out, setOut] = useState<Outcome>({ kind: 'idle' });
  const [left, setLeft] = useState(0);
  const [note, setNote] = useState('');
  const [noting, setNoting] = useState(false);

  useEffect(() => { setOut({ kind: 'idle' }); setLeft(0); setNote(''); setNoting(false); }, [flight.icao]);

  useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => setLeft((n) => (n <= 1 ? 0 : n - 1)), 1000);
    return () => clearInterval(id);
  }, [left > 0]);

  const go = async () => {
    if (!signedIn) { onSignIn(); return; }
    if (out.kind === 'busy') return;
    setOut({ kind: 'busy' });
    try {
      const result = await client.spot(flight.icao, note.trim() || undefined);
      // The exported predicates, not `if (result.ok)`: this workspace compiles
      // without strictNullChecks and a boolean discriminant does not narrow.
      if (spotAccepted(result)) {
        const spot = result.spot;
        setOut({ kind: 'kept', callsign: spot.callsign, rarity: spot.rarity });
        setNoting(false); setNote('');
        onSpotted(spot.toObject() as WireSpot);
        onSay(rated(spot.rarity)
          ? `Spotted ${spot.callsign}. ${RARITY[spot.rarity.band].label}, ${spot.rarity.score} out of 100.`
          : `Spotted ${spot.callsign}. Not enough traffic sampled to rate it.`);
        return;
      }
      if (spotRejected(result)) {
        const wait = result.retryAfterMs ? Math.ceil(result.retryAfterMs / 1000) : 0;
        if (wait) setLeft(wait);
        const message = REFUSAL[result.reason] ?? result.message;
        setOut({ kind: 'refused', message, until: wait || undefined });
        onSay(message);
      }
    } catch (e) {
      const ex = e instanceof SkyError ? e : null;
      if (ex?.status === 401) { onSignIn(); setOut({ kind: 'idle' }); return; }
      setOut({ kind: 'broken', message: ex?.code === OFFLINE ? 'Could not reach the server.' : 'Spotting is not answering right now.' });
    }
  };

  if (!available) {
    return (
      <div style={C.soonBox}>
        <span aria-hidden style={C.soonGlyph}>◎</span>
        <div>
          <div style={C.soonTitle}>Spotting is not live yet</div>
          <div style={C.soonBody}>The rules and the rarity index are built. The endpoint is next.</div>
        </div>
      </div>
    );
  }

  if (out.kind === 'kept') {
    const band = rated(out.rarity) ? RARITY[out.rarity.band] : null;
    return (
      <div style={{ ...C.keptBox, borderColor: band ? `${band.colour}66` : INK.line }} className="skyPop">
        <div style={C.keptHead}>
          <span aria-hidden style={{ ...C.keptGlyph, color: band ? band.colour : INK.muted }}>{band ? band.glyph : '·'}</span>
          <span style={C.keptTitle}>{out.callsign} is in your log</span>
        </div>
        {band
          ? <div style={{ ...C.keptScore, color: band.colour }}>{band.label} · {out.rarity.score}/100</div>
          : <div style={C.keptScore}>Logged. Not enough traffic sampled to rate it.</div>}
      </div>
    );
  }

  const blocked = left > 0;
  return (
    <div>
      <button
        className="skyFocus"
        style={{ ...C.spotBtn, ...(blocked ? C.spotBtnOff : null) }}
        onClick={go}
        disabled={out.kind === 'busy' || blocked}
      >
        {out.kind === 'busy' ? 'Logging…'
          : blocked ? `Again in ${countdown(left)}`
          : signedIn ? `Spot ${flight.callsign}` : 'Sign in to spot'}
      </button>

      {signedIn && !blocked && out.kind !== 'busy' && (
        noting
          ? <input className="skyFocus" style={C.noteInput} value={note} maxLength={140} autoFocus
                   placeholder="A note for your log — where were you?"
                   onChange={(e) => setNote(e.target.value)} />
          : <button type="button" className="skyFocus" style={C.noteToggle} onClick={() => setNoting(true)}>+ add a note</button>
      )}

      {(out.kind === 'refused' || out.kind === 'broken') && (
        <div style={C.refusal} role="status">{out.kind === 'refused' ? out.message : out.message}</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  The feed.
 * ------------------------------------------------------------------ */

export type SpotFeedState = {
  recent: WireSpot[];
  mine: WireSpot[];
  top?: WireRarityTop;
  /** `ready` once anything answered; `absent` once the route 404s — see the note below */
  status: 'loading' | 'ready' | 'absent';
  push: (spot: WireSpot | null) => void;
  refreshMine: () => void;
};

/** How often the feed asks for what it missed. Cheap: a cursor and a small page. */
const POLL_MS = 11_000;
const KEEP = 60;

/**
 * The recent-spots feed, and the caller's own log.
 *
 * Polled with a cursor rather than streamed: `spotsSince` is already the exact
 * shape this needs, the page is tiny, and the globe is already holding one SSE
 * connection open — a second stream for a column that changes every few minutes
 * would be spending a connection to save nothing.
 *
 * If the route is not there yet the hook says `absent` once and stops asking.
 * The endpoints below do not exist server-side at the time of writing, and an
 * app that hammers a 404 every eleven seconds forever is not a nicer failure
 * than one that says "not yet".
 */
export function useSpotFeed(client: SkyClient, signedIn: boolean): SpotFeedState {
  const [recent, setRecent] = useState<WireSpot[]>([]);
  const [mine, setMine] = useState<WireSpot[]>([]);
  const [top, setTop] = useState<WireRarityTop | undefined>(undefined);
  const [status, setStatus] = useState<'loading' | 'ready' | 'absent'>('loading');
  const cursor = useRef('');
  const dead = useRef(false);

  const merge = useCallback((incoming: WireSpot[]) => {
    if (!incoming.length) return;
    setRecent((prev) => {
      const by = new Map(prev.map((s) => [s.id, s]));
      for (const s of incoming) by.set(s.id, s);
      const all = [...by.values()].sort((a, b) => Date.parse(b.spottedAt) - Date.parse(a.spottedAt) || a.id.localeCompare(b.id));
      return all.slice(0, KEEP);
    });
    const newest = incoming.reduce((a, s) => (Date.parse(s.spottedAt) > Date.parse(a) ? s.spottedAt : a), cursor.current || incoming[0].spottedAt);
    cursor.current = newest;
  }, []);

  useEffect(() => {
    let live = true;
    const tick = async () => {
      if (!live || dead.current) return;
      try {
        const page = await client.recentSpots(cursor.current ? { since: cursor.current, limit: 30 } : { limit: 30 });
        if (!live) return;
        merge(page);
        setStatus('ready');
      } catch (e) {
        if (!live) return;
        if (e instanceof SkyError && (e.status === 404 || e.status === 501)) { dead.current = true; setStatus('absent'); return; }
        // a transient failure keeps the last page on screen and tries again
        setStatus((s) => (s === 'loading' ? 'loading' : s));
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => { live = false; clearInterval(id); };
  }, [client, merge]);

  useEffect(() => {
    if (dead.current) return;
    client.rarityTop(6).then((t) => setTop(t)).catch(() => {});
  }, [client, status]);

  const refreshMine = useCallback(() => {
    if (!signedIn || dead.current) { setMine([]); return; }
    client.mySpots(50).then(setMine).catch(() => {});
  }, [client, signedIn]);

  useEffect(() => { refreshMine(); }, [refreshMine]);

  const push = useCallback((spot: WireSpot | null) => {
    if (spot) { merge([spot]); setMine((prev) => [spot, ...prev.filter((s) => s.id !== spot.id)]); }
    refreshMine();
  }, [merge, refreshMine]);

  return { recent, mine, top, status, push, refreshMine };
}

/* --- rows --------------------------------------------------------- */

function SpotRow({ spot, index, mine, onSelect }: { spot: WireSpot; index: number; mine: boolean; onSelect: (icao: string) => void }) {
  const band = rated(spot.rarity) ? RARITY[spot.rarity.band] : RARITY.unknown;
  return (
    <button
      type="button"
      className="skyFocus fadeUp"
      style={{ ...C.row, animationDelay: `${Math.min(index, 9) * 34}ms` }}
      onClick={() => onSelect(spot.icao)}
      title={spot.note || `${spot.callsign} — ${band.label}`}
    >
      <span aria-hidden style={{ ...C.rowGlyph, color: band.colour, borderColor: `${band.colour}44`, background: `${band.colour}14` }}>
        {band.glyph}
      </span>
      <span style={C.rowBody}>
        <span style={C.rowTop}>
          <span style={C.rowCallsign}>{spot.callsign}</span>
          <span style={C.rowTime}>{ago(spot.spottedAt)}</span>
        </span>
        <span style={C.rowBottom}>
          <span style={C.rowWho}>
            {mine ? (spot.aircraftType ?? 'unknown type') : `${spot.spotter?.name ?? 'someone'}${spot.aircraftType ? ` · ${spot.aircraftType}` : ''}`}
          </span>
          <span style={{ ...C.rowScore, color: band.colour }}>{rated(spot.rarity) ? spot.rarity.score : '—'}</span>
        </span>
        {spot.note ? <span style={C.rowNote}>“{spot.note}”</span> : null}
      </span>
    </button>
  );
}

/* --- the two lists ------------------------------------------------ */

export function SpotFeed({ feed, signedIn, onSignIn, onSelect }: {
  feed: SpotFeedState; signedIn: boolean; onSignIn: () => void; onSelect: (icao: string) => void;
}) {
  if (feed.status === 'absent') return <NotYet />;
  if (feed.status === 'loading' && !feed.recent.length) return <Skeleton rows={4} />;

  if (!feed.recent.length) {
    return (
      <div>
        <EmptyFeed top={feed.top} />
        {!signedIn && <JoinNudge onSignIn={onSignIn} first />}
      </div>
    );
  }

  return (
    <div>
      <div style={C.list}>
        {feed.recent.slice(0, 24).map((s, i) => <SpotRow key={s.id} spot={s} index={i} mine={false} onSelect={onSelect} />)}
      </div>
      {!signedIn && <JoinNudge onSignIn={onSignIn} />}
    </div>
  );
}

export function SpotLog({ feed, signedIn, onSignIn, onSelect }: {
  feed: SpotFeedState; signedIn: boolean; onSignIn: () => void; onSelect: (icao: string) => void;
}) {
  if (feed.status === 'absent') return <NotYet />;
  if (!signedIn) {
    return (
      <div style={C.empty}>
        <LogMark />
        <div style={C.emptyTitle}>Your log lives here</div>
        <p style={C.emptyBody}>Every aircraft you spot, scored the moment you catch it and kept at that score forever.</p>
        <button className="skyFocus" style={C.emptyCta} onClick={onSignIn}>Create an account</button>
      </div>
    );
  }
  if (!feed.mine.length) {
    return (
      <div style={C.empty}>
        <LogMark />
        <div style={C.emptyTitle}>Nothing logged yet</div>
        <p style={C.emptyBody}>Click any aircraft on the globe, then press <em style={C.em}>Spot</em>. Rare types are worth more.</p>
      </div>
    );
  }

  const best = feed.mine.reduce((a, s) => (s.rarity?.score > (a?.rarity?.score ?? -1) ? s : a), feed.mine[0]);
  return (
    <div>
      <div style={C.stats}>
        <div><div style={C.statN}>{feed.mine.length}</div><div style={C.statK}>spots</div></div>
        <div><div style={C.statN}>{new Set(feed.mine.map((s) => s.aircraftType).filter(Boolean)).size}</div><div style={C.statK}>types</div></div>
        <div><div style={C.statN}>{rated(best?.rarity) ? best.rarity.score : '—'}</div><div style={C.statK}>best</div></div>
      </div>
      <div style={C.list}>
        {feed.mine.slice(0, 24).map((s, i) => <SpotRow key={s.id} spot={s} index={i} mine onSelect={onSelect} />)}
      </div>
    </div>
  );
}

/* --- designed empties --------------------------------------------- */

/**
 * The empty feed, carrying something true.
 *
 * Nobody has spotted anything yet, but the rarity index already knows which of
 * the types overhead are unusual — so the blank state shows that instead of an
 * apology, and doubles as the argument for taking a spot in the first place.
 */
function EmptyFeed({ top }: { top?: WireRarityTop }) {
  const rare = (top?.types ?? []).filter((t) => t.band !== 'unknown' && t.band !== 'common').slice(0, 5);
  return (
    <div style={C.empty}>
      <RadarMark />
      <div style={C.emptyTitle}>No spots yet today</div>
      <p style={C.emptyBody}>The first one is still out there.</p>
      {rare.length > 0 && (
        <div style={C.rareBox}>
          <div style={C.rareHead}>Unusual overhead right now</div>
          {rare.map((t, i) => {
            const band = RARITY[t.band];
            return (
              <div key={t.type} style={{ ...C.rareRow, animationDelay: `${i * 40}ms` }} className="fadeUp">
                <span aria-hidden style={{ ...C.rareGlyph, color: band.colour }}>{band.glyph}</span>
                <span style={C.rareType}>{t.type}</span>
                <span style={C.rareN}>{t.observed === 1 ? 'one airborne' : `${t.observed} airborne`}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function JoinNudge({ onSignIn, first = false }: { onSignIn: () => void; first?: boolean }) {
  return (
    <div style={C.nudge}>
      <div style={C.nudgeText}>{first ? 'Be the first name on this list.' : 'Your name could be on this list.'}</div>
      <button className="skyFocus" style={C.nudgeBtn} onClick={onSignIn}>Start a log</button>
    </div>
  );
}

function NotYet() {
  return (
    <div style={C.empty}>
      <RadarMark dim />
      <div style={C.emptyTitle}>Spotting arrives shortly</div>
      <p style={C.emptyBody}>The rules, the cooldown and the rarity index are written and tested. They are waiting on one route.</p>
    </div>
  );
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div style={C.list} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={C.skelRow}>
          <div style={C.skelGlyph} className="skyShimmer" />
          <div style={{ flex: 1 }}>
            <div style={{ ...C.skeletonLine, width: '58%' }} className="skyShimmer" />
            <div style={{ ...C.skeletonLine, width: '38%', marginTop: 7 }} className="skyShimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

const RadarMark = ({ dim = false }: { dim?: boolean }) => (
  <svg viewBox="0 0 72 72" style={C.mark} aria-hidden>
    <circle cx="36" cy="36" r="26" fill="none" stroke={dim ? INK.line : 'rgba(25,158,112,0.28)'} strokeWidth="1.2" />
    <circle cx="36" cy="36" r="16" fill="none" stroke={dim ? INK.line : 'rgba(25,158,112,0.20)'} strokeWidth="1.2" />
    <circle cx="36" cy="36" r="2.6" fill={dim ? INK.muted : ACCENT} />
    <path d="M36 36 L36 10" stroke={dim ? INK.line : ACCENT} strokeWidth="1.6" strokeLinecap="round" className={dim ? undefined : 'skySweep'} style={{ transformOrigin: '36px 36px' }} />
  </svg>
);

const LogMark = () => (
  <svg viewBox="0 0 72 72" style={C.mark} aria-hidden>
    <rect x="18" y="12" width="36" height="48" rx="5" fill="none" stroke={INK.edge} strokeWidth="1.4" />
    <path d="M26 26 h20 M26 34 h20 M26 42 h12" stroke={INK.line} strokeWidth="2" strokeLinecap="round" />
    <circle cx="52" cy="50" r="9" fill="#0b0d12" stroke={ACCENT} strokeWidth="1.6" />
    <path d="M48 50.5 l2.6 2.6 L56 47" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ------------------------------------------------------------------ */

const C: Record<string, React.CSSProperties> = {
  /* Long-hand for the same reason as `rarityBox` below: the band overrides
     `borderColor` alone, and mixing that with the `border` shorthand is what
     React warns about on a re-render. */
  chip: { display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 9px', borderRadius: 999, borderWidth: 1, borderStyle: 'solid', borderColor: INK.line, fontSize: 11.5, fontWeight: 600, letterSpacing: '0.01em', whiteSpace: 'nowrap' },
  chipSmall: { height: 20, padding: '0 7px', fontSize: 10.5 },
  chipUnknown: { color: INK.muted, borderColor: INK.line, background: 'rgba(255,255,255,0.03)' },
  chipGlyph: { fontSize: 12, lineHeight: 1 },
  pips: { display: 'inline-flex', gap: 2, marginLeft: 2 },
  pip: { width: 4, height: 4, borderRadius: 999, display: 'inline-block' },

  /* 12 + 24 (the chip row) + 9 + 35 (two clamped lines at 11.5/1.5) + 12, plus
     the two borders: 94 px in every one of its states. */
  /* Long-hand border properties, not the `border` shorthand: the three states
     below differ only in `borderColor`, and React warns — correctly — when a
     re-render mixes a shorthand with an override of one of its parts. It also
     means the loading state has a stated colour rather than inheriting
     `currentColor`, which drew a white hairline for as long as it lasted. */
  rarityBox: { height: 94, marginTop: 14, padding: '12px 13px', borderRadius: 10, borderWidth: 1, borderStyle: 'solid', borderColor: INK.line, background: 'rgba(255,255,255,0.02)' },
  rarityTop: { height: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  rarityScore: { fontSize: 22, lineHeight: 1, fontWeight: 700, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' },
  rarityOutOf: { fontSize: 11, fontWeight: 500, opacity: 0.6, marginLeft: 1 },
  rarityNoScore: { fontSize: 20, lineHeight: 1, color: INK.muted },
  rarityNote: {
    height: 35, fontSize: 11.5, lineHeight: 1.5, color: INK.secondary, margin: '9px 0 0',
    display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden',
  },

  spotBtn: { width: '100%', height: 42, marginTop: 14, border: 0, borderRadius: 8, background: ACCENT, color: '#04140d', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '-0.01em' },
  spotBtnOff: { background: 'transparent', border: `1px solid ${INK.edge}`, color: INK.muted, cursor: 'default', fontWeight: 500 },
  noteToggle: { marginTop: 8, background: 'none', border: 0, color: INK.muted, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', padding: 0 },
  noteInput: { width: '100%', height: 36, marginTop: 8, padding: '0 11px', background: INK.field, border: `1px solid ${INK.edge}`, borderRadius: 8, color: INK.primary, fontSize: 13, fontFamily: 'inherit', outline: 'none' },
  refusal: { marginTop: 10, fontSize: 12, lineHeight: 1.45, color: '#e3a06a', background: 'rgba(192,139,74,0.12)', border: '1px solid rgba(192,139,74,0.3)', borderRadius: 8, padding: '8px 10px' },

  keptBox: { marginTop: 14, padding: '13px 14px', borderRadius: 10, border: '1px solid', background: 'rgba(255,255,255,0.03)' },
  keptHead: { display: 'flex', alignItems: 'center', gap: 9 },
  keptGlyph: { fontSize: 17, lineHeight: 1 },
  keptTitle: { fontSize: 13.5, fontWeight: 600, color: INK.primary },
  keptScore: { fontSize: 12, color: INK.secondary, marginTop: 6, marginLeft: 26 },

  soonBox: { marginTop: 14, display: 'flex', gap: 11, alignItems: 'flex-start', padding: '11px 12px', borderRadius: 10, border: `1px solid ${INK.line}`, background: 'rgba(255,255,255,0.02)' },
  soonGlyph: { color: INK.muted, fontSize: 15, lineHeight: 1.2 },
  soonTitle: { fontSize: 12.5, fontWeight: 600, color: INK.secondary },
  soonBody: { fontSize: 11.5, color: INK.muted, marginTop: 3, lineHeight: 1.45 },

  list: { display: 'flex', flexDirection: 'column', gap: 2 },
  row: { display: 'flex', gap: 10, alignItems: 'flex-start', width: '100%', textAlign: 'left', background: 'none', border: 0, borderRadius: 9, padding: '9px 8px', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit' },
  rowGlyph: { flex: '0 0 26px', height: 26, borderRadius: 8, border: '1px solid', display: 'grid', placeItems: 'center', fontSize: 12, marginTop: 1 },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  rowCallsign: { fontSize: 13, fontWeight: 600, color: INK.primary, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowTime: { fontSize: 10.5, color: INK.muted, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
  rowBottom: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginTop: 2 },
  rowWho: { fontSize: 11.5, color: INK.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowScore: { fontSize: 11.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  rowNote: { display: 'block', fontSize: 11, color: INK.muted, marginTop: 4, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  empty: { textAlign: 'center', padding: '18px 4px 6px' },
  mark: { width: 64, height: 64, display: 'block', margin: '0 auto 10px' },
  emptyTitle: { fontSize: 13.5, fontWeight: 600, color: INK.primary },
  emptyBody: { fontSize: 12, lineHeight: 1.5, color: INK.muted, margin: '6px 0 0' },
  em: { fontStyle: 'normal', color: INK.secondary, fontWeight: 600 },
  emptyCta: { marginTop: 14, height: 34, padding: '0 16px', border: 0, borderRadius: 8, background: '#fff', color: '#08090B', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' },

  rareBox: { marginTop: 16, textAlign: 'left', borderTop: `1px solid ${INK.line}`, paddingTop: 12 },
  rareHead: { fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: INK.muted, marginBottom: 8 },
  rareRow: { display: 'flex', alignItems: 'center', gap: 9, padding: '4px 0' },
  rareGlyph: { fontSize: 12, width: 14, textAlign: 'center' },
  rareType: { fontSize: 12.5, fontWeight: 600, color: INK.primary, fontVariantNumeric: 'tabular-nums' },
  rareN: { fontSize: 11, color: INK.muted, marginLeft: 'auto' },

  nudge: { marginTop: 12, paddingTop: 12, borderTop: `1px solid ${INK.line}`, display: 'flex', alignItems: 'center', gap: 10 },
  nudgeText: { fontSize: 11.5, color: INK.secondary, lineHeight: 1.4 },
  nudgeBtn: { marginLeft: 'auto', height: 28, padding: '0 12px', border: 0, borderRadius: 7, background: '#fff', color: '#08090B', fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' },

  stats: { display: 'flex', gap: 18, padding: '2px 8px 12px', borderBottom: `1px solid ${INK.line}`, marginBottom: 6 },
  statN: { fontSize: 19, fontWeight: 700, letterSpacing: '-0.03em', color: INK.primary, fontVariantNumeric: 'tabular-nums' },
  statK: { fontSize: 10, color: INK.muted, letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: 2 },

  skelRow: { display: 'flex', gap: 10, padding: '9px 8px' },
  skelGlyph: { flex: '0 0 26px', height: 26, borderRadius: 8 },
  skeletonLine: { height: 9, borderRadius: 5, width: '100%' },
};
