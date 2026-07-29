import type React from 'react';

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
   * Allows passing other standard SVG attributes (e.g., width, height, fill, stroke)
   * or custom data attributes.
   */
  [key: string]: any;
};