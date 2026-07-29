import React from 'react';
import classNames from 'classnames';
import styles from './paragraph.module.scss';

/**
 * Defines the allowed HTML elements for the Paragraph component.
 */
type ParagraphElement = keyof Pick<React.JSX.IntrinsicElements, 'p' | 'span' | 'div' | 'label' | 'figcaption' | 'blockquote'>;

export type ParagraphProps = {
  /**
   * The HTML element to render as the paragraph.
   * For example, 'p', 'span', 'div'.
   * @default 'p'
   */
  element?: ParagraphElement;
  /**
   * The content to be rendered inside the paragraph.
   * Can be any valid React node.
   */
  children: React.ReactNode;
  /**
   * Optional CSS class name to apply to the root paragraph element.
   * This allows for custom styling or integration with other styling systems.
   */
  className?: string;
  /**
   * Optional inline CSS styles to apply to the root paragraph element.
   * Use sparingly; prefer SCSS modules for styling.
   */
  style?: React.CSSProperties;
};

/**
 * Paragraph component for rendering text content with consistent typography and accessibility.
 * It allows specifying the underlying HTML element for semantic correctness.
 */
export function Paragraph({
  element: Component = 'p',
  children,
  className,
  style,
}: ParagraphProps): React.JSX.Element {
  return (
    <Component className={classNames(styles.paragraph, className)} style={style}>
      {children}
    </Component>
  );
}