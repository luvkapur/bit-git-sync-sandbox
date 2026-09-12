import express from 'express';
import { SymphonyPlatformAspect, type SymphonyPlatformNode } from '@bitdev/symphony.symphony-platform';
import { SkyApi } from '@luvktest/test.sky-api';
import type { SkyAspectConfig } from './sky-aspect-config.js';
import { createSkyRoutes } from './sky-routes.js';

/**
 * Does this process actually serve the sky backend?
 *
 * A simple `Platform.from()` app is one process. Symphony is N: one container
 * per backend service, plus a gateway, plus the browser runtime — and every one
 * of them loads the whole aspect graph and runs every provider. Without this
 * guard the gateway would open its own Mongo connection and poll upstream on
 * its own schedule, which doubles the request rate against an API that is
 * already rate-limiting us, and quietly breaks the rule the service is built
 * on: one upstream request serves every viewer.
 *
 * Symphony's argv is `run service <name> <port>` / `run gateway <port>` /
 * `deploy`, and empty in local dev where one process runs everything. Default
 * to polling, and only stand down when this is positively another role.
 */
function servesBackend(serviceName: string): boolean {
  const args = process.argv.slice(2);
  if (args.includes('deploy')) return false;
  const i = args.indexOf('run');
  if (i === -1) return true;
  if (args[i + 1] === 'gateway') return false;
  if (args[i + 1] === 'service') return args[i + 2] === serviceName;
  return true;
}

/**
 * The sky service as a Symphony aspect.
 *
 * The aspect owns no domain logic. It connects `SkyApi`, warms it from the
 * last persisted snapshot, starts the poller, and hands Symphony the route
 * table — which is exactly what `sky-api.app-root.ts` does for the simple
 * platform. Being an aspect is what puts the Kubernetes and cloud-provider
 * deployers within reach; nothing about the service itself changed.
 */
export class SkyAspectNode {
  constructor(
    /**
     * the live sky service, or `undefined` in a process that does not serve
     * this backend (the gateway). see `servesBackend`.
     */
    readonly sky: SkyApi | undefined,
    private config: SkyAspectConfig,
  ) {}

  /**
   * current feed state — count, age, superlatives and the compact rows.
   * undefined where this process is not the one holding the feed.
   */
  state() {
    return this.sky?.state();
  }

  static dependencies = [SymphonyPlatformAspect];

  static defaultConfig: SkyAspectConfig = {
    serviceName: 'sky-api',
  };

  static async provider(
    [symphonyPlatform]: [SymphonyPlatformNode],
    config: SkyAspectConfig,
  ) {
    const serviceName = config.serviceName || 'sky-api';

    // MONGO_URL is the only backing service and is never set locally, so
    // connect() throws when it is missing — fail loudly rather than serve an
    // empty map. Only the process that serves this backend pays that cost.
    const sky = servesBackend(serviceName) ? await SkyApi.connect() : undefined;
    if (sky) {
      await sky.warm();
      sky.start();
    }

    // Register in every process regardless: the gateway builds its proxy table
    // from the registered names, so it has to see this backend even though it
    // never executes the handlers.
    symphonyPlatform.registerBackendServer([
      {
        name: serviceName,
        // Symphony's default backend only mounts a body parser on /graphql,
        // so REST routes that read req.body have to bring their own.
        middlewares: [express.json()],
        routes: sky ? createSkyRoutes(sky) : [],
      },
    ]);

    return new SkyAspectNode(sky, config);
  }
}

export default SkyAspectNode;
