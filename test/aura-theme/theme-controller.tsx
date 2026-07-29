import { createContext, useContext } from 'react';

/**
 * Defines the possible theme modes.
 * 'light' is typically the default.
 * 'dark' provides an alternative color scheme for low-light environments.
 */
export type ThemeMode = 'light' | 'dark';

/**
 * Defines the shape of the theme context.
 * This context provides access to the current theme mode and functions to control it.
 */
export interface ThemeContextValue {
  /**
   * Current theme mode (e.g., 'light' or 'dark').
   */
  themeMode: ThemeMode;

  /**
   * Function to toggle between light and dark modes.
   * Switches 'light' to 'dark' and 'dark' to 'light'.
   */
  toggleTheme: () => void;

  /**
   * Function to set a specific theme mode.
   * @param mode - The theme mode to set ('light' or 'dark').
   */
  setThemeMode: (mode: ThemeMode) => void;
}

/**
 * React context for managing and providing theme state.
 * Components can consume this context to adapt to the current theme.
 */
export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Hook for accessing and controlling the current theme state (mode).
 * Provides the current `themeMode` and functions `toggleTheme` and `setThemeMode`.
 * This hook must be used within an `AuraTheme` component tree.
 * @throws Error if used outside of an `AuraTheme` provider.
 * @returns The theme context value.
 */
export function useThemeController(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useThemeController must be used within an AuraTheme component');
  }

  return context;
}