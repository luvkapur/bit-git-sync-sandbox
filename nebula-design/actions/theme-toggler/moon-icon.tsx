import React from 'react';
import type { IconProps } from './theme-toggler.js';

/**
 * MoonIcon component - typically used to represent dark mode.
 * Renders an SVG icon depicting a moon.
 * @param className - Optional CSS class name for the SVG element.
 * @param style - Optional inline styles for the SVG element.
 * @param rest - Other SVG props.
 */
export const MoonIcon = ({ className, style, ...rest }: IconProps): React.JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={style}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);