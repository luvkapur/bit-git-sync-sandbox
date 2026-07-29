import React from 'react';
import type { IconProps } from './theme-toggler.js'; // Use IconProps from main component type

/**
 * NebulaIcon component - a simple star shape representing the Nebula theme.
 */
export const NebulaIcon = ({ className, style, ...rest }: IconProps): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    {...rest}
    aria-hidden="true"
  >
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21L12 17.27Z" />
  </svg>
);