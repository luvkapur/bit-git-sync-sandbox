import React from 'react';
import classNames from 'classnames';
import styles from './image.module.scss';

const DEFAULT_IMAGE_SRC = `https://images.unsplash.com/photo-1646394828039-0802101e1053?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGJsdWUlMjBnZW9tZXRyaWN8ZW58MXwwfHxibHVlfDE3NDk3NzYzNzR8MA&ixlib=rb-4.1.0`;
const DEFAULT_ALT_TEXT = `Abstract blue geometric background`;

export type ImageProps = {
  /**
   * The source URL of the image.
   * @default "https://images.unsplash.com/photo-1646394828039-0802101e1053?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGJsdWUlMjBnZW9tZXRyaWN8ZW58MXwwfHxibHVlfDE3NDk3NzYzNzR8MA&ixlib=rb-4.1.0"
   */
  src?: string;
  /**
   * The alternative text for the image, for accessibility.
   * @default "Abstract blue geometric background"
   */
  alt?: string;
  /**
   * The width of the image. Can be a number (in pixels) or a string (e.g., '100%').
   */
  width?: string | number;
  /**
   * The height of the image. Can be a number (in pixels) or a string (e.g., 'auto').
   */
  height?: string | number;
  /**
   * Specifies how the content of the image should be resized to fit its container.
   * @default "cover"
   */
  objectFit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
  /**
   * Specifies whether a browser should load an image immediately or to defer loading of
   * off-screen images until the user scrolls near them.
   * @default "lazy"
   */
  loading?: 'eager' | 'lazy';
  /**
   * Additional CSS class name(s) to apply to the image component.
   */
  className?: string;
  /**
   * Inline CSS styles to apply to the image component.
   */
  style?: React.CSSProperties;
};

/**
 * Image component to display images responsively and with visual appeal.
 * It supports standard image attributes and styling options.
 */
export function Image({
  src = DEFAULT_IMAGE_SRC,
  alt = DEFAULT_ALT_TEXT,
  width,
  height,
  objectFit = 'cover',
  loading = 'lazy',
  className,
  style,
}: ImageProps): React.JSX.Element {
  const imageStyles: React.CSSProperties = {
    objectFit,
    ...style,
  };

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      className={classNames(styles.image, className)}
      style={imageStyles}
    />
  );
}