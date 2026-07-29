import React from 'react';
import classNames from 'classnames';
import styles from './icon.module.scss';

/**
 * Props for the Icon component.
 * Defines common properties for icon display and behavior,
 * and allows passthrough of other valid SVG attributes.
 */
export type IconProps = {
  /**
   * The SVG content (e.g., <path>, <circle>) that defines the icon's shape.
   * This is a required prop.
   */
  children: React.ReactNode;

  /**
   * The desired size of the icon (applied to width and height).
   * Can be a number (interpreted as pixels) or a string (e.g., '2em', '100%').
   * @default 24
   */
  size?: number | string;

  /**
   * The color for the icon. This typically maps to the SVG 'fill' attribute.
   * If not specified, icons often default to 'currentColor', allowing inheritance from parent CSS.
   * It can accept CSS theme variables like 'var(--colors-primary-default)'.
   */
  color?: string;

  /**
   * The viewBox attribute for the SVG element.
   * Defines the position and dimension, in user space, of an SVG viewport.
   * @default '0 0 24 24'
   */
  viewBox?: string;

  /**
   * An optional CSS class name to apply to the root SVG element of the icon.
   * Useful for custom styling.
   */
  className?: string;

  /**
   * An optional click event handler for the icon.
   * If provided, the icon might visually indicate interactivity (e.g., changing cursor).
   */
  onClick?: React.MouseEventHandler<SVGSVGElement>;

  /**
   * Provides an accessible name for the icon.
   * If provided, this will be used for `aria-label` on the SVG element,
   * and a <title> element will be rendered within the SVG for better accessibility.
   * If omitted, the icon may be treated as decorative (aria-hidden="true").
   */
  title?: string;
} & Omit<
  React.SVGProps<SVGSVGElement>,
  | 'children'
  | 'color'
  | 'className'
  | 'onClick'
  | 'title'
  | 'viewBox'
  | 'width' // Controlled by 'size' prop
  | 'height' // Controlled by 'size' prop
  // 'size' is not a standard SVG prop, but Omit for safety if it somehow appears in React.SVGProps
  // It is explicitly defined in IconProps.
  | 'size'
>;

/**
 * A generic base component for rendering SVG icons.
 * It provides a consistent way to handle size, color, viewBox, and accessibility for icons.
 * To use it, pass SVG path data or other SVG elements as children.
 * The `color` prop defaults to `currentColor` for the `fill` attribute,
 * making it seamlessly integrate with themed text colors or accept specific theme color variables.
 */
export function Icon({
  children,
  size = 24,
  color,
  viewBox = '0 0 24 24',
  className,
  onClick,
  title,
  ...rest
}: IconProps): React.JSX.Element {
  const iconClassName = classNames(
    styles.icon,
    {
      [styles.clickable]: !!onClick,
    },
    className
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={viewBox}
      className={iconClassName}
      onClick={onClick}
      aria-hidden={title ? undefined : 'true'}
      aria-label={title}
      focusable={onClick ? 'true' : 'false'}
      fill={color || 'currentColor'}
      {...rest}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}