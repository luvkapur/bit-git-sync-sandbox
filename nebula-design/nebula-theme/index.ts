/**
 * NebulaTheme component.
 * A composed theme based on Aura's dark mode with specific futuristic overrides.
 */
export { NebulaTheme } from "./nebula-theme.js";

/**
 * Props for the NebulaTheme component.
 */
export type { NebulaThemeProps } from "./nebula-theme.js";

/**
 * Re-exporting AuraThemeOverrides as it's part of NebulaTheme's public API
 * for its `overrides` prop. Consumers can use this type to provide
 * valid override structures.
 */
export type { AuraThemeOverrides } from '@luvktest/test.aura-theme';