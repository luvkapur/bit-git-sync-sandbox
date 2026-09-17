import type { PlainWatchArea } from '@luvktest/test.watch-area';

/**
 * The watch-area collection as these routes need it.
 *
 * Storage only. Who may see an area is `areasVisibleTo`, who may change one is
 * checked in the route against the token, and what a legal area *is* is
 * `WatchArea`'s constructor. None of those three rules is in here, which is
 * why all three are tested without a database.
 */
export type AreaStore = {
  /**
   * The rows that could possibly be visible to this user: their own, plus
   * every shared one.
   *
   * Narrowed here so the database does the filtering off an index rather than
   * the process doing it over every area in the world. `areasVisibleTo` is
   * still applied to the result — this query is an optimisation of that rule
   * and must never be allowed to become a second, subtly different copy of it.
   */
  candidatesFor(userId: string): Promise<PlainWatchArea[]>;

  findById(id: string): Promise<PlainWatchArea | undefined>;

  insert(area: PlainWatchArea): Promise<void>;

  /** Overwrite by id. False when there was no such row. */
  replace(area: PlainWatchArea): Promise<boolean>;

  /** False when there was no such row. */
  remove(id: string): Promise<boolean>;
};
