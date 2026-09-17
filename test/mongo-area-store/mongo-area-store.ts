import mongoose, { Model } from 'mongoose';
import type { PlainWatchArea } from '@luvktest/test.watch-area';
import type { AreaStore } from '@luvktest/test.area-routes';
import { AREA_MODEL_NAME, areaSchema } from './area-schema.js';
import { toPlainArea } from './area-document.js';

/**
 * The watch-areas collection, behind the `AreaStore` port.
 *
 * Storage and five queries. The visibility rule is `areasVisibleTo`, the
 * ownership rule is checked in the route against the token, and what a legal
 * area is belongs to `WatchArea` — so all three are tested without a database
 * and this class has no opinion about any of them.
 *
 * @example
 * const store = MongoAreaStore.usingDefaultConnection();
 */
export class MongoAreaStore implements AreaStore {
  constructor(private readonly areas: Model<PlainWatchArea>) {}

  /**
   * The rows that could be visible to this user.
   *
   * The `$or` is `areasVisibleTo` expressed as an index lookup, so the database
   * narrows instead of the process reading every area in the world. It is an
   * optimisation of that rule and not a replacement for it: the caller runs the
   * entity's own predicate over the result, which is what stops the two
   * drifting apart the day a third visibility is added.
   */
  async candidatesFor(userId: string): Promise<PlainWatchArea[]> {
    const docs = await this.areas
      .find({ $or: [{ ownerId: userId }, { visibility: 'shared' }] })
      .sort({ createdAt: -1 })
      .lean();
    const rows = Array.isArray(docs) ? docs : [];
    const out: PlainWatchArea[] = [];
    for (const doc of rows) {
      const area = toPlainArea(doc as Record<string, unknown>);
      if (area) out.push(area);
    }
    return out;
  }

  async findById(id: string): Promise<PlainWatchArea | undefined> {
    const doc = await this.areas.findOne({ id }).lean();
    return toPlainArea(doc as Record<string, unknown> | null);
  }

  async insert(area: PlainWatchArea): Promise<void> {
    await this.areas.create(area);
  }

  /**
   * Overwrite by id.
   *
   * `$set` of the whole entity rather than of the fields the patch named: the
   * caller has already rebuilt the area through the constructor, so what is
   * written is a state the entity agreed to — a partial update could leave a
   * row that no combination of legal edits could produce.
   *
   * The owner is not in the filter. It does not need to be: the route loaded
   * this row and checked its owner against the token before calling, and the
   * id it passes back is the one it read.
   */
  async replace(area: PlainWatchArea): Promise<boolean> {
    const result = await this.areas.updateOne({ id: area.id }, { $set: { ...area } });
    return (result.matchedCount ?? 0) === 1;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.areas.deleteOne({ id });
    return (result.deletedCount ?? 0) === 1;
  }

  async ensureIndexes(): Promise<void> {
    await this.areas.createIndexes();
  }

  /** Build a store on the connection the process already has, reusing a registered model. */
  static usingDefaultConnection(): MongoAreaStore {
    const existing = mongoose.models[AREA_MODEL_NAME] as Model<PlainWatchArea> | undefined;
    return new MongoAreaStore(existing ?? mongoose.model<PlainWatchArea>(AREA_MODEL_NAME, areaSchema));
  }
}
