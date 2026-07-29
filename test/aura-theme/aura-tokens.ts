/**
 * Aura design tokens.
 * This object defines the default (light) theme for the Aura Design System.
 * Values are derived from the Cloudscape "visual-refresh" token set.
 */
export function auraTokens() {
  const tokens = {
    /**
     * Color Palette
     * Defines the core colors used throughout the system.
     * Based on Cloudscape visual-refresh light mode.
     */
    colors: {
      primary: {
        default: '#006ce0', // from color-text-accent
        hover: '#002b66',   // from color-text-link-hover
        active: '#002b66',  // from color-background-button-primary-active (similar to hover)
      },
      surface: {
        background: '#ffffff', // from color-background-container-content
        primary: '#ffffff',    // from color-background-container-content
        secondary: '#f6f6f9',  // from color-background-cell-shaded
      },
      text: {
        primary: '#0f141a',    // from color-text-body-default
        secondary: '#424650',  // from color-text-body-secondary
        inverse: '#ffffff',    // from color-text-button-primary-default
        interactiveDefault: '#006ce0', // from color-text-link-default (same as accent)
        statusSuccess: '#00802f',   // from color-text-status-success
        statusError: '#db0000', // from color-text-status-error
        statusWarning: '#855900', // from color-text-status-warning
        statusInfo: '#006ce0', // from color-text-status-info
      },
      status: {
        positive: { default: '#00802f', subtle: '#effff1' }, // from color-text-status-success and color-background-status-success
        negative: { default: '#db0000', subtle: '#fff5f5' }, // from color-text-status-error and color-background-status-error
        warning: { default: '#855900', subtle: '#fffef0' }, // from color-text-status-warning and color-background-status-warning
        info: { default: '#006ce0', subtle: '#f0fbff' },    // from color-text-status-info and color-background-status-info
      },
      border: {
        default: '#c6c6cd',       // from color-border-divider-default
        inputFocused: '#006ce0', // from color-border-input-focused
      },
      overlay: 'rgba(0, 0, 0, 0.5)', // Standard overlay, not directly in Cloudscape flat list.

      // Chart Colors (example subset, add all if needed)
      charts: {
        red300: '#ea7158',
        red500: '#d13313',
        orange300: '#e07941',
        orange500: '#bc4d01',
        yellow500: '#8a6b05',
        green500: '#1f8104',
        teal500: '#0d7d70',
        blue1500: '#0273bb', // color-charts-blue-1-500
        blue2500: '#4066df', // color-charts-blue-2-500
        purple500: '#8456ce',
        pink500: '#c33d69',
        statusCritical: '#7d2105',
        lineGrid: '#dedee3',
      },
    },

    borders: {
      default: {
        color: '#c6c6cd', // from color-border-divider-default
        width: '1px',     // from border-width-field (assuming general purpose)
        style: 'solid',
      },
      focus: {
        color: '#006ce0', // from color-border-input-focused
        width: '2px',     // Common focus ring width
        style: 'solid',
        offset: '2px',    // Common focus ring offset
      },
      radius: {
        small: '4px',     // from border-radius-badge
        medium: '8px',    // from border-radius-input / border-radius-dropdown
        large: '12px',    // from border-radius-alert (or container which is 16px)
        container: '16px',// from border-radius-container
        circle: '50%',
        button: '20px',   // from border-radius-button
      },
      width: { // Specific widths
        field: '1px', // border-width-field
        button: '2px', // border-width-button
        alert: '2px', // border-width-alert
      }
    },

    typography: {
      fontFamily: "'Open Sans', 'Helvetica Neue', Roboto, Arial, sans-serif", // from font-family-base
      sizes: {
        display: { large: '42px', medium: '32px', small: '24px' }, // Mapped from font-size-display-l, heading-xl, heading-l for variety
        heading: {
          h1: '24px', // font-size-heading-xl
          h2: '20px', // font-size-heading-l
          h3: '18px', // font-size-heading-m
          h4: '16px', // font-size-heading-s
          h5: '14px', // font-size-heading-xs
          h6: '14px', // font-size-heading-xs (repeated)
        },
        body: {
          large: '16px', // Using font-size-body-m for large as well
          medium: '14px',// from font-size-body-m
          default: '14px',// from font-size-body-m
          small: '12px', // from font-size-body-s
        },
        caption: { default: '12px', medium: '12px' }, // from font-size-body-s
      },
      lineHeight: {
        base: '20px',     // from line-height-body-m
        heading: '24px',  // from line-height-heading-l (representative)
        displayLarge: '48px', // from line-height-display-l
      },
      fontWeight: {
        regular: '400',   // Standard
        medium: '500',    // Standard
        semiBold: '600',  // Standard
        bold: '700',      // from font-weight-button / font-weight-heading-xl
      },
      letterSpacing: {
        tight: '-0.02em',
        normal: '0',
        wide: '0.02em',
      },
    },

    spacing: {
      // Using comfortable values from space-static-*
      default: '8px',   // space-static-xs
      small: '4px',     // space-static-xxs
      large: '16px',    // space-static-m
      xl: '24px',       // space-static-xl
      x4: '32px',       // space-static-xxl (32px)
      x8: '40px',       // space-static-xxxl (40px, approx 5 * default)
    },
    layout: {
      maxPageWidth: '1440px', // Common default
      gutter: '24px',         // from space-static-xl (comfortable)
    },

    effects: {
      shadows: {
        // Cloudscape provides shadow-container-active. We map it to medium. Others are generic.
        xs: '0px 1px 2px rgba(15, 20, 26, 0.08)', // Derived from text primary with low alpha
        small: '0px 2px 4px rgba(15, 20, 26, 0.1)',
        medium: '0px 1px 1px 1px #e9ebed, 0px 6px 36px rgba(0, 7, 22, 0.1)', // from shadow-container-active.light (simplified second part)
        large: '0px 8px 16px rgba(15, 20, 26, 0.14)',
        xLarge: '0px 12px 24px rgba(15, 20, 26, 0.16)',
        inset: 'inset 0px 1px 2px rgba(15, 20, 26, 0.1)',
        raised: '0px 4px 12px rgba(15, 20, 26, 0.12), 0px 2px 4px rgba(15, 20, 26, 0.1)',
      },
      opacity: {
        disabled: '0.5',
        hover: '0.8',
        faint: '0.2',
        semiOpaque: '0.7',
      },
      gradients: { // Derived from primary colors
        primary: 'linear-gradient(to right, #006ce0, #00529e)',
        secondary: 'linear-gradient(to bottom, #f6f6f9, #e9ebed)',
        radial: 'radial-gradient(circle, #006ce0, #004a9e)',
      },
      blur: {
        small: 'blur(4px)',
        medium: 'blur(8px)',
        large: 'blur(16px)',
      },
    },

    interactions: {
      cursor: {
        pointer: 'pointer',
        disabled: 'not-allowed',
        text: 'text',
        grab: 'grab',
        grabbing: 'grabbing',
      },
      zIndex: {
        base: '1',
        sticky: '50',
        modal: '100',
        tooltip: '200',
        overlay: '300',
      },
      transitions: {
        duration: {
          fast: '115ms',    // from motion-duration-responsive.default
          medium: '165ms',   // from motion-duration-expressive.default
          slow: '250ms',     // from motion-duration-complex.default
          verySlow: '1s',    // Template value
        },
        easing: { // Mapped from motion-easing-*
          easeInOut: 'cubic-bezier(0.84, 0, 0.16, 1)', // motion-easing-expressive.default
          easeOut: 'cubic-bezier(1, 0, 0.83, 1)',       // motion-easing-sticky.default (closer than linear)
          easeIn: 'cubic-bezier(0.4, 0, 1, 1)',         // Standard easeIn
          spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Template value
        },
        property: {
          all: 'all',
          transform: 'transform',
          opacity: 'opacity',
          color: 'color, background-color, border-color',
          shadow: 'box-shadow',
        },
      },
      hoverEffect: {
        scale: 'scale(1.03)',
        translateY: 'translateY(-2px)',
        shadow: '0px 6px 12px rgba(15, 20, 26, 0.15)', // Enhanced shadow
      },
    },
  };
  return tokens;
}

/**
 * Defines the schema type for the Aura theme based on the tokens function.
 * This ensures type safety and autocompletion when using or overriding the theme.
 */
export type AuraThemeSchema = ReturnType<typeof auraTokens>;