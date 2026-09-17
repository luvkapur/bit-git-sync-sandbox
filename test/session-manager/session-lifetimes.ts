/**
 * How long each of the three clocks runs.
 *
 * All values are milliseconds, because that is what `Date` arithmetic wants
 * and converting at the edges is where off-by-a-thousand bugs live.
 */
export type SessionLifetimes = {
  /** how long an access token is honoured. */
  accessTtlMs: number;
  /** how long a refresh token can be exchanged. */
  refreshTtlMs: number;
  /** the ceiling on a whole session family, however often it rotates. */
  absoluteTtlMs: number;
};

/**
 * The defaults Skyline ships with.
 *
 * - **15 minutes** of access token. Long enough that a normal page never
 *   notices, short enough that a token scraped out of a log or a proxy is
 *   worthless by the time anyone reads it.
 * - **14 days** of refresh token. This is what "keep me signed in" actually
 *   means: come back inside a fortnight and you are still you.
 * - **90 days** absolute. After three months you type your password again,
 *   no matter how continuously you have been using the app. This is the only
 *   bound a stolen refresh token cannot refresh its way past.
 */
export const DEFAULT_SESSION_LIFETIMES: SessionLifetimes = {
  accessTtlMs: 15 * 60 * 1000,
  refreshTtlMs: 14 * 24 * 60 * 60 * 1000,
  absoluteTtlMs: 90 * 24 * 60 * 60 * 1000,
};
