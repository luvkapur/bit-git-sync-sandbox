import React from 'react';
import classNames from 'classnames';
import type { AvatarStatusType } from './avatar-status-type.js';
import styles from './avatar.module.scss';

/**
 * Props for the Avatar component.
 */
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

const getInitials = (name?: string): string => {
  if (!name || name.trim() === '') return '';
  const words = name.trim().split(' ').filter(word => word.length > 0);
  if (words.length === 0) return '';
  if (words.length === 1) {
    return words[0][0].toUpperCase();
  }
  const firstInitial = words[0][0];
  const lastInitial = words[words.length - 1][0];
  return `${firstInitial}${lastInitial}`.toUpperCase();
};

/**
 * Avatar component to display user profile pictures or initials with optional status indicators.
 * It adapts to the Nebula theme through CSS variables.
 */
export const Avatar: React.FC<AvatarProps> = ({
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
}) => {
  const [imageError, setImageError] = React.useState(false);
  const initials = getInitials(name);

  const handleImageError = () => {
    setImageError(true);
  };

  React.useEffect(() => {
    if (src) { // Only reset if src is provided
      setImageError(false);
    }
  }, [src]);

  const showImage = src && !imageError;
  const showInitials = !showImage && initials;
  // Fallback to a generic placeholder if no image and no initials
  const showPlaceholder = !showImage && !initials;


  return (
    <div
      className={classNames(
        styles.avatarContainer,
        styles[size],
        styles[shape],
        { [styles.clickable]: !!onClick },
        className
      )}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={alt || name || 'Avatar'}
      data-testid="avatar-container"
    >
      {showImage ? (
        <img src={src} alt={alt} className={styles.image} onError={handleImageError} data-testid="avatar-image"/>
      ) : showInitials ? (
        <div className={styles.initials} aria-hidden="true" data-testid="avatar-initials">
          {initials}
        </div>
      ) : showPlaceholder ? (
        <div className={styles.initials} aria-hidden="true" data-testid="avatar-placeholder">
          {/* Unicode character for a generic user icon as a simple placeholder */}
          👤
        </div>
      ): null}
      {status && (
        <div
          className={classNames(styles.statusIndicator, styles[status], styles[statusPosition])}
          aria-label={`Status: ${status}`}
          data-testid="avatar-status"
        />
      )}
    </div>
  );
};