import React, { useEffect, ComponentType } from 'react';
import classNames from 'classnames';
import { useThemeController } from '@luvktest/test.aura-theme';
import { SunIcon } from './sun-icon.js';
import { MoonIcon } from './moon-icon.js';
import type { ThemeDefinition } from './theme-definition-type.js';
import styles from './theme-toggler.module.scss';

/**
 * Defines the common properties accepted by icon components.
 * This allows for consistent styling and attribute application across different icons.
 */
export type IconProps = {
  /**
   * Optional CSS class name to apply to the root SVG element of the icon.
   */
  className?: string;
  /**
   * Optional inline styles to apply to the root SVG element of the icon.
   */
  style?: React.CSSProperties;
  /**
   * Allows pass-through of other SVG attributes to the icon.
   */
  [key: string]: any;
};

const defaultThemes: ThemeDefinition[] = [
  { value: 'aura', label: 'Aura' },
  { value: 'nebula', label: 'Nebula' },
];

/**
 * Defines the properties for the ThemeToggler component.
 */
export type ThemeTogglerProps = {
  /**
   * Optional custom CSS class to apply to the root `div` container of the toggler.
   */
  className?: string;
  /**
   * Optional inline styles to apply to the root `div` container.
   */
  style?: React.CSSProperties;
  /**
   * Optional custom CSS class for the light/dark mode toggle button.
   */
  modeTogglerClassName?: string;
  /**
   * Optional inline styles for the light/dark mode toggle button.
   */
  modeTogglerStyle?: React.CSSProperties;
  /**
   * Optional custom CSS class for the theme selection dropdown (`select` element).
   */
  themeSelectorClassName?: string;
  /**
   * Optional inline styles for the theme selection dropdown (`select` element).
   */
  themeSelectorStyle?: React.CSSProperties;
  /**
   * Custom icon component to display for the light theme.
   * Defaults to a pre-defined SunIcon.
   */
  lightIcon?: ComponentType<IconProps>;
  /**
   * Custom icon component to display for the dark theme.
   * Defaults to a pre-defined MoonIcon.
   */
  darkIcon?: ComponentType<IconProps>;
  /**
   * Aria-label for the mode toggle button when the current theme is light (action is to switch to dark).
   * Defaults to 'Switch to dark theme'.
   */
  ariaLabelLight?: string;
  /**
   * Aria-label for the mode toggle button when the current theme is dark (action is to switch to light).
   * Defaults to 'Switch to light theme'.
   */
  ariaLabelDark?: string;
  /**
   * Array of theme definitions for the dropdown. Each object should have `value` and `label`.
   * Defaults to `[{ value: 'aura', label: 'Aura' }, { value: 'nova', label: 'Nova' }]`.
   */
  availableThemes?: ThemeDefinition[];
  /**
   * The `value` of the initially selected theme from `availableThemes`.
   * Defaults to `'aura'`.
   */
  defaultThemeName?: string;
  /**
   * Aria-label for the theme selection dropdown.
   * Defaults to `'Select theme'`.
   */
  themeSelectorAriaLabel?: string;

  /** Current theme brand ('nebula' | 'nova'). */
  brand?: string;

  onBrandChange?: (brand: string) => void;
};

/**
 * ThemeToggler component provides UI controls to switch between light/dark modes
 * and select a brand theme (e.g., Aura, Nova). It updates the `data-theme`
 * attribute on the root HTML element to reflect the current combination.
 */
export const ThemeToggler = ({
  className,
  style,
  modeTogglerClassName,
  modeTogglerStyle,
  themeSelectorClassName,
  themeSelectorStyle,
  lightIcon: LightIconComponent = SunIcon,
  darkIcon: DarkIconComponent = MoonIcon,
  ariaLabelLight = 'Switch to dark theme',
  ariaLabelDark = 'Switch to light theme',
  availableThemes = defaultThemes,
  defaultThemeName = 'aura',
  themeSelectorAriaLabel = 'Select theme',
  brand: selectedBrandTheme = 'aura',
  onBrandChange,
}: ThemeTogglerProps) => {
  const { themeMode, toggleTheme } = useThemeController();
  const handleBrandThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    onBrandChange?.(e.target.value);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = `${selectedBrandTheme}-${themeMode}`;
    }
  }, [selectedBrandTheme, themeMode]);

  const currentModeAriaLabel =
    themeMode === 'light' ? ariaLabelLight : ariaLabelDark;

  return (
    <div
      className={classNames(styles.themeTogglerContainer, className)}
      style={style}
    >
      <button
        type="button"
        className={classNames(styles.modeToggler, modeTogglerClassName)}
        style={modeTogglerStyle}
        onClick={toggleTheme}
        aria-label={currentModeAriaLabel}
        aria-pressed={themeMode === 'dark'}
      >
        <LightIconComponent
          className={classNames(
            styles.modeTogglerIcon,
            themeMode === 'light'
              ? styles.lightIconActive
              : styles.lightIconInactive
          )}
        />
        <DarkIconComponent
          className={classNames(
            styles.modeTogglerIcon,
            themeMode === 'dark'
              ? styles.darkIconActive
              : styles.darkIconInactive
          )}
        />
      </button>

      {availableThemes && availableThemes.length > 0 && (
        <select
          className={classNames(styles.themeSelector, themeSelectorClassName)}
          style={themeSelectorStyle}
          value={selectedBrandTheme}
          onChange={handleBrandThemeChange}
          aria-label={themeSelectorAriaLabel}
        >
          {availableThemes.map((themeOption) => (
            <option
              key={themeOption.value}
              value={themeOption.value}
              disabled={themeOption.disabled}
            >
              {themeOption.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};
