import React from 'react';
import type { IconProps } from './icon-props-type.js';

/**
 * Moon icon component, typically used to represent dark mode or night.
 * It is a line-art SVG crescent designed to inherit color via CSS.
 */
export const MoonIcon = ({ className, style, ...rest }: IconProps): React.JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    {...rest}
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);