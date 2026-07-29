import React, { useState, useEffect, useCallback } from 'react';
import classNames from 'classnames';
import { useThemeController } from '@luvktest/test.aura-theme';
import { SelectList, type SelectListItemType } from '@luvktest/test.inputs.select-list';

import styles from './theme-toggler.module.scss';
import { SunIcon } from './sun-icon.js';
import { MoonIcon } from './moon-icon.js';
import type { IconProps } from './icon-props-type.js';
import type { ThemeDefinition } from './theme-definition-type.js';

const defaultAvailableThemes: ThemeDefinition[] = [
  { value: 'aura', label: 'Aura' },
  { value: 'nova', label: 'Nova' },
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
   * Optional custom CSS class for the theme selection dropdown (`SelectList`).
   */
  themeSelectorClassName?: string;
  /**
   * Optional inline styles for the theme selection dropdown (`SelectList`).
   */
  themeSelectorStyle?: React.CSSProperties;
  /**
   * Custom icon component to display for the light theme.
   * Defaults to a pre-defined SunIcon.
   */
  lightIcon?: React.ComponentType<IconProps>;
  /**
   * Custom icon component to display for the dark theme.
   * Defaults to a pre-defined MoonIcon.
   */
  darkIcon?: React.ComponentType<IconProps>;
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
};

/**
 * ThemeToggler is a component that allows users to switch between light/dark modes
 * and select different theme families (e.g., Aura, Nova).
 * It updates the `data-theme` attribute on the root HTML element based on the selections.
 * This component must be used within an AuraTheme provider context.
 */
export const ThemeToggler: React.FC<ThemeTogglerProps> = (props) => {
  const {
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
    availableThemes = defaultAvailableThemes,
    defaultThemeName = 'aura',
    themeSelectorAriaLabel = 'Select theme',
  } = props;

  const { themeMode, toggleTheme: toggleAuraThemeMode } = useThemeController();
  const [selectedThemeName, setSelectedThemeName] = useState<string>(defaultThemeName);

  useEffect(() => {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.dataset.theme = `${selectedThemeName}-${themeMode}`;
    }
  }, [selectedThemeName, themeMode]);

  const handleThemeNameChange = useCallback((newThemeName: string) => {
    setSelectedThemeName(newThemeName);
  }, []);

  const isLightMode = themeMode === 'light';
  const currentModeToggleAriaLabel = isLightMode ? ariaLabelLight : ariaLabelDark;

  const selectListOptions: SelectListItemType[] = availableThemes.map(themeDef => ({
    value: themeDef.value,
    label: themeDef.label,
    disabled: themeDef.disabled,
  }));

  return (
    <div className={classNames(styles.themeTogglerContainer, className)} style={style}>
      <button
        type="button"
        className={classNames(styles.modeToggler, modeTogglerClassName)}
        style={modeTogglerStyle}
        onClick={toggleAuraThemeMode}
        aria-label={currentModeToggleAriaLabel}
        title={currentModeToggleAriaLabel}
      >
        <LightIconComponent
          className={classNames(
            styles.modeTogglerIcon,
            isLightMode ? styles.lightIconActive : styles.lightIconInactive
          )}
          aria-hidden="true"
        />
        <DarkIconComponent
          className={classNames(
            styles.modeTogglerIcon,
            !isLightMode ? styles.darkIconActive : styles.darkIconInactive
          )}
          aria-hidden="true"
        />
      </button>
      <SelectList
        options={selectListOptions}
        value={selectedThemeName}
        onChange={handleThemeNameChange}
        ariaLabel={themeSelectorAriaLabel}
        className={classNames(styles.themeSelector, themeSelectorClassName)}
        style={themeSelectorStyle}
        placeholder="Select a Theme..."
      />
    </div>
  );
};