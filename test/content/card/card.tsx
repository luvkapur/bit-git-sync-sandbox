import React from 'react';
import classNames from 'classnames';
import styles from './card.module.scss';

export type CardProps = {
  /**
   * Content to be displayed within the card.
   */
  children?: React.ReactNode;

  /**
   * Optional title for the card, displayed below the header or image.
   */
  title?: string;

  /**
   * Specifies the visual style of the card.
   * 'default': Standard card with a subtle shadow.
   * 'elevated': Card with a more prominent shadow, appearing raised.
   * 'outlined': Card with a visible border and no shadow.
   * @default 'default'
   */
  variant?: 'default' | 'elevated' | 'outlined';

  /**
   * Optional content for the card's header section.
   * Displayed above the title and main content.
   */
  header?: React.ReactNode;

  /**
   * Optional content for the card's footer section.
   * Displayed below the main content.
   */
  footer?: React.ReactNode;

  /**
   * Optional URL for an image to be displayed at the top of the card.
   */
  image?: string;

  /**
   * Alternative text for the image, important for accessibility.
   * Recommended if an image is provided. Defaults to an empty string if image is present but alt is not.
   */
  imageAlt?: string;

  /**
   * If true, the card will have interactive styles on hover and focus.
   * @default false
   */
  interactive?: boolean;

  /**
   * Custom CSS class name to apply to the root card element.
   */
  className?: string;

  /**
   * Custom inline styles to apply to the root card element.
   * Prefer using SCSS modules and `className` for styling.
   */
  style?: React.CSSProperties;
};

/**
 * A versatile and visually engaging card component that serves as a flexible container
 * for various content types, including an optional header, footer, image, and title.
 */
export function Card({
  children,
  title,
  variant = 'default',
  header,
  footer,
  image,
  imageAlt,
  interactive = false,
  className,
  style,
}: CardProps): React.JSX.Element {
  const cardClasses = classNames(
    styles.card,
    {
      [styles.defaultVariant]: variant === 'default',
      [styles.elevatedVariant]: variant === 'elevated',
      [styles.outlinedVariant]: variant === 'outlined',
      [styles.interactiveState]: interactive,
    },
    className
  );

  const hasContent = title || children;

  return (
    <div className={cardClasses} style={style}>
      {image && (
        <div className={styles.imageContainer}>
          <img
            src={image}
            alt={imageAlt || ''}
            className={styles.imageElement}
          />
        </div>
      )}
      {header && <div className={styles.headerSection}>{header}</div>}
      {hasContent && (
        <div className={styles.contentSection}>
          {title && <h3 className={styles.titleElement}>{title}</h3>}
          {children && <div className={styles.bodySection}>{children}</div>}
        </div>
      )}
      {footer && <div className={styles.footerSection}>{footer}</div>}
    </div>
  );
}