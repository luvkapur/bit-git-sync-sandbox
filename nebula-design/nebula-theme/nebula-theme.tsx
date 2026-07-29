import React, { useMemo } from 'react';
import classNames from 'classnames';
import { AuraTheme } from '@luvktest/test.aura-theme';
import type { AuraThemeOverrides, ThemeMode } from '@luvktest/test.aura-theme';
import styles from './nebula-theme.module.scss';

/**
 * Props for the NebulaTheme component.
 * Allows specifying children, custom class names, inline styles,
 * token overrides, and the initial theme mode for the underlying Aura theme.
 */
export interface NebulaThemeProps {
  /**
   * The content to be themed.
   */
  children?: React.ReactNode;
  /**
   * Custom CSS class name to apply to the root element of NebulaTheme.
   */
  className?: string;
  /**
   * Custom inline styles to apply to the root element of NebulaTheme.
   */
  style?: React.CSSProperties;
  /**
   * Token overrides that will be deeply merged with Nebula's default tokens.
   * These conform to the `AuraThemeOverrides` structure.
   */
  overrides?: AuraThemeOverrides;
  /**
   * The initial theme mode ('light' or 'dark') for the underlying AuraTheme.
   * Nebula defaults this to 'dark'.
   */
  initialTheme?: ThemeMode;
}

/**
 * Nebula's default token set.
 * This defines the core visual identity of Nebula, building upon Aura's structure.
 * It incorporates the specific overrides requested by the user prompt.
 */
const defaultNebulaTokens: AuraThemeOverrides = {
  colors: {
    primary: { default: '#C48CFF', hover: '#A060FF', active: '#7C30FF' },
    surface: {
      background: '#1A1A24',
      primary: '#22212C',
      secondary: '#302F3D',
    },
    text: {
      primary: '#EAEAF2',
      secondary: '#C0C0CF',
      inverse: '#1A1A24',
      statusInfo: '#66B2FF', // Mapped from 'info' and using 'statusInfo' key
    },
    status: {
      negative: { default: '#FF6B6B', subtle: '#5E2E2E' }, // Mapped from 'error'
      positive: { default: '#22D3EE', subtle: '#1A5259' }, // Mapped from 'success'
      warning: { default: '#FFD166', subtle: '#5E502E' },
      info: { default: '#66B2FF', subtle: '#2E4D5E' }, // General info status
    },
    border: {
      default: '#22212C',
      // Removed 'subtle' and 'interactive' as they are not in the AuraThemeOverrides.colors.border schema
    },
    overlay: 'rgba(10, 10, 20, 0.75)',
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
  },
  borders: {
    radius: {
      small: '4px',
      medium: '6px',
      large: '12px',
      container: '8px',
      circle: '50%',
    },
    default: {
      width: '1px',
      style: 'solid',
    },
    // Removed 'focus' object as it's not in AuraThemeOverrides.borders schema
  },
  spacing: {
    // Mapped to allowed keys from AuraThemeOverrides
    x4: '4px', // Was 'xs'
    small: '8px', // Was 's'
    default: '16px', // Was 'm'
    large: '24px', // Was 'l'
    xl: '32px', // Was 'xl'
    x8: '48px', // Was 'xxl'
  },
  interactions: {
    cursor: {
      // Removed 'default' as it's not in AuraThemeOverrides.interactions.cursor schema
      pointer: 'pointer',
      disabled: 'not-allowed',
    },
  },
};

/**
 * A helper function to deeply merge two objects.
 * Used to combine Nebula's default tokens with runtime overrides.
 */
const mergeDeep = (target: any, source: any): AuraThemeOverrides => {
  const output = { ...target };
  if (
    target &&
    typeof target === 'object' &&
    source &&
    typeof source === 'object'
  ) {
    Object.keys(source).forEach((key) => {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        target[key] &&
        typeof target[key] === 'object'
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        output[key] = mergeDeep(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    });
  }
  return output as AuraThemeOverrides;
};

/**
 * NebulaTheme is a React component that provides a specific "Nebula" visual identity
 * by configuring and extending the `@luvktest/test.aura-theme`.
 * It defaults to Aura's dark mode and applies a distinct set of token overrides.
 */
export const NebulaTheme: React.FC<NebulaThemeProps> = ({
  children,
  className,
  style,
  overrides,
  initialTheme = 'dark',
  ...rest
}) => {
  const finalTokens: AuraThemeOverrides = useMemo(() => {
    return mergeDeep(defaultNebulaTokens, overrides || {});
  }, [overrides]);

  const themeRootClassName = classNames(styles.nebulaThemeRoot, className);

  return (
    <div className={themeRootClassName} style={style} {...rest}>
      <AuraTheme initialTheme={initialTheme} overrides={finalTokens}>
        {children}
      </AuraTheme>
    </div>
  );
};
