import { createTheme, DeepPartial } from '@bitdesign/sparks.sparks-theme';
import { AuraThemeSchema, auraTokens } from './aura-tokens.js';

/**
 * Creating and declaring the Aura theme.
 * Defines the theme schema as a type variable for proper type completions.
 */
export const AuraThemeProvider = createTheme<AuraThemeSchema>({
  includeSparksTokens: false,
  tokens: () => auraTokens(), // Called auraTokens to get the actual token object
});

/**
 * A React hook for contextual access to design tokens from components
 * within the AuraTheme.
 */
export const { useTheme } = AuraThemeProvider;

/**
 * Type for theme overrides, ensuring partial updates are strongly typed.
 */
export type AuraThemeOverrides = DeepPartial<AuraThemeSchema>;