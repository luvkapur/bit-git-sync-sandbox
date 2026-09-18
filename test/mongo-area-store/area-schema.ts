import { Schema } from 'mongoose';
import type { PlainWatchArea } from '@luvktest/test.watch-area';

/**
 * The watch-areas collection.
 *
 * A cap — a centre and a radius — stored as the entity holds it, in degrees
 * and kilometres, rather than as GeoJSON. Nothing here queries by geography:
 * containment is `WatchArea.contains`, run in the process against a feed that
 * is already in memory. Storing a `2dsphere` index we never search would be
 * paying for a capability at the point where it is least useful.
 *
 * `ownerId` is indexed and `visibility` with it, because the one read this
 * collection serves is "mine, plus everything shared".
 */
export const areaSchema = new Schema<PlainWatchArea>({
  id: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  radiusKm: { type: Number, required: true },
  visibility: { type: String, required: true, default: 'private' },
  /** ISO 8601 */
  createdAt: { type: String, required: true },
});

areaSchema.index({ ownerId: 1, createdAt: -1 });
areaSchema.index({ visibility: 1 });

/** the model name, so a caller can reuse an already-registered model. */
export const AREA_MODEL_NAME = 'WatchArea';
