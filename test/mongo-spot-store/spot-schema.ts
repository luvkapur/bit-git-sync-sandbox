import { Schema } from 'mongoose';

/**
 * The spots collection.
 *
 * Three indexes, one of which is a rule rather than an optimisation.
 *
 * `(spotterId, icao, timeBucket)` is **unique**, and it is the only thing
 * standing between the cooldown and two concurrent requests. `SpotLog` checks
 * the cooldown by reading the last spot and then writing a new one; two
 * requests that arrive together both read "none" and both write, and the rule
 * is silently broken. Mongo will let exactly one of them create this key.
 *
 * `spottedAt` descending serves both feed queries — the newest page and the
 * catch-up page after a cursor — and `(spotterId, spottedAt)` serves a
 * spotter's own log without scanning everyone else's.
 */
export const spotSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    spotterId: { type: String, required: true },
    icao: { type: String, required: true },
    callsign: { type: String, default: '' },
    aircraftType: { type: String, required: false },
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
    /** metres, matching the flight entity */
    altitude: { type: Number, required: true },
    /** ISO 8601, so it sorts lexicographically and reads in a shell */
    spottedAt: { type: String, required: true },
    /**
     * The score as it stood when the spot was taken, frozen.
     *
     * Stored, not recomputed on read: traffic shifts, and a log entry that
     * silently re-rated itself months later would rewrite the user's history.
     */
    rarity: { type: Object, required: true },
    note: { type: String, required: false },
    /** `floor(spottedAt / cooldown)` — the third column of the unique key above */
    timeBucket: { type: Number, required: true },
  },
  { minimize: false }
);

spotSchema.index({ spotterId: 1, icao: 1, timeBucket: 1 }, { unique: true, name: 'one_spot_per_airframe_per_window' });
spotSchema.index({ spottedAt: -1 });
spotSchema.index({ spotterId: 1, spottedAt: -1 });

/** the model name, so a caller can reuse an already-registered model. */
export const SPOT_MODEL_NAME = 'Spot';
