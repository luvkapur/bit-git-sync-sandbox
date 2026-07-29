import React, { ComponentType, CSSProperties } from 'react';
import classNames from 'classnames';
import styles from './badge.module.scss';

/**
 * Defines the possible visual variants for the Badge.
 * 'solid': Badge with a solid background color.
 * 'outline': Badge with a transparent background and a colored border.
 * 'ghost': Badge with a transparent background and colored text, no border.
 */
export type BadgeVariant = 'solid' | 'outline' | 'ghost';

/**
 * Defines the possible sizes for the Badge.
 * Affects padding and font size.
 */
export type BadgeSize = 'small' | 'medium' | 'large';

/**
 * Defines the possible color schemes for the Badge.
 * Can be a predefined theme color name or a custom CSS color string (e.g., hex code).
 */
export type BadgeColor =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | string;

/**
 * Props for the Badge component.
 */
export type BadgeProps = {
  /**
   * The text content to be displayed inside the badge.
   */
  label: string;

  /**
   * Optional CSS class name to apply to the badge's root element.
   */
  className?: string;

  /**
   * Optional inline styles to apply to the badge's root element.
   * Primarily used for custom color scenarios; prefer SCSS modules for general styling.
   */
  style?: CSSProperties;

  /**
   * The visual style of the badge.
   * @default 'solid'
   */
  variant?: BadgeVariant;

  /**
   * The size of the badge, affecting padding and font size.
   * @default 'medium'
   */
  size?: BadgeSize;

  /**
   * An optional icon component to display before the label.
   * The icon should be a React ComponentType that accepts a `className` prop.
   */
  icon?: ComponentType<{ className?: string }>;

  /**
   * The color scheme of the badge.
   * Can be a predefined theme color or a custom CSS color string.
   * If a custom string (e.g., hex code) is provided:
   * - For 'solid' variant, it sets the background color. Text color defaults to a contrast color (e.g., `var(--colors-text-inverse)`).
   * - For 'outline' variant, it sets the border and text color.
   * - For 'ghost' variant, it sets the text color.
   * @default 'primary'
   */
  color?: BadgeColor;
};

/**
 * A versatile and visually distinct badge component for displaying statuses, labels, or categories.
 * It supports different variants, sizes, colors, and an optional icon.
 */
export function Badge({
  label,
  className,
  style,
  variant = 'solid',
  size = 'medium',
  icon: IconComponent,
  color = 'primary',
}: BadgeProps): React.JSX.Element {
  const predefinedColors: ReadonlyArray<string> = [
    'primary',
    'secondary',
    'success',
    'warning',
    'danger',
    'info',
  ];
  const isCustomColor = color && !predefinedColors.includes(color);

  const badgeDynamicStyle: CSSProperties = { ...style };

  if (isCustomColor && color) {
    if (variant === 'solid') {
      badgeDynamicStyle.backgroundColor = color;
      // Apply default contrasting text color for custom solid backgrounds,
      // unless already specified in the `style` prop by the user.
      if (!style?.color) {
        badgeDynamicStyle.color = 'var(--colors-text-inverse)';
      }
    } else if (variant === 'outline') {
      badgeDynamicStyle.borderColor = color;
      badgeDynamicStyle.color = color;
    } else if (variant === 'ghost') {
      badgeDynamicStyle.color = color;
    }
  }

  const variantClassName = styles[`${variant}Variant`];
  const sizeClassName = styles[`${size}Size`];
  const colorClassName =
    !isCustomColor && color && predefinedColors.includes(color)
      ? styles[`${color}Color`]
      : undefined;

  return (
    <span
      className={classNames(
        styles.badge,
        variantClassName,
        sizeClassName,
        colorClassName,
        className
      )}
      style={badgeDynamicStyle}
      data-variant={variant}
      data-size={size}
      data-color={isCustomColor ? 'custom' : color}
    >
      {IconComponent && <IconComponent className={styles.badgeIcon} />}
      <span className={styles.badgeLabel}>{label}</span>
    </span>
  );
}