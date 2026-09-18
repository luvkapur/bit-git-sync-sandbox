import mongoose, { Model } from 'mongoose';
import type { PlainSpot } from '@luvktest/test.spot';
import type { SpotStore } from '@luvktest/test.spot-routes';
import { SPOT_MODEL_NAME, spotSchema } from './spot-schema.js';
import { isDuplicateKey, toPlainSpot } from './spot-document.js';

/**
 * The spots collection, behind the `SpotStore` port.
 *
 * Thin on purpose: it writes rows and answers three indexed reads. Every rule
 * about what counts as a spot lives in `SpotLog`, which is why those rules are
 * tested without a database — and the one rule that *cannot* live there, the
 * cooldown under concurrency, lives in this collection's unique index rather
 * than in either.
 *
 * @example
 * const store = MongoSpotStore.usingDefaultConnection();
 * await store.ensureIndexes();
 */
export class MongoSpotStore implements SpotStore {
  constructor(private readonly spots: Model<any>) {}

  /**
   * Write a spot, unless its window is already taken.
   *
   * The unique key is the whole point. Two requests racing each other both
   * pass the in-memory cooldown check — each reads the ledger before the other
   * writes to it — and exactly one of them creates this key; the loser is told
   * so and answers 409, which is the answer the rule would have given a
   * moment later anyway.
   */
  async insert(spot: PlainSpot, timeBucket: number): Promise<boolean> {
    try {
      await this.spots.create({ ...spot, timeBucket });
      return true;
    } catch (e) {
      if (isDuplicateKey(e)) return false;
      throw e;
    }
  }

  /** The cooldown's one input: the newest spot of this airframe by this spotter. */
  async lastSpotOf(spotterId: string, icao: string): Promise<PlainSpot | undefined> {
    const doc = await this.spots.findOne({ spotterId, icao: icao.toLowerCase() }).sort({ spottedAt: -1 }).lean();
    return toPlainSpot(doc as Record<string, unknown> | null);
  }

  async recent(limit: number): Promise<PlainSpot[]> {
    const docs = await this.spots.find({}).sort({ spottedAt: -1 }).limit(Math.max(0, limit)).lean();
    return keep(docs);
  }

  /**
   * The page after a cursor, taken from the **oldest** end.
   *
   * Ascending, not descending-then-reversed: a client that fell behind by more
   * than one page must advance its cursor through what it missed rather than
   * skip the middle of it, and that only works if the page starts where the
   * client stopped.
   */
  async since(cursor: Date, limit: number): Promise<PlainSpot[]> {
    const docs = await this.spots
      .find({ spottedAt: { $gt: cursor.toISOString() } })
      .sort({ spottedAt: 1 })
      .limit(Math.max(0, limit))
      .lean();
    return keep(docs);
  }

  async bySpotter(spotterId: string, limit: number): Promise<PlainSpot[]> {
    const docs = await this.spots.find({ spotterId }).sort({ spottedAt: -1 }).limit(Math.max(0, limit)).lean();
    return keep(docs);
  }

  /**
   * Build the indexes and wait for them.
   *
   * Worth calling at boot and worth awaiting. Mongoose builds indexes in the
   * background after a model is first used, so without this the unique key
   * that makes the cooldown safe may not exist yet when the first spot is
   * written — and a constraint that is usually there is not a constraint.
   */
  async ensureIndexes(): Promise<void> {
    await this.spots.createIndexes();
  }

  /**
   * Build a store on the mongoose connection the process already has.
   *
   * Reuses an existing model if one is registered: registering the same model
   * twice is fatal in mongoose, and in a workspace where a module can be
   * imported down two paths that is not hypothetical.
   */
  static usingDefaultConnection(): MongoSpotStore {
    const existing = mongoose.models[SPOT_MODEL_NAME] as Model<any> | undefined;
    return new MongoSpotStore(existing ?? mongoose.model(SPOT_MODEL_NAME, spotSchema));
  }
}

/** Rows that still read as spots. One corrupt document costs its own row and nothing else. */
function keep(docs: unknown): PlainSpot[] {
  const rows = Array.isArray(docs) ? docs : [];
  const out: PlainSpot[] = [];
  for (const doc of rows) {
    const spot = toPlainSpot(doc as Record<string, unknown>);
    if (spot) out.push(spot);
  }
  return out;
}
