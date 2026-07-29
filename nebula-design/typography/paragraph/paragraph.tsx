import React from 'react';
import classNames from 'classnames';
import { Paragraph as BaseParagraph, ParagraphProps as BaseParagraphProps } from '@luvktest/test.typography.paragraph';
import styles from './paragraph.module.scss';

/**
 * Defines the possible HTML elements that the Paragraph component can render as.
 * This allows for semantic correctness while maintaining consistent styling.
 */
export type ParagraphElement = BaseParagraphProps['element'];

/**
 * Props for the Paragraph component.
 */
export type ParagraphProps = {
  /**
   * The HTML element to render as the paragraph.
   * For example, 'p', 'span', 'div', 'blockquote', 'label', 'figcaption'.
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
 * Paragraph component for rendering text content, styled with Nebula theme tokens.
 * It wraps a base typography paragraph component and applies Nebula-specific styling
 * for consistent typography and visual appearance within the Nebula design system.
 */
export function Paragraph({
  element = 'p',
  children,
  className,
  style,
}: ParagraphProps): React.JSX.Element {
  return (
    <BaseParagraph
      element={element}
      className={classNames(styles.paragraph, className)}
      style={style}
    >
      {children}
    </BaseParagraph>
  );
}