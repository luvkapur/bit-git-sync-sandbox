import { useEffect, useMemo, useRef, useState } from 'react';
import { SkyClient, type WireUser } from './sky-client.js';

export type Session = {
  client: SkyClient;
  /** who is signed in, or null. Kept in React state so the chrome re-renders. */
  user: WireUser | null;
  /**
   * True only while the stored pair is being checked on first load.
   *
   * It matters: a restored session takes a round trip, and without this the
   * header renders "Sign in" for a moment to somebody who is signed in, which
   * is the single most alarming thing a page can do on refresh.
   */
  booting: boolean;
};

/**
 * The session, restored.
 *
 * On boot with a stored pair this asks `/auth/me`. The client's own rule does
 * the rest: a 401 with `expired-access-token` refreshes once and retries once,
 * and anything else drops the tokens. So "restore, refresh if stale, sign out
 * cleanly if not" is one call here rather than a ladder of ifs.
 */
export function useSession(apiBase: string): Session {
  const client = useMemo(() => new SkyClient(apiBase), [apiBase]);
  const [user, setUser] = useState<WireUser | null>(() => client.user);
  const [booting, setBooting] = useState(() => Boolean(client.session));
  const booted = useRef('');

  useEffect(() => client.subscribe(() => setUser(client.user)), [client]);

  useEffect(() => {
    if (booted.current === apiBase) return;
    booted.current = apiBase;
    if (!client.session) { setBooting(false); return; }
    let live = true;
    client.whoAmI()
      .catch(() => {
        // `send` has already dropped the pair on a real refusal. A dead network
        // is the other case, and there the pair is deliberately kept — but we
        // are not going to claim someone is signed in on the strength of it.
        client.signOutLocal();
      })
      .finally(() => { if (live) setBooting(false); });
    return () => { live = false; };
  }, [client, apiBase]);

  return { client, user, booting };
}
