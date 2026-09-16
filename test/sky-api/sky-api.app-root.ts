import express from 'express';
import { SkyApi } from './sky-api.js';

export async function run() {
  const app = express();
  app.use(express.json());
  const port = process.env.PORT || 3000;

  const sky = await SkyApi.connect();
  await sky.purgeProbeAccounts();
  await sky.warm();
  sky.start();

  const fail = (res: any, e: unknown) =>
    res.status(400).json({ error: e instanceof Error ? e.message : 'something went wrong' });

  app.get('/', async (_req, res) => {
    await sky.ensureData();
    const { rows, ...meta } = sky.state();
    res.json(meta);
  });

  app.get('/flights', async (_req, res) => {
    await sky.ensureData();
    res.json(sky.state());
  });

  app.get('/aircraft/:icao', async (req, res) => res.json(await sky.aircraft(req.params.icao)));
  app.get('/route/:callsign', async (req, res) => res.json(await sky.route(req.params.callsign)));

  /** SSE — the platform's generated reverse proxy streams HTTP but does not
   *  handle protocol upgrades, so this is deliberately not a WebSocket. */
  app.get('/live', (req, res) => {
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
  });

  app.post('/signup', async (req, res) => {
    const { email, name, password } = req.body ?? {};
    try {
      const u = await sky.signup(String(email ?? ''), String(name ?? ''), String(password ?? ''));
      res.status(201).json({ user: u.toPublic() });
    } catch (e) { fail(res, e); }
  });

  app.post('/login', async (req, res) => {
    const { email, password } = req.body ?? {};
    const u = await sky.login(String(email ?? ''), String(password ?? ''));
    if (!u) { res.status(401).json({ error: 'invalid email or password' }); return; }
    res.json({ user: u.toPublic() });
  });

  app.get('/watchlist/:userId', async (req, res) => res.json({ watching: await sky.watchlist(req.params.userId) }));

  app.post('/watch', async (req, res) => {
    const { userId, icao, callsign } = req.body ?? {};
    if (!userId) { res.status(401).json({ error: 'sign in first' }); return; }
    await sky.watch(String(userId), String(icao), String(callsign ?? ''));
    res.status(201).json({ watching: await sky.watchlist(String(userId)) });
  });

  app.post('/unwatch', async (req, res) => {
    const { userId, icao } = req.body ?? {};
    if (!userId) { res.status(401).json({ error: 'sign in first' }); return; }
    await sky.unwatch(String(userId), String(icao));
    res.json({ watching: await sky.watchlist(String(userId)) });
  });

  const server = app.listen(port, () => console.log(`🛰  sky-api ready on port ${port}`));
  return { port, stop: async () => { sky.stop(); server.closeAllConnections(); server.close(); } };
}
