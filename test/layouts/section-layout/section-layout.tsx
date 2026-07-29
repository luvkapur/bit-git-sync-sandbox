import type React from 'react';
import classNames from 'classnames';
import { Heading } from '@luvktest/test.typography.heading';
import { Paragraph } from '@luvktest/test.typography.paragraph';
import styles from './section-layout.module.scss';

/**
 * Defines the props for the SectionLayout component.
 */
export type SectionLayoutProps = {
  /**
   * Optional main title for the section.
   * Displayed as a prominent heading (h2).
   */
  title?: string;
  /**
   * Optional subtitle that appears below the main title.
   * Displayed as a secondary heading (h3, visually styled as h4).
   */
  subtitle?: string;
  /**
   * Optional caption text, usually smaller, appearing below the title/subtitle.
   */
  caption?: string;
  /**
   * The main content of the section.
   */
  children: React.ReactNode;
  /**
   * Optional CSS class name to apply to the root section element.
   * Allows for custom styling and integration.
   */
  className?: string;
  /**
   * Optional inline CSS styles to apply to the root section element.
   * Use sparingly; prefer SCSS modules or the className prop for styling.
   */
  style?: React.CSSProperties;
};

/**
 * SectionLayout is a component designed to structure content on a page in a visually appealing and organized manner.
 * It provides optional slots for a title, subtitle, and caption, along with a main content area.
 * The layout is responsive and centers its header content by default.
 */
export function SectionLayout({
  title,
  subtitle,
  caption,
  children,
  className,
  style,
}: SectionLayoutProps): React.JSX.Element {
  const hasHeaderContent = title || subtitle || caption;

  return (
    <section
      className={classNames(styles.sectionLayout, className)}
      style={style}
    >
      {hasHeaderContent ? (
        <header className={styles.header}>
          {title && (
            <Heading level={2} className={styles.title}>
              {title}
            </Heading>
          )}
          {subtitle && (
            <Heading level={3} visualLevel={4} className={styles.subtitle}>
              {subtitle}
            </Heading>
          )}
          {caption && (
            <Paragraph className={styles.caption}>{caption}</Paragraph>
          )}
        </header>
      ) : null}
      <div className={styles.contentWrapper}>{children}</div>
    </section>
  );
}