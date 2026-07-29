import React from 'react';

export interface DefaultLogoProps {
  /**
   * Optional CSS class name to apply to the SVG element.
   */
  className?: string;
  /**
   * Optional inline styles to apply to the SVG element.
   */
  style?: React.CSSProperties;
  /**
   * The fill color for the logo. Defaults to 'currentColor'.
   */
  color?: string;
}

/**
 * Default Acme SVG logo component.
 * It's a simple, abstract mark representing "Acme".
 */
export const DefaultLogo: React.FC<DefaultLogoProps> = ({ className, style, color = 'currentColor' }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      fill={color} // Use the color prop for fill
      aria-hidden="true" // Decorative icon
      focusable="false"
    >
      <path d="M50 15 L10 85 H30 L50 45 L70 85 H90 L50 15 Z" />
    </svg>
  );
};