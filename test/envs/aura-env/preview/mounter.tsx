import React from 'react';
import { createMounter } from '@teambit/react.mounter';
import { AuraTheme } from '@luvktest/test.aura-theme';

/**
 * provide your component compositions (preview) with the context they need to run.
 * for example, a router, a theme, a data provider, etc.
 * components added here as providers, should be listed as host-dependencies in your host-dependencies.ts file.
 * @see https://bit.dev/docs/react-env/component-previews#composition-providers
 */
export function AuraEnvProvider({ children }: { children: React.ReactNode }) {
  return <AuraTheme>{children}</AuraTheme>;
}

/**
 * the entry for the app (preview runtime) that renders your component previews.
 * This mounter wraps compositions with the AuraTheme provider.
 * @see https://docs/react-env/component-previews#composition-mounter
 */
export default createMounter(AuraEnvProvider) as any;