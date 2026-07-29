import React from 'react';
import classNames from 'classnames';
import styles from './spinner.module.scss';

// Define an extended CSSProperties type to include our custom CSS properties.
// This makes the style object type-safe within this file.
interface SpinnerStyle extends React.CSSProperties {
  '--spinner-size': string;
  '--spinner-thickness': string;
  '--spinner-color'?: string; // Optional as it's conditionally added
  '--spinner-track-color'?: string; // Optional as it's conditionally added
}

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
export function Spinner({
  size = 24,
  thickness = 3,
  color,
  trackColor,
  className,
  style,
}: SpinnerProps): React.JSX.Element {
  // Prepare an object for inline styles. This is used to pass dynamic values
  // (size, thickness, custom colors) as CSS custom properties to the SCSS module.
  // The type `SpinnerStyle` ensures that our custom CSS properties are recognized.
  const spinnerDynamicStyle: SpinnerStyle = {
    '--spinner-size': `${size}px`,
    '--spinner-thickness': `${thickness}px`,
    // Conditionally add custom color properties if they are provided.
    // The SCSS module will use these or fall back to theme-defined defaults.
    ...(color && { '--spinner-color': color }),
    ...(trackColor && { '--spinner-track-color': trackColor }),
    ...style, // Spread any additional inline styles passed via the style prop.
  };

  return (
    <div
      className={classNames(styles.spinner, className)}
      style={spinnerDynamicStyle}
      role="status" // Informs assistive technologies that this element represents a status message.
                   // For a spinner, it implies a busy or loading state.
    >
      {/* Provides accessible text for screen readers, describing the spinner's purpose. */}
      <span className={styles.visuallyHidden}>Loading...</span>
    </div>
  );
}