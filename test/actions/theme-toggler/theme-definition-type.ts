/**
 * Defines the structure for a theme option in the theme selection dropdown.
 */
export type ThemeDefinition = {
  /**
   * The unique value for the theme (e.g., 'aura', 'nova').
   * This value will be used in the `data-theme` attribute.
   */
  value: string;
  /**
   * The display label for the theme in the dropdown (e.g., 'Aura Theme', 'Nova Theme').
   */
  label: string;
  /**
   * Optional flag to disable this theme option.
   */
  disabled?: boolean;
};