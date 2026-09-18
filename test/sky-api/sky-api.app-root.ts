import express from 'express';
import { registerAreaRoutes } from '@luvktest/test.area-routes';
import { selectAuthProvider } from '@luvktest/test.auth-provider';
import { registerAuthDisabledRoutes, registerAuthRoutes } from '@luvktest/test.auth-routes';
import { ConfirmationManager } from '@luvktest/test.email-confirmation';
import { MongoAreaStore } from '@luvktest/test.mongo-area-store';
import { MongoSpotStore } from '@luvktest/test.mongo-spot-store';
import { registerSpotRoutes } from '@luvktest/test.spot-routes';
import { LocalAuthProvider, PUBLIC_URL_ENV, authLinksFrom } from '@luvktest/test.local-auth-provider';
import { ConsoleMailer } from '@luvktest/test.mailer';
import { MongoConfirmationStore } from '@luvktest/test.mongo-confirmation-store';
import { MongoSessionStore } from '@luvktest/test.mongo-session-store';
import { resendMailerFromEnv } from '@luvktest/test.resend-mailer';
import { SessionManager } from '@luvktest/test.session-manager';
import { readAuthSecret } from '@luvktest/test.token-crypto';
import { SkyApi } from './sky-api.js';

/**
 * How often to sweep sessions and confirmation links that are past their
 * expiry.
 *
 * Housekeeping, not security — the rules already refuse them. Hourly is
 * plenty: the collections grow by one row per login, refresh and signup.
 */
const SWEEP_MS = 60 * 60 * 1000;

export async function run() {
  const app = express();
  app.use(express.json());
  const port = process.env.PORT || 3000;

  const sky = await SkyApi.connect();
  await sky.purgeProbeAccounts();
  await sky.warm();
  sky.start();

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

  /**
   * Authentication.
   *
   * Everything below is wired to interfaces: the routes take an `AuthProvider`
   * and the provider takes a `Mailer`. Moving to a managed provider is a value
   * in `SKYLINE_AUTH_PROVIDER` and one more entry in the registry below —
   * nothing in this file's route table changes.
   *
   * If any of it cannot be built — no signing secret, a half-configured mail
   * provider, a provider name nobody registered — authentication is disabled
   * rather than faked: every auth route answers 503 and says why, and the
   * public flight map carries on. An app that appears to authenticate people
   * and does not is worse than one that says it cannot.
   */
  let sweep: ReturnType<typeof setInterval> | undefined;
  try {
    const secret = readAuthSecret();
    const sessions = new SessionManager(MongoSessionStore.usingDefaultConnection(), secret);
    const confirmations = new ConfirmationManager(MongoConfirmationStore.usingDefaultConnection(), secret);

    // No provider configured → the dev mailer, which prints the email and the
    // confirmation URL to this log and says loudly that it sent nothing.
    const mailer = resendMailerFromEnv() ?? new ConsoleMailer();
    const publicUrl = process.env[PUBLIC_URL_ENV] || `http://localhost:${port}`;

    const auth = selectAuthProvider({
      local: () =>
        new LocalAuthProvider({
          accounts: sky,
          sessions,
          confirmations,
          mailer,
          links: authLinksFrom(publicUrl),
          appName: 'Skyline',
        }),
    });

    registerAuthRoutes(app, { auth, watchlists: sky });

    /**
     * Spotting and watch areas.
     *
     * Inside the same `try` as the auth wiring, and that is the whole design:
     * every route below takes a Bearer token, so if authentication could not be
     * built there is no honest way to serve them. They are not registered at
     * all, `registerAuthDisabledRoutes` claims the auth paths, and these answer
     * 404 — which the UI already reads as "not on this deployment" and steps
     * around, rather than showing a spot button that cannot possibly work.
     *
     * The indexes are awaited, not left to build in the background. The unique
     * key on `(spotterId, icao, timeBucket)` is what makes the cooldown safe
     * against two simultaneous requests, and a constraint that arrives a few
     * seconds after the first write is not a constraint.
     */
    const spots = MongoSpotStore.usingDefaultConnection();
    const areas = MongoAreaStore.usingDefaultConnection();
    await Promise.all([spots.ensureIndexes(), areas.ensureIndexes()]);

    registerSpotRoutes(app, { auth, spots, feed: sky, spotters: sky });
    registerAreaRoutes(app, { auth, areas });

    console.log(`[sky-api] auth provider "${auth.name}", mailer "${mailer.name}", links at ${publicUrl}`);

    await Promise.all([sessions.purgeExpired(), confirmations.purgeExpired()]);
    sweep = setInterval(() => {
      Promise.all([sessions.purgeExpired(), confirmations.purgeExpired()]).catch((e: unknown) =>
        console.warn('[sky-api] auth sweep failed', e)
      );
    }, SWEEP_MS);
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'authentication could not be configured';
    console.error(`[sky-api] authentication disabled — ${reason}`);
    registerAuthDisabledRoutes(app, reason);
  }

  const server = app.listen(port, () => console.log(`🛰  sky-api ready on port ${port}`));
  return {
    port,
    stop: async () => {
      if (sweep) clearInterval(sweep);
      sky.stop();
      server.closeAllConnections();
      server.close();
    },
  };
}
