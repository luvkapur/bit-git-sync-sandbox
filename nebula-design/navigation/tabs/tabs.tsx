import React from 'react';
import classNames from 'classnames';
import styles from './tabs.module.scss';

/**
 * Props for the Tabs component.
 */
export type TabsProps = {
  /**
   * The content to be displayed within the tab container.
   * This can be any valid React node, allowing for flexible content composition.
   */
  children: React.ReactNode;
  /**
   * An optional title for the tab container.
   * If provided, it will be displayed above the children content.
   */
  title?: string;
  /**
   * The visual variant of the tabs.
   * 'default' provides a standard, card-like appearance with background and shadow.
   * 'minimal' offers a more subtle look, typically with a border separator.
   * @default 'default'
   */
  variant?: 'default' | 'minimal';
  /**
   * Optional CSS class name to apply to the root element of the component.
   * This allows for custom styling overrides or additions.
   */
  className?: string;
  /**
   * Optional inline styles to apply to the root element of the component.
   * Use sparingly; prefer SCSS modules for styling.
   */
  style?: React.CSSProperties;
};

/**
 * Tabs component renders a container for content, optionally with a title.
 * It supports different visual variants ('default', 'minimal') to suit various UI contexts.
 * This component is designed to be a flexible building block for tabbed interfaces or sectioned content,
 * styled according to the Nebula theme.
 */
export function Tabs({
  children,
  title,
  variant = 'default',
  className,
  style,
}: TabsProps): React.JSX.Element {
  const containerClasses = classNames(
    styles.tabsContainer,
    {
      [styles.defaultVariant]: variant === 'default',
      [styles.minimalVariant]: variant === 'minimal',
    },
    className
  );

  return (
    <div className={containerClasses} style={style}>
      {title ? <h2 className={styles.title}>{title}</h2> : null}
      <div className={styles.contentArea}>{children}</div>
    </div>
  );
}