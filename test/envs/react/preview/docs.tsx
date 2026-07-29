import React from 'react';
import { createDocsTemplate } from '@teambit/docs.docs-template';
import { MemoryRouter } from 'react-router-dom';
import { ThemeSwitcher } from '@teambit/design.themes.theme-toggler';
import { NavigationProvider } from '@teambit/base-react.navigation.link';
import { reactRouterAdapter } from '@teambit/ui-foundation.ui.navigation.react-router-adapter';
import { CloudProvider } from '@teambit/cloud.cloud-provider';

/**
 * use the provider to inject and wrap your component overview
 * with common needs like [routing](), [theming]() and [data fetching]().
 */
// eslint-disable-next-line react/prop-types
export function DocsProvider({ children }) {
  return (
    <NavigationProvider implementation={reactRouterAdapter as any}>
      {/* @ts-ignore */}
      <MemoryRouter>
        <ThemeSwitcher>
          <CloudProvider>{children}</CloudProvider>
        </ThemeSwitcher>
      </MemoryRouter>
    </NavigationProvider>
  );
}

/**
 * customize the bit documentation template or
 * replace this with one of your own.
 */
export default createDocsTemplate(DocsProvider);
