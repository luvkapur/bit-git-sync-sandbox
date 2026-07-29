import React from 'react';
import classNames from 'classnames';
import styles from './image.module.scss';

// Default values for image source and alt text
const DEFAULT_IMAGE_SRC = `https://images.unsplash.com/photo-1646394828039-0802101e1053?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGJsdWUlMjBnZW9tZXRyaWN8ZW58MXwwfHxibHVlfDE3NDk3NzYzNzR8MA&ixlib=rb-4.1.0`;
const DEFAULT_ALT_TEXT = `Abstract blue geometric background`;

/**
 * Props for the Image component.
 * Defines the properties accepted by the Image component.
 */
export type ImageProps = {
  /**
   * The source URL of the image.
   * @default "https://images.unsplash.com/photo-1646394828039-0802101e1053?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGJsdWUlMjBnZW9tZXRyaWN8ZW58MXwwfHxibHVlfDE3NDk3NzYzNzR8MA&ixlib=rb-4.1.0"
   */
  src?: string;
  /**
   * The alternative text for the image, crucial for accessibility.
   * @default "Abstract blue geometric background"
   */
  alt?: string;
  /**
   * The width of the image. Can be a number (in pixels) or a string (e.g., '100%').
   * If undefined, the browser will determine the width based on the image's intrinsic size or CSS.
   */
  width?: string | number;
  /**
   * The height of the image. Can be a number (in pixels) or a string (e.g., 'auto').
   * If undefined, the browser will determine the height based on the image's intrinsic size or CSS.
   */
  height?: string | number;
  /**
   * Specifies how the content of the image should be resized to fit its container.
   * - 'fill': Stretches the image to fill the container, ignoring aspect ratio.
   * - 'contain': Scales the image to fit within the container while maintaining aspect ratio.
   * - 'cover': Scales the image to maintain aspect ratio while filling the container, cropping if necessary.
   * - 'none': Displays the image at its original size.
   * - 'scale-down': Displays the image as if 'none' or 'contain' was specified, whichever results in a smaller concrete object size.
   * @default "cover"
   */
  objectFit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
  /**
   * Specifies whether a browser should load an image immediately ('eager') or
   * defer loading of off-screen images until the user scrolls near them ('lazy').
   * @default "lazy"
   */
  loading?: 'eager' | 'lazy';
  /**
   * Additional CSS class name(s) to apply to the image component.
   * Useful for custom styling.
   */
  className?: string;
  /**
   * Inline CSS styles to apply to the image component.
   * Allows for fine-grained style control, but using theme variables via SCSS is preferred for consistency.
   */
  style?: React.CSSProperties;
};

/**
 * Image component to display images responsively and with visual appeal.
 * It supports standard image attributes and styling options, integrating with Nebula theme tokens
 * for border radius, shadows, and background color.
 */
export const Image = ({
  src = DEFAULT_IMAGE_SRC,
  alt = DEFAULT_ALT_TEXT,
  width,
  height,
  objectFit = 'cover',
  loading = 'lazy',
  className,
  style,
}: ImageProps): React.JSX.Element => {
  const imageStyles: React.CSSProperties = {
    ...style, // Allows consumer to pass additional styles or override
    objectFit, // Controlled by prop
  };

  // Apply width and height if provided, converting numbers to pixel strings
  if (width !== undefined) {
    imageStyles.width = typeof width === 'number' ? `${width}px` : width;
  }
  if (height !== undefined) {
    imageStyles.height = typeof height === 'number' ? `${height}px` : height;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={classNames(styles.image, className)}
      style={imageStyles}
      loading={loading}
    />
  );
};