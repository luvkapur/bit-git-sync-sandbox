import { ReactNode, useCallback, useState, useMemo, CSSProperties } from 'react';
import classNames from 'classnames';
import { AuraThemeProvider, AuraThemeOverrides } from './aura-theme-provider.js';
import { AuraThemeSchema } from './aura-tokens.js'; // Added import for AuraThemeSchema
import { ThemeContext, ThemeContextValue, ThemeMode } from './theme-controller.js';
import {  DeepPartial } from '@bitdesign/sparks.sparks-theme';
import { themeOptions } from './theme-options.js';
import styles from './aura-theme.module.scss';

export type AuraThemeProps = {
  /**
   * A root ReactNode for the component tree applied with the theme.
   */
  children?: ReactNode;

  /**
   * Inject a class name to override the theme.
   * This allows consumers to affect the theme.
   */
  className?: string;

  /**
   * Override tokens in the schema using a deep partial structure.
   * Use this to customize specific theme tokens.
   */
  overrides?: AuraThemeOverrides;

  /**
   * Preset of the theme, e.g., 'light' or 'dark'.
   * Defaults to 'light' if not specified.
   */
  initialTheme?: ThemeMode;

  /**
   * Inline style object for the theme provider root element.
   */
  style?: CSSProperties;
};

/**
 * The AuraTheme component provides the Aura Design System's tokens, fonts,
 * and general styling to its component tree. It supports light and dark modes
 * and allows for token overrides.
 */
export function AuraTheme({ children, initialTheme = 'light', className, style, overrides, ...rest }: AuraThemeProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialTheme);

  const combinedOverrides = useMemo(() => {
    const modeSpecificOverrides: DeepPartial<AuraThemeSchema> = themeMode === 'dark' && themeOptions.dark ? themeOptions.dark : {};
    // Sparks ThemeProvider handles deep merging internally.
    // We provide the base mode overrides, and then the user's overrides.
    // For example, if user overrides `colors.primary.default`, it should take precedence
    // over `themeOptions.dark.colors.primary.default` if in dark mode.
    // The ThemeProvider should merge them in order: base tokens, then modeSpecificOverrides, then user overrides.
    // However, createTheme only accepts one `overrides` prop.
    // So, we need to pre-merge them here. User overrides should have higher precedence.
    // A proper deep merge utility would be ideal here.
    // For now, let's assume a shallow merge for top-level keys and rely on Sparks for deeper merging.
    // Or, more correctly, the ThemeProvider will apply `overrides` on top of its `tokens` prop.
    // So, if `tokens` is the light theme, and `overrides` contains dark theme modifications, it works.
    // If the user also provides overrides, they need to be merged *with* the dark theme modifications.
    // A simple spread merge:
    return {
      ...modeSpecificOverrides,
      ...overrides, // User overrides take precedence
    };
  }, [themeMode, overrides]);


  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState(prevMode => (prevMode === 'light' ? 'dark' : 'light'));
  }, []);

  const themeContextValue: ThemeContextValue = {
    themeMode,
    toggleTheme,
    setThemeMode,
  };

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <AuraThemeProvider.ThemeProvider
        className={classNames(styles.auraTheme, className)}
        style={style}
        overrides={combinedOverrides as Partial<AuraThemeSchema>} // Cast to Partial<AuraThemeSchema> to satisfy ThemeProvider's prop type
        {...rest}
      >
        {children}
      </AuraThemeProvider.ThemeProvider>
    </ThemeContext.Provider>
  );
}