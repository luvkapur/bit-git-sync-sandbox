import React from 'react';
import { createMounter } from '@teambit/react.mounter';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';

/**
 * Provides the NebulaTheme to component compositions (previews).
 * This ensures that all component previews are rendered within the context of the Nebula design system.
 * @param {object} props - The properties for the provider.
 * @param {React.ReactNode} props.children - The child components to be rendered within the theme.
 * @returns {JSX.Element} The NebulaTheme provider wrapping the children.
 */
export function NebulaEnvProvider({ children }: { children: React.ReactNode }) {
  return <NebulaTheme>{children}</NebulaTheme>;
}

/**
 * The entry for the app (preview runtime) that renders your component previews.
 * This mounter wraps compositions with the NebulaTheme provider.
 * @see https://bit.dev/docs/react-env/component-previews#composition-mounter
 */
export default createMounter(NebulaEnvProvider) as any;