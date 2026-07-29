import { DeepPartial } from '@bitdesign/sparks.sparks-theme';
import { AuraThemeSchema } from "./aura-tokens.js";

/**
 * Overrides for the Aura dark theme.
 * These tokens modify the default (light) theme tokens for dark mode.
 * Values are derived from the Cloudscape "visual-refresh" dark mode token set.
 */
export const darkThemeSchema: DeepPartial<AuraThemeSchema> = {
  colors: {
    primary: {
      default: '#42b4ff', // from color-text-accent
      hover: '#75cfff',   // from color-text-link-hover
      active: '#75cfff',  // from color-background-button-primary-hover (similar to hover)
    },
    surface: {
      background: '#161d26', // from color-background-container-content
      primary: '#161d26',    // from color-background-container-content
      secondary: '#1b232d',  // from color-background-cell-shaded
    },
    text: {
      primary: '#c6c6cd',    // from color-text-body-default
      secondary: '#a4a4ad',  // from color-text-form-secondary (or similar)
      inverse: '#0f141a',    // from color-text-button-primary-default
      interactiveDefault: '#42b4ff', // from color-text-link-default
      statusSuccess: '#2bb534',   // from color-text-status-success
      statusError: '#ff7a7a', // from color-text-status-error
      statusWarning: '#fbd332', // from color-text-status-warning
      statusInfo: '#42b4ff', // from color-text-status-info
    },
    status: {
      positive: { default: '#2bb534', subtle: '#001401' }, // from color-text-status-success and color-background-status-success
      negative: { default: '#ff7a7a', subtle: '#1f0000' }, // from color-text-status-error and color-background-status-error
      warning: { default: '#fbd332', subtle: '#191100' }, // from color-text-status-warning and color-background-status-warning
      info: { default: '#42b4ff', subtle: '#001129' },    // from color-text-status-info and color-background-status-info
    },
    border: {
      default: '#424650',       // from color-border-divider-default
      inputFocused: '#42b4ff', // from color-border-input-focused
    },
    overlay: 'rgba(0, 0, 0, 0.7)',

    charts: { // Example subset for dark theme
      red300: '#d63f38',
      red500: '#fe6e73',
      orange300: '#c55305',
      orange500: '#f27c36',
      yellow500: '#c59600',
      green500: '#69ae34',
      teal500: '#00b09b',
      blue1500: '#08aad2',
      blue2500: '#7698fe',
      purple500: '#b088f5',
      pink500: '#e07f9d',
      statusCritical: '#d63f38',
      lineGrid: '#424650',
    },
  },
  borders: {
    default: {
      color: '#424650', // from color-border-divider-default
    },
    focus: {
      color: '#42b4ff', // from color-border-input-focused
    },
  },
  // Typography, Spacing, Layout, most of Interactions usually remain consistent
  effects: {
    shadows: {
      xs: '0px 1px 2px rgba(0, 0, 0, 0.3)',
      small: '0px 2px 4px rgba(0, 0, 0, 0.35)',
      medium: '0px 1px 1px 1px #192534, 0px 6px 36px #00040c', // from shadow-container-active.dark
      large: '0px 8px 16px rgba(0, 0, 0, 0.45)',
      xLarge: '0px 12px 24px rgba(0, 0, 0, 0.5)',
      inset: 'inset 0px 1px 2px rgba(0, 0, 0, 0.35)',
      raised: '0px 4px 12px rgba(0, 0, 0, 0.4), 0px 2px 4px rgba(0, 0, 0, 0.35)',
    },
    gradients: {
      primary: 'linear-gradient(to right, #42b4ff, #75cfff)',
      secondary: 'linear-gradient(to bottom, #1b232d, #131920)',
      radial: 'radial-gradient(circle, #42b4ff, #1f89e5)',
    },
  },
  interactions: {
    hoverEffect: {
        shadow: '0px 6px 12px rgba(0, 0, 0, 0.4)', // Adjusted shadow for dark theme
    },
  }
};