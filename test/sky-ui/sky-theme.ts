import type { Confidence, RarityBand, RarityScore } from './sky-endpoints.js';

/* ------------------------------------------------------------------ *
 *  The palette, in one place, so the panels and the canvas agree.
 * ------------------------------------------------------------------ */

export const ACCENT = '#199e70';
export const ALERT = '#e34948';
/** watch areas. A third hue — but see `RARITY` below: hue never carries meaning alone. */
export const AREA = '#c08b4a';

export const INK = {
  bg: '#08090B',
  panel: 'rgba(11,13,18,0.90)',
  panelSolid: '#101218',
  field: '#171A22',
  line: '#23262F',
  lineSoft: 'rgba(255,255,255,0.07)',
  edge: '#3a4050',
  primary: '#ffffff',
  secondary: '#b9bdc9',
  muted: '#7c8190',
} as const;

/** The chrome sits on the globe with no card behind it, so it carries its own darkness. */
export const SHADOW = '0 1px 3px rgba(4,5,8,0.95), 0 0 22px rgba(4,5,8,0.9), 0 0 44px rgba(4,5,8,0.7)';

/* ------------------------------------------------------------------ *
 *  Rarity, presented.
 *
 *  Two rules, and both exist because the domain is honest about not knowing.
 *
 *  1. A band is never rendered as colour alone. Every band has a glyph and a
 *     filled-pip count as well, for the same reason the emergency aircraft on
 *     the globe is a diamond: the hues that separate `rare` from `exceptional`
 *     are a few ΔE apart under deuteranopia, and the pips are not.
 *  2. `unknown` is not a sixth flavour of rare. It means the sample is too
 *     small to rank anything, and the UI says that in words rather than
 *     showing a number that looks like a rating.
 * ------------------------------------------------------------------ */

export type BandStyle = {
  label: string;
  colour: string;
  /** a shape, so the band survives a colourblind viewer and a greyscale screenshot */
  glyph: string;
  /** filled pips out of four — the redundant, hue-free encoding */
  pips: number;
};

export const RARITY: Record<RarityBand, BandStyle> = {
  unknown:     { label: 'unrated',     colour: INK.muted,  glyph: '·', pips: 0 },
  common:      { label: 'common',      colour: '#8f97a8',  glyph: '○', pips: 1 },
  uncommon:    { label: 'uncommon',    colour: '#5c9fee',  glyph: '◔', pips: 2 },
  rare:        { label: 'rare',        colour: ACCENT,     glyph: '◑', pips: 3 },
  exceptional: { label: 'exceptional', colour: '#d8a33c',  glyph: '★', pips: 4 },
};

/**
 * Whether a score may be stated as a rating at all.
 *
 * The index says `unknown` below 250 observations and scores an unresolved type
 * at 0. Either way there is nothing to claim, and claiming it anyway — "common",
 * next to a 0 — is a lie the user has no way to check.
 */
export function rated(r?: RarityScore): boolean {
  return Boolean(r) && r.band !== 'unknown' && r.confidence !== 'none';
}

/** What the UI says instead of a band when it cannot rate. Never a number. */
export function hedge(r?: RarityScore): string {
  if (!r) return 'Rarity not loaded yet.';
  if (r.confidence === 'none') return 'Nothing counted yet — no rating to give.';
  if (!r.sampleSize) return 'No traffic sampled yet, so nothing to compare against.';
  if (r.observed === 0) return `Type not resolved yet, so this one is unrated. ${r.sampleSize.toLocaleString()} aircraft counted so far.`;
  return `Only ${r.sampleSize.toLocaleString()} aircraft counted so far — too few to rank a type against. Ask again later.`;
}

/** A qualifier on a real rating, so `medium` does not read as `high`. */
export function confidenceNote(c: Confidence): string {
  if (c === 'high') return '';
  if (c === 'medium') return 'from a partial sample';
  if (c === 'low') return 'from a small sample — treat it loosely';
  return 'from nothing at all';
}

/* ------------------------------------------------------------------ *
 *  Time, in words a person reads.
 * ------------------------------------------------------------------ */

/** How long ago, short enough for a feed row. */
export function ago(iso: string, now = Date.now()): string {
  const ms = now - Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 10) return 'just now';
  if (s < 90) return `${s}s ago`;
  if (s < 5400) return `${Math.round(s / 60)}m ago`;
  if (s < 172800) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

/** A countdown, for a disabled button that will come back. */
export function countdown(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Distances the way a person says them: 8 km, 84 km, 1,200 km. */
export function km(value: number): string {
  if (value < 10) return `${value.toFixed(1)} km`;
  return `${Math.round(value).toLocaleString()} km`;
}
