export type PlainFollow = {
  followerId: string;
  followeeId: string;
  /** ISO 8601 */
  since: string;
};

/**
 * Who watches whom.
 *
 * Directed and unconfirmed — following is not a friendship, it needs no reply.
 * Both directions are indexed because the live feed asks "who do I follow" on
 * every poll and a profile asks "who follows them" on every view.
 */
export class FollowGraph {
  private readonly out = new Map<string, Map<string, string>>();
  private readonly inbound = new Map<string, Set<string>>();

  static from(follows: readonly PlainFollow[]): FollowGraph {
    const graph = new FollowGraph();
    for (const f of follows) graph.follow(f.followerId, f.followeeId, new Date(f.since));
    return graph;
  }

  /** Idempotent, and refuses the two cases that are always a bug: following yourself, and following nobody. Returns whether anything changed. */
  follow(followerId: string, followeeId: string, since: Date = new Date()): boolean {
    if (!followerId || !followeeId || followerId === followeeId) return false;
    const edges = this.out.get(followerId) ?? new Map<string, string>();
    if (edges.has(followeeId)) return false;
    edges.set(followeeId, since.toISOString());
    this.out.set(followerId, edges);
    const followers = this.inbound.get(followeeId) ?? new Set<string>();
    followers.add(followerId);
    this.inbound.set(followeeId, followers);
    return true;
  }

  unfollow(followerId: string, followeeId: string): boolean {
    const removed = this.out.get(followerId)?.delete(followeeId) ?? false;
    if (removed) this.inbound.get(followeeId)?.delete(followerId);
    return removed;
  }

  isFollowing(followerId: string, followeeId: string): boolean {
    return this.out.get(followerId)?.has(followeeId) ?? false;
  }

  following(userId: string): string[] {
    return [...(this.out.get(userId)?.keys() ?? [])];
  }

  followers(userId: string): string[] {
    return [...(this.inbound.get(userId) ?? [])];
  }

  counts(userId: string): { following: number; followers: number } {
    return { following: this.out.get(userId)?.size ?? 0, followers: this.inbound.get(userId)?.size ?? 0 };
  }

  /** Both follow each other. Worth surfacing on a profile; not worth a second edge type. */
  isMutual(a: string, b: string): boolean {
    return this.isFollowing(a, b) && this.isFollowing(b, a);
  }

  toObject(): PlainFollow[] {
    return [...this.out].flatMap(([followerId, edges]) =>
      [...edges].map(([followeeId, since]) => ({ followerId, followeeId, since }))
    );
  }
}
