import type { DefaultRESTRoute } from '@bitdev/symphony.backends.backend-server';
import type { SkyApi } from '@luvktest/test.sky-api';

/**
 * The HTTP surface of the sky service, as Symphony route objects.
 *
 * This is glue only. Every line of behaviour — polling, the last-good
 * snapshot, the enrichment caches, accounts, the watchlist — lives in
 * `SkyApi` and is called, not reimplemented. Symphony hands each backend a
 * list of routes instead of an Express app, so the same handlers that
 * `sky-api.app-root.ts` registers with `app.get(...)` are expressed here as
 * `{ method, path, route }`.
 */
export function createSkyRoutes(sky: SkyApi): DefaultRESTRoute[] {
  const fail = (res: any, e: unknown) =>
    res.status(400).json({ error: e instanceof Error ? e.message : 'something went wrong' });

  return [
    {
      method: 'get',
      path: '/',
      route: (_req, res) => {
        const { rows, ...meta } = sky.state();
        res.json(meta);
      },
    },

    { method: 'get', path: '/flights', route: (_req, res) => res.json(sky.state()) },

    {
      method: 'get',
      path: '/aircraft/:icao',
      route: async (req, res) => res.json(await sky.aircraft(req.params.icao)),
    },
    {
      method: 'get',
      path: '/route/:callsign',
      route: async (req, res) => res.json(await sky.route(req.params.callsign)),
    },

    /** SSE — Symphony's gateway and the browser runtime both proxy plain HTTP
     *  and neither handles a protocol upgrade, so this is deliberately not a
     *  WebSocket. Two proxy hops now sit in front of it, which is why the
     *  no-transform and X-Accel-Buffering headers matter more here, not less. */
    {
      method: 'get',
      path: '/live',
      route: (req, res) => {
        res.set({
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });
        res.flushHeaders?.();
        res.write(`data: ${JSON.stringify(sky.state())}\n\n`);
        const stop = sky.addListener((p) => res.write(p));
        const beat = setInterval(() => res.write(': ping\n\n'), 25_000);
        req.on('close', () => { clearInterval(beat); stop(); });
      },
    },

    {
      method: 'post',
      path: '/signup',
      route: async (req, res) => {
        const { email, name, password } = req.body ?? {};
        try {
          const u = await sky.signup(String(email ?? ''), String(name ?? ''), String(password ?? ''));
          res.status(201).json({ user: u.toPublic() });
        } catch (e) { fail(res, e); }
      },
    },

    {
      method: 'post',
      path: '/login',
      route: async (req, res) => {
        const { email, password } = req.body ?? {};
        const u = await sky.login(String(email ?? ''), String(password ?? ''));
        if (!u) { res.status(401).json({ error: 'invalid email or password' }); return; }
        res.json({ user: u.toPublic() });
      },
    },

    {
      method: 'get',
      path: '/watchlist/:userId',
      route: async (req, res) => res.json({ watching: await sky.watchlist(req.params.userId) }),
    },

    {
      method: 'post',
      path: '/watch',
      route: async (req, res) => {
        const { userId, icao, callsign } = req.body ?? {};
        if (!userId) { res.status(401).json({ error: 'sign in first' }); return; }
        await sky.watch(String(userId), String(icao), String(callsign ?? ''));
        res.status(201).json({ watching: await sky.watchlist(String(userId)) });
      },
    },

    {
      method: 'post',
      path: '/unwatch',
      route: async (req, res) => {
        const { userId, icao } = req.body ?? {};
        if (!userId) { res.status(401).json({ error: 'sign in first' }); return; }
        await sky.unwatch(String(userId), String(icao));
        res.json({ watching: await sky.watchlist(String(userId)) });
      },
    },
  ];
}
