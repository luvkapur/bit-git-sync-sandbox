import { DeepPartial } from '@bitdesign/sparks.sparks-theme';
import { AuraThemeSchema } from './aura-tokens.js';
import { darkThemeSchema } from "./dark-tokens.js";

/**
 * Defines available theme options.
 * Currently includes the 'dark' theme variation.
 * The default (light) theme is implicitly defined by `auraTokens` and not listed here.
 */
export const themeOptions: Record<string, DeepPartial<AuraThemeSchema>> = {
  dark: darkThemeSchema,
  // Add other theme variations here if needed, e.g., highContrast: highContrastSchema
};