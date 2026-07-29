import React from 'react';
import { createMounter } from '@teambit/react.mounter';
import { MemoryRouter } from 'react-router-dom';
import { ThemeSwitcher } from '@teambit/design.themes.theme-toggler';
import { NavigationProvider } from '@teambit/base-react.navigation.link';
import { reactRouterAdapter } from '@teambit/ui-foundation.ui.navigation.react-router-adapter';
import { CloudProvider } from '@teambit/cloud.cloud-provider';

/**
 * use the mounter to inject and wrap your component previews
 * with common needs like [routing](), [theming]() and [data fetching]().
 */
// eslint-disable-next-line react/prop-types
export function MyReactProvider({ children }) {
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
 * to replace that mounter component for different purposes, just return a function
 * that uses ReactDOM to render a node to a div.
 */
// @ts-ignore
export default createMounter(MyReactProvider) as any;
