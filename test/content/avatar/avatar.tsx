import React from 'react';
import classNames from 'classnames';
import styles from './avatar.module.scss';
import type { AvatarStatusType } from './avatar-status-type.js';

export type AvatarProps = {
  /**
   * Source URL for the avatar image.
   * If not provided, initials will be displayed based on the `name` prop.
   * Defaults to a placeholder image if neither src nor name is provided.
   */
  src?: string;

  /**
   * Alternative text for the avatar image.
   * @default 'User avatar'
   */
  alt?: string;

  /**
   * Name of the user. Used to generate initials if `src` is not provided or fails to load.
   * Initials will be the first letter of the first word and the first letter of the last word (if more than one word).
   */
  name?: string;

  /**
   * Size of the avatar.
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large' | 'xlarge';

  /**
   * Shape of the avatar.
   * @default 'circle'
   */
  shape?: 'circle' | 'square' | 'rounded';

  /**
   * Status of the user. Displays a status indicator if provided.
   */
  status?: AvatarStatusType;

  /**
   * Position of the status indicator.
   * @default 'bottom-right'
   */
  statusPosition?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';

  /**
   * Custom CSS class name for the avatar container.
   */
  className?: string;

  /**
   * Custom inline styles for the avatar container.
   */
  style?: React.CSSProperties;

  /**
   * Optional click handler for the avatar.
   * If provided, the avatar will be interactive.
   */
  onClick?: () => void;
};

const DEFAULT_IMAGE_URL = `https://images.unsplash.com/photo-1628157588553-5eeea00af15c?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwyfHxwb3J0cmFpdHxlbnwxfDJ8fGJsdWV8MTc0OTczNTY0NHww&ixlib=rb-4.1.0`;

/**
 * Generates initials from a name string.
 * @param name The name string.
 * @returns A string with up to two initials, or an empty string if no name.
 */
const getInitials = (name?: string): string => {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return '';
  }
  const nameParts = name.trim().split(' ').filter(part => part.length > 0);
  if (nameParts.length === 0) {
    return '';
  }
  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }
  return (
    nameParts[0].charAt(0) +
    nameParts[nameParts.length - 1].charAt(0)
  ).toUpperCase();
};

export function Avatar({
  src,
  alt = 'User avatar',
  name,
  size = 'medium',
  shape = 'circle',
  status,
  statusPosition = 'bottom-right',
  className,
  style,
  onClick,
}: AvatarProps): React.JSX.Element {
  const [primaryImageError, setPrimaryImageError] = React.useState(false);
  const [defaultImageError, setDefaultImageError] = React.useState(false);
  const initials = getInitials(name);

  React.useEffect(() => {
    setPrimaryImageError(false);
    setDefaultImageError(false);
  }, [src]);

  const handlePrimaryImageError = () => {
    setPrimaryImageError(true);
  };

  const handleDefaultImageError = () => {
    setDefaultImageError(true);
  };

  const finalAlt = name && alt && !alt.includes(name) ? `${alt} for ${name}` : alt;
  const ariaLabel = onClick ? finalAlt : (name ? `Avatar for ${name}` : 'User avatar');

  let content: React.JSX.Element;

  if (src && !primaryImageError) {
    content = <img src={src} alt={finalAlt} className={styles.image} onError={handlePrimaryImageError} />;
  } else if (initials) {
    content = <span className={styles.initials} aria-hidden="true">{initials}</span>;
  } else if (!defaultImageError) {
    content = <img src={DEFAULT_IMAGE_URL} alt={finalAlt} className={styles.image} onError={handleDefaultImageError} />;
  } else {
    content = <span className={styles.initials} aria-hidden="true"></span>; // Empty placeholder
  }

  const containerClasses = classNames(
    styles.avatarContainer,
    styles[size],
    styles[shape],
    { [styles.clickable]: !!onClick },
    className
  );

  const statusIndicatorClasses = classNames(
    styles.statusIndicator,
    status && styles[status],
    styles[statusPosition]
  );

  return (
    <div
      className={containerClasses}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      aria-label={ariaLabel}
    >
      {content}
      {status && <span className={statusIndicatorClasses} aria-label={`Status: ${status}`} />}
    </div>
  );
}