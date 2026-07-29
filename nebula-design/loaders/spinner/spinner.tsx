import React from 'react';
import styles from './spinner.module.scss';

/**
 * Props for the Spinner component.
 * Defines the configurable options for the spinner's appearance and behavior.
 */
export type SpinnerProps = {
  /**
   * The size of the spinner's diameter in pixels.
   * This value determines both the width and height of the spinner.
   * @default 24
   */
  size?: number;
  /**
   * The thickness of the spinner's circular border in pixels.
   * @default 3
   */
  thickness?: number;
  /**
   * The color of the active, spinning part of the spinner.
   * Accepts any valid CSS color string (e.g., 'red', '#FF0000', 'rgb(255,0,0)').
   * If not provided, it defaults to the theme's primary color (`--colors-primary-default`) defined in CSS.
   */
  color?: string;
  /**
   * The color of the spinner's track, which is the static, underlying circle.
   * Accepts any valid CSS color string.
   * If not provided, it defaults to the theme's default border color (`--colors-border-default`) defined in CSS.
   */
  trackColor?: string;
  /**
   * An optional CSS class name to apply to the root spinner element.
   * This allows for further customization or layout adjustments via external CSS.
   */
  className?: string;
  /**
   * An optional style object to apply inline styles directly to the root spinner element.
   * Primarily used here to pass dynamic size, thickness, and color values as CSS custom properties.
   * Use with caution for other styling needs; prefer `className` for broader customizations.
   */
  style?: React.CSSProperties;
};

/**
 * A Spinner component used to indicate loading or processing states.
 * It renders as a circular indicator with a portion of its border highlighted and rotating.
 * The spinner's appearance (size, thickness, colors) is customizable through props
 * and integrates with a theming system via CSS custom properties.
 */
export const Spinner: React.FC<SpinnerProps> = ({
  size = 24,
  thickness = 3,
  color,
  trackColor,
  className,
  style,
}) => {
  const spinnerColor = color || 'var(--colors-primary-default, currentColor)';
  const spinnerTrackColor = trackColor || 'var(--colors-border-default, transparent)';

  const combinedClassName = [styles.spinner, className].filter(Boolean).join(' ');

  const spinnerInlineStyle = {
    '--spinner-size': `${size}px`,
    '--spinner-thickness': `${thickness}px`,
    '--spinner-color': spinnerColor,
    '--spinner-track-color': spinnerTrackColor,
    ...style, // User-provided style comes last to allow overrides of custom props if needed
  } as React.CSSProperties; // Cast to React.CSSProperties to allow CSS custom properties

  const defaultAriaLabel = 'Loading';

  return (
    <div
      className={combinedClassName}
      style={spinnerInlineStyle}
      role="status"
      aria-live="polite"
      aria-label={defaultAriaLabel}
    >
      <span className={styles.visuallyHidden}>{defaultAriaLabel}</span>
    </div>
  );
};