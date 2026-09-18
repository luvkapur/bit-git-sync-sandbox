import type { DefaultRESTRoute } from '@bitdev/symphony.backends.backend-server';
import type { RouteHandler, RouteRequest, RouteResponse } from '@luvktest/test.auth-routes';

/**
 * Lets the shared route components register into a Symphony backend.
 *
 * Symphony hands a backend a list of `{ method, path, route }` objects; the auth,
 * spot and area routes register themselves against something Express-shaped.
 * Both sides are already structural — `AppLike` is only `get`/`post` taking
 * handler chains — so the gap is an adapter, not a rewrite.
 *
 * This exists because the alternative was the aspect keeping its own copy of
 * signup and login, which is exactly what it had: a second implementation that
 * drifted until it called methods `SkyApi` no longer has, and only Ripple caught
 * it, because a local type-check only re-checks components that changed.
 */
export function collectRoutes() {
  const routes: DefaultRESTRoute[] = [];

  const add = (method: DefaultRESTRoute['method']) =>
    (path: string, ...handlers: RouteHandler[]) => {
      routes.push({
        method,
        path,
        route: async (req: unknown, res: unknown) => {
          // Express runs a chain until a handler answers instead of calling
          // next(); middleware that rejects a request simply never calls it.
          // Symphony has no chain, so walk it here and stop the moment a
          // handler declines to continue.
          for (const handler of handlers) {
            let advanced = false;
            await handler(req as RouteRequest, res as RouteResponse, () => { advanced = true; });
            if (!advanced) return;
          }
        },
      } as DefaultRESTRoute);
    };

  return {
    routes,
    app: {
      get: add('get'),
      post: add('post'),
      patch: add('patch'),
      delete: add('delete'),
    },
  };
}
