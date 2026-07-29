import React from 'react';
import classNames from 'classnames';
import { Link } from '@luvktest/test.navigation.link';
import styles from './logo.module.scss';

export type LogoProps = {
  /**
   * URL to navigate to when the logo is clicked.
   * If not provided, the logo will not be interactive.
   */
  href?: string;

  /**
   * Source URL for the logo image.
   * If not provided, `text` will be displayed as a fallback.
   */
  imgSrc?: string;

  /**
   * Text to display if `imgSrc` is not provided, or as accessible text.
   */
  text?: string;

  /**
   * Alt text for the image, or aria-label for text logo.
   */
  altText?: string;

  /**
   * Size of the logo (width and height).
   * Can be a number (in pixels) or a string (e.g., '50px', '3rem').
   * @default 40
   */
  size?: number | string;

  /**
   * Additional CSS class name for custom styling.
   */
  className?: string;

  /**
   * Inline styles to apply to the logo.
   */
  style?: React.CSSProperties;

  /**
   * Data-testid for testing purposes.
   */
  dataTestId?: string;

  /**
   * Aria-label for the link. Defaults to "Company Logo".
   */
  ariaLabel?: string;
};

export function Logo({
  href,
  imgSrc,
  text = 'Logo', // Default text if none provided
  altText,
  size = 40, // Default size
  className,
  style,
  dataTestId = 'logo',
  ariaLabel,
}: LogoProps) {
  // Styles for the element that visually represents the logo (size, content alignment)
  const visualElementStyles: React.CSSProperties = {
    width: size,
    height: size,
    fontSize: typeof size === 'number' ? `${size}px` : size, // Ensure fontSize is a string for CSS
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style, // Allow user-provided styles to override or add
  };

  const content = imgSrc ? (
    <img
      src={imgSrc}
      alt={altText || (typeof text === 'string' && text !== 'Logo' ? text : 'Logo')}
      className={styles.logoImage} // Fills its parent (the element with visualElementStyles)
    />
  ) : (
    <span
      className={styles.logoText}
      aria-label={altText && !imgSrc ? altText : undefined}
    >
      {text}
    </span>
  );

  const effectiveAriaLabel = ariaLabel || altText || (typeof text === 'string' ? text : 'Company Logo');

  if (href) {
    return (
      <div className={classNames(styles.logoContainer, className)} data-testid={dataTestId}>
        <Link
          href={href}
          className={styles.logoLink} // Internal styling for the link itself
          aria-label={effectiveAriaLabel}
        >
          <div style={visualElementStyles}> {/* This div handles size and content centering */}
            {content}
          </div>
        </Link>
      </div>
    );
  }

  // Non-interactive version
  return (
    <div
      className={classNames(styles.logoContainer, styles.logoStatic, className)}
      style={visualElementStyles} // The container itself is the sized and centered visual element
      data-testid={dataTestId}
      role="img" // Good for semantics if it's a non-interactive image/logo
      aria-label={effectiveAriaLabel}
    >
      {content}
    </div>
  );
}