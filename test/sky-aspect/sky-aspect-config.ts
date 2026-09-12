/**
 * configuration for the sky aspect.
 */
export type SkyAspectConfig = {
  /**
   * name the backend service registers under. Symphony's gateway proxies
   * `/<serviceName>` to it, and the browser runtime proxies `/api` to the
   * gateway — so the frontend reaches it at `/api/<serviceName>`.
   * defaults to `sky-api`, matching the component it wraps.
   */
  serviceName?: string;
};
