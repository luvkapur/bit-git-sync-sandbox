import type React from 'react';

/**
 * Defines common properties that icon components should support for consistency.
 * Specific icon components (e.g., UserIcon, SettingsIcon, or the generic Icon component itself)
 * can implement or extend this type.
 */
export type IconProps = {
  /**
   * The desired size of the icon (applied to width and height).
   * Can be a number (interpreted as pixels) or a string (e.g., '2em', '100%').
   * Individual icons or the generic Icon component might have a default size if this is not provided.
   */
  size?: number | string;

  /**
   * An optional CSS class name to apply to the root SVG element of the icon.
   * Useful for custom styling.
   */
  className?: string;

  /**
   * The color for the icon. This typically maps to the SVG 'fill' or 'stroke' attribute.
   * If not specified, icons often default to 'currentColor', allowing inheritance from parent CSS.
   */
  color?: string;

  /**
   * An optional click event handler for the icon.
   * If provided, the icon might visually indicate interactivity (e.g., cursor change).
   */
  onClick?: React.MouseEventHandler<SVGSVGElement>;

  /**
   * Provides an accessible name for the icon.
   * If provided, this can be used for `aria-label` on the SVG element, making the icon meaningful content.
   * If omitted, the icon may be treated as decorative (e.g. aria-hidden="true").
   */
  title?: string;
};