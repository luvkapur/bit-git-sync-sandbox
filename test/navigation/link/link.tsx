import React from 'react';
import { Link as RouterLink, useLocation, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import classNames from 'classnames';
import styles from './link.module.scss';

/**
 * Properties for the Link component.
 */
export type LinkProps = {
  /**
   * The URL to navigate to.
   * For internal links, this will be a path like '/dashboard'.
   * For external links, this will be a full URL like 'https://example.com'.
   */
  href: string;
  /**
   * The content to be displayed inside the link.
   */
  children?: React.ReactNode;
  /**
   * If true, the link will be treated as an external link.
   * An external link will typically open in a new tab (`_blank`) and have `rel="noopener noreferrer"`.
   * If `href` starts with 'http://' or 'https://', it's also treated as external.
   * @default false
   */
  external?: boolean;
  /**
   * Specifies where to open the linked document (e.g., '_blank', '_self').
   * If `external` is true or `href` implies an external link, and `target` is not provided, it defaults to '_blank'.
   * Otherwise, it uses the provided value or the browser/RouterLink default.
   */
  target?: string;
  /**
   * Specifies the relationship of the target object to the link object.
   * If `external` is true or `href` implies an external link, `target` is '_blank', and `rel` is not provided, it defaults to 'noopener noreferrer'.
   */
  rel?: string;
  /**
   * Optional click handler.
   */
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  /**
   * Optional CSS class name to apply to the link.
   */
  className?: string;
};

/**
 * Link component that supports both internal (React Router) and external navigation.
 * It also re-exports common React Router hooks.
 */
export function Link({
  href,
  children,
  external = false,
  target,
  rel,
  onClick,
  className,
}: LinkProps): React.JSX.Element {
  const isExternalLink = external || href.startsWith('http://') || href.startsWith('https://');

  const commonProps = {
    className: classNames(styles.link, className),
    onClick,
  };

  if (isExternalLink) {
    const effectiveTarget = target || '_blank';
    const effectiveRel = rel || (effectiveTarget === '_blank' ? 'noopener noreferrer' : undefined);
    return (
      <a
        href={href}
        target={effectiveTarget}
        rel={effectiveRel}
        {...commonProps}
      >
        {children}
      </a>
    );
  }

  // Internal link using React Router
  return (
    <RouterLink to={href} target={target} rel={rel} {...commonProps}>
      {children}
    </RouterLink>
  );
}

// Re-export react-router-dom hooks as requested
export { useLocation, useParams, useNavigate };
/**
 * Hook to read and modify the query string in the URL for the current location.
 * This is a re-export of `useSearchParams` from `react-router-dom`.
 */
export { useSearchParams as useSearchQuery };