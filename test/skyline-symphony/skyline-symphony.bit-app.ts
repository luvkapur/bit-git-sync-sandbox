import { HarmonyPlatform } from '@bitdev/harmony.harmony-platform';
import { NodeJSRuntime } from '@bitdev/harmony.runtimes.nodejs-runtime';
import { BrowserRuntime } from '@bitdev/harmony.runtimes.browser-runtime';
import { SymphonyPlatformAspect } from '@bitdev/symphony.symphony-platform';
import { KubernetesAspect } from '@bitdev/symphony.deployers.kubernetes';
import { SkyAspectAspect } from '@luvktest/test.sky-aspect';

/**
 * Skyline, composed as a Symphony platform.
 *
 * Same components as the `Platform.from()` build in `test/skyline` — the
 * difference is that a Harmony platform can carry deployer aspects, so this
 * one reaches a Kubernetes cluster (and AWS/GCP/Azure) as well as Bit hosting.
 */
export const SkylineSymphony = HarmonyPlatform.from({
  name: 'skyline-symphony',

  platform: [SymphonyPlatformAspect, {
    name: 'Skyline',
    slogan: 'every aircraft on Earth',
    inSecure: true,
    // the globe is full-bleed and ships its own theme in
    // `sky-ui.module.css`; Sparks' theme provider would fight it.
    skipDefaultProviders: true,
    logo: 'https://static.bit.dev/brands/bit-logo-min.png',
  }],

  runtimes: [
    new BrowserRuntime(),
    // The Kubernetes deployer pulls in dockerode -> docker-modem -> ssh2, and
    // ssh2 reaches for a prebuilt cpu-features .node binding that is not on
    // disk; esbuild fails the whole bundle on the unresolvable path. cpu-features
    // is loaded inside a try/catch, so marking it external costs nothing.
    // ssh2 itself must NOT be external: docker-modem requires it at the top of
    // ssh.js with no guard, and an external require has no node_modules to find
    // next to a single-file bundle — the deployer then dies on startup.
    new NodeJSRuntime({
      esbuildOptions: { external: ['cpu-features'] },
    }),
  ],

  aspects: [
    // the whole app: the sky service on the node runtime, the globe on the
    // browser runtime. no HeaderAspect — SkyUi draws its own header.
    SkyAspectAspect,

    // bring-your-own-cloud: the Kubernetes deployer is a Symphony aspect.
    // no Dockerfile, no manifests - this config block is the whole migration.
    [KubernetesAspect, {
      baseImage: 'node:22',
      // MONGO_URL lives in a Kubernetes Secret in the target namespace, not in
      // this file and not in Bit. The deployer mounts it as envFrom.secretRef,
      // so the database stays entirely on the cluster owner's side.
      secrets: ['sky-env'],
      auth: {
        basic: {
          server: process.env.KUBE_SERVER,
          certificate: process.env.KUBE_CERT,
          token: process.env.KUBE_TOKEN,
        },
      },
      docker: {
        imagePrefix: process.env.DOCKER_REGISTRY,
        auth: { username: 'bit', password: 'bit', serveraddress: 'http://127.0.0.1:5002' },
      },
    }],
  ],
});

export default SkylineSymphony;
