import React from 'react';
import { Helmet } from 'react-helmet';
import classNames from 'classnames';
import { Tabs, type TabsProps } from '@luvktest/test.navigation.tabs';
import styles from './page-layout.module.scss';

export type PageLayoutProps = {
  /**
   * The title of the page, displayed in the browser tab and used by search engines.
   * This is a required prop to ensure pages are always titled.
   */
  pageTitle: string;
  /**
   * A brief description of the page's content, used by search engines.
   * Optional, but highly recommended for SEO.
   */
  pageDescription?: string;
  /**
   * The main content to be displayed within the PageLayout.
   * If `innerNavigationTitle` is provided, this content will be placed inside a Tabs component,
   * effectively making the Tabs component a container for this primary content block.
   */
  children: React.ReactNode;
  /**
   * Optional title for the main content area, which will be used as the title for the Tabs component
   * if this prop is provided. This functionally integrates the Tabs component as the "inner navigation"
   * or primary content container.
   */
  innerNavigationTitle?: string;
  /**
   * The visual variant for the Tabs component used for the inner content area.
   * This prop applies only if `innerNavigationTitle` is provided.
   * 'default' provides a standard, card-like appearance.
   * 'minimal' offers a more subtle look with a border separator.
   * @default 'default'
   */
  tabsVariant?: TabsProps['variant'];
  /**
   * Optional CSS class name to apply to the root `main` element of the page layout.
   * Allows for further customization of the page layout container.
   */
  className?: string;
  /**
   * Optional inline styles to apply to the root `main` element of the page layout.
   * Use sparingly; prefer SCSS modules for styling.
   */
  style?: React.CSSProperties;
};

/**
 * PageLayout provides a consistent and responsive structure for web pages.
 * It handles SEO metadata via Helmet (page title and description) and offers
 * a clean, modern content area.
 * Optionally, it can use the Tabs component to frame the main content if an `innerNavigationTitle`
 * is provided, fulfilling the "inner navigation" requirement by presenting content within a
 * styled and titled Tabs panel.
 */
export function PageLayout({
  pageTitle,
  pageDescription,
  children,
  innerNavigationTitle,
  tabsVariant = 'default',
  className,
  style,
}: PageLayoutProps) {
  const contentArea = innerNavigationTitle ? (
    <Tabs title={innerNavigationTitle} variant={tabsVariant} className={styles.innerNavigationTabs}>
      {children}
    </Tabs>
  ) : (
    <div className={styles.directContentContainer}>{children}</div>
  );

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        {pageDescription ? <meta name="description" content={pageDescription} /> : null}
      </Helmet>
      <main
        className={classNames(styles.pageLayoutContainer, className)}
        style={style}
      >
        <div className={styles.contentWrapper}>
          {contentArea}
        </div>
      </main>
    </>
  );
}