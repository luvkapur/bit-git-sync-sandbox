import type { FeedAircraft } from './feed.js';

export type RarityBand = 'unknown' | 'common' | 'uncommon' | 'rare' | 'exceptional';

/** How much the sample behind a score is worth. `none` means we counted nothing at all. */
export type Confidence = 'none' | 'low' | 'medium' | 'high';

export type RarityScore = {
  /** 0 for the commonest type in the sample, 100 for one it has never seen */
  score: number;
  band: RarityBand;
  confidence: Confidence;
  /** aircraft of this type in the sample */
  observed: number;
  /** share of the sample, 0..1 */
  frequency: number;
  /** aircraft with a known type in the sample */
  sampleSize: number;
};

export type PlainRarityIndex = {
  counts: Record<string, number>;
};

/** One pseudo-count per type, plus one held back for a type never seen. Without it an unseen type is infinitely surprising and every score collapses. */
const SMOOTHING = 1;

/** Below this many observations the ranking is noise, so the band says so instead of guessing. */
const MIN_SAMPLE = 250;

const LOW_CONFIDENCE = 250;
const MEDIUM_CONFIDENCE = 2500;

const normaliseType = (type?: string): string | undefined => {
  const t = type?.trim().toUpperCase();
  return t || undefined;
};

/**
 * How unusual an aircraft type is, measured from what is actually flying.
 *
 * No list of cool planes. The index counts ICAO type designators in the feed and
 * scores a type by its information content, -log2(p): seeing an A320 when one in
 * eight aircraft is an A320 tells you almost nothing, seeing an An-124 when two
 * of ten thousand are An-124s tells you a lot. The scale is pinned to the sample
 * itself — the commonest type present scores 0, a type never seen scores 100 —
 * so it re-centres as traffic changes. A type that becomes ordinary stops being
 * worth points without anyone editing a table.
 *
 * Counts can be accumulated across snapshots with `plus`, which measures a type
 * by airborne-hours rather than by airframe count. That is the right measure
 * here: the question is how often a spotter sees one, not how many exist.
 */
export class RarityIndex {
  private readonly counts: Map<string, number>;
  readonly sampleSize: number;

  constructor(counts: Map<string, number> | Record<string, number> = {}) {
    const entries = counts instanceof Map ? [...counts] : Object.entries(counts);
    this.counts = new Map(
      entries
        .map(([type, n]) => [normaliseType(type), n] as const)
        .filter((e): e is readonly [string, number] => Boolean(e[0]) && e[1] > 0)
    );
    this.sampleSize = [...this.counts.values()].reduce((a, b) => a + b, 0);
  }

  static fromFeed(feed: readonly FeedAircraft[]): RarityIndex {
    return new RarityIndex().plus(feed);
  }

  static from(plain: PlainRarityIndex): RarityIndex {
    return new RarityIndex(plain.counts);
  }

  /** A new index with this feed folded in. Aircraft whose type has not been resolved yet are not counted — a missing type is missing data, not a rare type. */
  plus(feed: readonly FeedAircraft[]): RarityIndex {
    const next = new Map(this.counts);
    for (const a of feed) {
      const type = normaliseType(a.type);
      if (type) next.set(type, (next.get(type) ?? 0) + 1);
    }
    return new RarityIndex(next);
  }

  merge(other: RarityIndex): RarityIndex {
    const next = new Map(this.counts);
    for (const [type, n] of other.counts) next.set(type, (next.get(type) ?? 0) + n);
    return new RarityIndex(next);
  }

  get distinctTypes(): number {
    return this.counts.size;
  }

  observed(type?: string): number {
    const key = normaliseType(type);
    return key ? this.counts.get(key) ?? 0 : 0;
  }

  get confidence(): Confidence {
    if (this.sampleSize === 0) return 'none';
    if (this.sampleSize < LOW_CONFIDENCE) return 'low';
    if (this.sampleSize < MEDIUM_CONFIDENCE) return 'medium';
    return 'high';
  }

  score(type?: string): RarityScore {
    const key = normaliseType(type);
    const observed = key ? this.counts.get(key) ?? 0 : 0;
    const frequency = this.sampleSize ? observed / this.sampleSize : 0;
    const base = { observed, frequency, sampleSize: this.sampleSize, confidence: this.confidence };

    // An unresolved type scores nothing rather than everything. Scoring it as
    // "never seen" would make the way to farm rarity be to spot aircraft the
    // enrichment lookup has not caught up with.
    if (!key) return { ...base, score: 0, band: 'unknown' };

    const denom = this.sampleSize + SMOOTHING * (this.counts.size + 1);
    const surprisal = -Math.log2((observed + SMOOTHING) / denom);
    const ceiling = -Math.log2(SMOOTHING / denom); // a type not in the sample at all
    const floor = -Math.log2((this.maxCount() + SMOOTHING) / denom); // the commonest type present
    const span = ceiling - floor;
    const score = span > 0 ? Math.max(0, Math.min(100, Math.round((100 * (surprisal - floor)) / span))) : 0;

    return { ...base, score, band: this.sampleSize < MIN_SAMPLE ? 'unknown' : bandFor(score) };
  }

  /** Types present, commonest first. The tail of this list is what a "rare types flying now" panel shows. */
  ranking(): { type: string; observed: number; score: number }[] {
    return [...this.counts.keys()]
      .map((type) => ({ type, observed: this.counts.get(type) ?? 0, score: this.score(type).score }))
      .sort((a, b) => b.observed - a.observed || a.type.localeCompare(b.type));
  }

  toObject(): PlainRarityIndex {
    return { counts: Object.fromEntries(this.counts) };
  }

  private maxCount(): number {
    let max = 0;
    for (const n of this.counts.values()) if (n > max) max = n;
    return max;
  }
}

/**
 * Cut points, calibrated against a real traffic mix rather than round numbers:
 * on a sky of ~2000 aircraft this puts a 1-in-1000 airframe (An-124) in
 * `exceptional`, a 1-in-400 (A380) in `rare`, a 1-in-100 (747) in `uncommon`,
 * and every narrowbody in `common`. Because the scale is pinned to the sample,
 * these stay meaningful as the mix changes.
 */
function bandFor(score: number): RarityBand {
  if (score >= 80) return 'exceptional';
  if (score >= 60) return 'rare';
  if (score >= 35) return 'uncommon';
  return 'common';
}
