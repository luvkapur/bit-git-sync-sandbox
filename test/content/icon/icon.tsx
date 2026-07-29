import type React from 'react';
import classNames from 'classnames';
import type { IconProps as CommonIconProps } from './icon-props-type.js';
import styles from './icon.module.scss';

/**
 * Props for the generic Icon component.
 * It extends the common IconProps (for size, className, color, onClick, title)
 * and adds SVG-specific properties like children (for SVG paths) and viewBox,
 * as well as other standard SVG attributes.
 */
export type GenericIconProps = CommonIconProps &
  Omit<React.SVGProps<SVGSVGElement>, keyof CommonIconProps | 'children'> & {
  /**
   * The SVG content (e.g., <path>, <circle>) that defines the icon's shape.
   * This is a required prop.
   */
  children: React.ReactNode;

  /**
   * The viewBox attribute for the SVG element.
   * Defines the position and dimension, in user space, of an SVG viewport.
   * @default '0 0 24 24'
   */
  viewBox?: string;
};

/**
 * A generic base component for rendering SVG icons.
 * It provides a consistent way to handle size, color, viewBox, and accessibility for icons.
 *
 * To use it, pass SVG path data or other SVG elements as children.
 * The `color` prop defaults to `currentColor` for the `fill` attribute.
 *
 * @example
 * <Icon size={32} color="blue" viewBox="0 0 24 24" title="Example Icon">
 *   <path d="M12 2 L2 22 L22 22 Z" />
 * </Icon>
 */
export function Icon({
  children,
  size = 24,
  color, // from CommonIconProps
  viewBox = '0 0 24 24',
  className,
  onClick,
  title,
  fill: fillFromRest, // from ...rest, aliased for clarity
  ...rest
}: GenericIconProps): React.JSX.Element {
  const iconSize = typeof size === 'number' ? `${size}px` : size;

  // Determine effective fill:
  // 1. Use fillFromRest if explicitly provided.
  // 2. Else, use 'color' prop if provided.
  // 3. Else, default to 'currentColor'.
  const effectiveFill =
    fillFromRest !== undefined
      ? fillFromRest
      : color !== undefined
      ? color
      : 'currentColor';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={iconSize}
      height={iconSize}
      viewBox={viewBox}
      fill={effectiveFill}
      className={classNames(
        styles.icon,
        { [styles.clickable]: !!onClick },
        className
      )}
      onClick={onClick}
      role={title || onClick ? 'img' : undefined} // Role 'img' if it has a title or is interactive
      aria-label={title ? title : undefined}
      aria-hidden={!title && !onClick ? true : undefined} // Decorative if no title and not clickable
      focusable={onClick ? true : false} // Make focusable only if clickable
      tabIndex={onClick ? 0 : undefined} // Ensure it can be tabbed to if clickable
      {...rest}
    >
      {children}
    </svg>
  );
}