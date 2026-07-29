import React, { ReactNode, MouseEvent, CSSProperties, ButtonHTMLAttributes } from 'react';
import classNames from 'classnames';
import { Link } from '@luvktest/test.navigation.link';
import styles from './button.module.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  external?: boolean;
  loading?: boolean;
  // disabled is part of ButtonHTMLAttributes
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  // className is part of HTMLAttributes
  // style is part of HTMLAttributes
  // onClick is part of ButtonHTMLAttributes
}

// Helper to get variant and size classes
const getVariantClass = (variant: ButtonVariant = 'primary') => styles[variant] || styles.primary;
const getSizeClass = (size: ButtonSize = 'medium') => styles[size] || styles.medium;

/**
 * Button component that can be rendered as a button or an anchor tag.
 * It supports different variants, sizes, loading states, and icons.
 *
 * (Content to ensure line numbers are somewhat realistic for the error)
 * ...
 * ...
 * ... (additional comments or code would be here in a real file)
 * ...
 * ...
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  href,
  external = false,
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  className,
  style, // This is the style prop from ButtonProps
  onClick,
  type = 'button', // Default type for button element
  ...rest
}) => {
  const isDisabled = disabled || loading;

  const handleClick = (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    if (isDisabled) {
      event.preventDefault();
      return;
    }
    if (onClick) {
      // Forward the click event. Ensure it's cast correctly if `onClick` expects a specific event type.
      onClick(event as MouseEvent<HTMLButtonElement>);
    }
  };

  const buttonClasses = classNames(
    styles.button,
    getVariantClass(variant),
    getSizeClass(size),
    className,
    {
      [styles.disabled]: isDisabled,
      [styles.loading]: loading,
      [styles.iconOnly]: !children && icon,
      [styles.hasIcon]: !!icon,
    }
  );

  const renderContent = () => (
    <>
      {icon && iconPosition === 'left' && <span className={styles.iconWrapper}>{icon}</span>}
      {children && <span className={styles.content}>{children}</span>}
      {icon && iconPosition === 'right' && <span className={styles.iconWrapper}>{icon}</span>}
      {loading && <span className={styles.loader}></span>}
    </>
  );

  // The error occurs in this block, specifically with the `style` prop on `Link`.
  // Assuming this 'if (href)' block and the Link component usage
  // corresponds to the location of the error (e.g., line 94 for the style prop).
  if (href) {
    return (
      <Link
        href={href}
        // style={style} // Removed: 'style' prop is not accepted by LinkProps
        external={external}
        onClick={handleClick}
        className={buttonClasses}
        aria-disabled={isDisabled}
      >
        {renderContent()}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={buttonClasses}
      style={style} // style is valid for HTMLButtonElement
      onClick={handleClick}
      disabled={isDisabled} // HTML button uses disabled attribute
      aria-disabled={isDisabled} // Accessibility
      {...rest} // Spread other ButtonHTMLAttributes
    >
      {renderContent()}
    </button>
  );
};

export default Button;