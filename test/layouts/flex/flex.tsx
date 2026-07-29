import React from 'react';
import classNames from 'classnames';
import styles from './flex.module.scss';

// Define the style props separately for clarity and use in Omit
type FlexStyleProps = {
  /**
   * Sets the direction of the main axis. Defines whether items are laid out in a row or a column.
   * Corresponds to the CSS `flex-direction` property.
   */
  flexDirection?: React.CSSProperties['flexDirection'];
  /**
   * Aligns items along the main axis of the current line of the flex container.
   * Corresponds to the CSS `justify-content` property.
   */
  justifyContent?: React.CSSProperties['justifyContent'];
  /**
   * Aligns items along the cross axis of the current line of the flex container.
   * Corresponds to the CSS `align-items` property.
   */
  alignItems?: React.CSSProperties['alignItems'];
  /**
   * Aligns a flex container's lines within when there is extra space in the cross-axis, similar to how `justify-content` aligns individual items within the main-axis.
   * Note: this property has no effect when there is only one line of flex items.
   * Corresponds to the CSS `align-content` property.
   */
  alignContent?: React.CSSProperties['alignContent'];
  /**
   * Sets whether flex items are forced onto one line or can wrap onto multiple lines.
   * Corresponds to the CSS `flex-wrap` property.
   */
  flexWrap?: React.CSSProperties['flexWrap'];
  /**
   * A shorthand property for `row-gap` and `column-gap`. Specifies the size of the gutters between rows and columns.
   * Corresponds to the CSS `gap` property.
   */
  gap?: React.CSSProperties['gap'];
  /**
   * Specifies the size of the gutter between rows.
   * Corresponds to the CSS `row-gap` property.
   */
  rowGap?: React.CSSProperties['rowGap'];
  /**
   * Specifies the size of the gutter between columns.
   * Corresponds to the CSS `column-gap` property.
   */
  columnGap?: React.CSSProperties['columnGap'];
  /**
   * Sets the ability of a flex item to grow if necessary. It accepts a unitless value that serves as a proportion.
   * Corresponds to the CSS `flex-grow` property. Applied to the container if it is also a flex item.
   */
  flexGrow?: React.CSSProperties['flexGrow'];
  /**
   * Sets the ability of a flex item to shrink if necessary.
   * Corresponds to the CSS `flex-shrink` property. Applied to the container if it is also a flex item.
   */
  flexShrink?: React.CSSProperties['flexShrink'];
  /**
   * Sets the initial main size of a flex item.
   * Corresponds to the CSS `flex-basis` property. Applied to the container if it is also a flex item.
   */
  flexBasis?: React.CSSProperties['flexBasis'];
  /**
   * A shorthand property for `flex-grow`, `flex-shrink`, and `flex-basis`.
   * Corresponds to the CSS `flex` property. Applied to the container if it is also a flex item.
   */
  flex?: React.CSSProperties['flex'];
  /**
   * Allows the default alignment (or the one specified by `align-items`) to be overridden for individual flex items.
   * Corresponds to the CSS `align-self` property. Applied to the container if it is also a flex item.
   */
  alignSelf?: React.CSSProperties['alignSelf'];
  /**
   * Sets the order to lay out an item in a flex container.
   * Corresponds to the CSS `order` property. Applied to the container if it is also a flex item.
   */
  order?: React.CSSProperties['order'];
};

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
   */
  style?: React.CSSProperties;
  /**
   * The HTML element to render the Flex container as. Defaults to 'div'.
   */
  as?: C;
} & FlexStyleProps & Omit<React.ComponentPropsWithoutRef<C>, 'style' | keyof FlexStyleProps>;

/**
 * Flex is a layout component used for arranging elements in rows or columns.
 * It provides a flexible way to manage space distribution and alignment of items.
 * It accepts a `style` prop for custom style overrides.
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
}: FlexProps<C>) {
  const Component = as || 'div';

  const dynamicStyles: React.CSSProperties = {
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

  // Filter out undefined properties to keep the style object clean
  const definedDynamicStyles = Object.entries(dynamicStyles).reduce(
    (acc, [key, value]) => {
      if (value !== undefined) {
        acc[key as keyof React.CSSProperties] = value;
      }
      return acc;
    },
    {} as React.CSSProperties
  );

  const combinedStyles: React.CSSProperties = {
    ...definedDynamicStyles,
    ...style, // User-provided styles override derived ones and those from props
  };

  return (
    <Component
      className={classNames(styles.flex, className)}
      style={combinedStyles}
      {...rest}
    >
      {children}
    </Component>
  );
}