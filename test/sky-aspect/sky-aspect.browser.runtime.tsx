import { SymphonyPlatformAspect, type SymphonyPlatformBrowser } from '@bitdev/symphony.symphony-platform';
import { SkyUi } from '@luvktest/test.sky-ui';
import type { SkyAspectConfig } from './sky-aspect-config.js';

/**
 * Browser half of the sky aspect: mounts the globe at the platform root.
 */
export class SkyAspectBrowser {
  constructor(
    private config: SkyAspectConfig,
  ) {}

  static dependencies = [SymphonyPlatformAspect];

  static defaultConfig: SkyAspectConfig = {
    serviceName: 'sky-api',
  };

  static async provider(
    [symphonyPlatform]: [SymphonyPlatformBrowser],
    config: SkyAspectConfig,
  ) {
    // the globe is the whole viewport and carries its own chrome. Sparks'
    // AppLayout would box it inside a page shell, so replace it with a
    // pass-through rather than restyle the component to fit.
    symphonyPlatform.registerLayoutComponent(({ children }) => <>{children}</>);

    symphonyPlatform.registerRoute([
      {
        path: '/',
        // the browser runtime proxies /api to the gateway, which routes to a
        // service by name — so the service the node runtime registered as
        // `sky-api` answers at `/api/sky-api`.
        component: () => <SkyUi apiBase={`/api/${config.serviceName}`} />,
      },
    ]);

    return new SkyAspectBrowser(config);
  }
}

export default SkyAspectBrowser;
