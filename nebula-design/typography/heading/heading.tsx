import React from 'react';
import classNames from 'classnames';
import styles from './heading.module.scss';

/**
 * Defines the props for the Heading component.
 */
export type HeadingProps = {
  /**
   * The semantic heading level (1-6) which determines the HTML tag (e.g., h1, h2).
   */
  level: 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * The content of the heading.
   */
  children: React.ReactNode;
  /**
   * Optional. The visual styling level (1-6) for the heading.
   * If not provided, it defaults to the semantic `level`.
   * This allows decoupling semantic structure from visual presentation.
   * Levels 1-3 use headline typography tokens, levels 4-6 use body typography tokens.
   */
  visualLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * Optional. Additional CSS class names to apply to the heading element.
   */
  className?: string;
  /**
   * Optional. Inline CSS styles to apply to the heading element.
   */
  style?: React.CSSProperties;
};

/**
 * Heading component for rendering semantic HTML heading elements (h1-h6)
 * with controllable visual styling. It integrates with the active theme
 * (e.g., Nebula) to use appropriate typography tokens, including font family.
 */
export const Heading = ({
  level,
  children,
  visualLevel,
  className,
  style,
}: HeadingProps): React.JSX.Element => {
  const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
  const effectiveVisualLevel = visualLevel || level;

  // Construct the style class name dynamically based on the effective visual level.
  // For example, if effectiveVisualLevel is 1, it will look for styles.h1Style.
  const visualStyleKey = `h${effectiveVisualLevel}Style` as keyof typeof styles;
  const visualStyleClass = styles[visualStyleKey];

  return (
    <Tag
      className={classNames(
        styles.baseHeading,
        visualStyleClass,
        className
      )}
      style={style}
    >
      {children}
    </Tag>
  );
};