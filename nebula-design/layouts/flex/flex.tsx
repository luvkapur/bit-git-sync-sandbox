import React from 'react';
import classNames from 'classnames';
import type * as CSS from 'csstype';
import styles from './flex.module.scss';

/**
 * Defines the style properties for the Flex component.
 * These properties correspond to CSS flexbox and related layout properties.
 * Values for these props can be direct CSS values or CSS variables from a theme (e.g., `var(--spacing-m)` for `gap`).
 */
export type FlexStyleProps = {
  /**
   * Defines the direction of the main axis.
   * @example 'row', 'column', 'row-reverse', 'column-reverse'
   */
  flexDirection?: CSS.Property.FlexDirection;
  /**
   * Defines how the browser distributes space between and around content items along the main-axis.
   * @example 'flex-start', 'flex-end', 'center', 'space-between', 'space-around'
   */
  justifyContent?: CSS.Property.JustifyContent;
  /**
   * Defines the default behavior for how flex items are laid out along the cross axis on the current line.
   * @example 'flex-start', 'flex-end', 'center', 'stretch', 'baseline'
   */
  alignItems?: CSS.Property.AlignItems;
  /**
   * Sets the alignment of flex lines when there is extra space in the cross-axis.
   * @example 'flex-start', 'flex-end', 'center', 'stretch', 'space-between', 'space-around'
   */
  alignContent?: CSS.Property.AlignContent;
  /**
   * Sets whether flex items are forced onto one line or can wrap onto multiple lines.
   * @example 'nowrap', 'wrap', 'wrap-reverse'
   */
  flexWrap?: CSS.Property.FlexWrap;
  /**
   * Defines the gap between flex items. Shorthand for rowGap and columnGap.
   * Can be a theme variable like `var(--spacing-m)`.
   */
  gap?: CSS.Property.Gap<string | number>;
  /**
   * Defines the gap between rows.
   * Can be a theme variable like `var(--spacing-s)`.
   */
  rowGap?: CSS.Property.RowGap<string | number>;
  /**
   * Defines the gap between columns.
   * Can be a theme variable like `var(--spacing-s)`.
   */
  columnGap?: CSS.Property.ColumnGap<string | number>;
  /**
   * Defines the ability of a flex item to grow if necessary.
   */
  flexGrow?: CSS.Property.FlexGrow;
  /**
   * Defines the ability of a flex item to shrink if necessary.
   */
  flexShrink?: CSS.Property.FlexShrink;
  /**
   * Defines the default size of an element before the remaining space is distributed.
   * Can be a string (e.g., '50%', '100px') or a number (interpreted as unitless or pixels depending on context).
   */
  flexBasis?: CSS.Property.FlexBasis<string | number>;
  /**
   * Shorthand property for flex-grow, flex-shrink, and flex-basis.
   */
  flex?: CSS.Property.Flex<string | number>;
  /**
   * Allows the default alignment (or the one specified by align-items) to be overridden for individual flex items.
   */
  alignSelf?: CSS.Property.AlignSelf;
  /**
   * Sets the order of a flexible item relative to the rest of the flexible items inside the same container.
   */
  order?: CSS.Property.Order;
};

/**
 * Props for the Flex component.
 */
export type FlexProps<C extends React.ElementType = 'div'> = {
  /**
   * The content to be rendered inside the Flex container.
   */
  children?: React.ReactNode;
  /**
   * Additional CSS class names to apply to the Flex container.
   */
  className?: string;
  /**
   * Inline styles to apply to the Flex container. These will be merged with and can override styles derived from other props.
   * Nebula theme variables can be used here, e.g., `style={{ backgroundColor: 'var(--colors-surface-primary)' }}`.
   */
  style?: React.CSSProperties;
  /**
   * The HTML element to render the Flex container as. Defaults to 'div'.
   * @default 'div'
   */
  as?: C;
} & FlexStyleProps &
  Omit<
    React.ComponentPropsWithoutRef<C>,
    'style' | keyof FlexStyleProps | 'children' | 'className' | 'as'
  >;

/**
 * Flex is a layout component used for arranging elements in rows or columns.
 * It provides a flexible way to manage space distribution and alignment of items.
 * It can be styled using Nebula theme tokens passed via props like `gap` or the `style` object.
 * For example: `<Flex gap="var(--spacing-m)" style={{ padding: 'var(--spacing-l)' }}>...</Flex>`
 */
export function Flex<C extends React.ElementType = 'div'>({
  children,
  className,
  style,
  as,
  flexDirection,
  justifyContent,
  alignItems,
  alignContent,
  flexWrap,
  gap,
  rowGap,
  columnGap,
  flexGrow,
  flexShrink,
  flexBasis,
  flex,
  alignSelf,
  order,
  ...rest
}: FlexProps<C>): React.JSX.Element {
  const Component = as || 'div';

  const ownStyleFromProps: React.CSSProperties = {
    flexDirection,
    justifyContent,
    alignItems,
    alignContent,
    flexWrap,
    gap,
    rowGap,
    columnGap,
    flexGrow,
    flexShrink,
    flexBasis,
    flex,
    alignSelf,
    order,
  };
  
  const finalStyles: React.CSSProperties = { ...ownStyleFromProps, ...style };

  // React handles undefined style properties gracefully, but explicitly removing them for finalStyles
  // This ensures that only defined styles are applied.
  for (const key in finalStyles) {
    if (finalStyles[key as keyof React.CSSProperties] === undefined) {
      delete finalStyles[key as keyof React.CSSProperties];
    }
  }


  return (
    <Component
      className={classNames(styles.flex, className)}
      style={finalStyles}
      {...rest}
    >
      {children}
    </Component>
  );
}