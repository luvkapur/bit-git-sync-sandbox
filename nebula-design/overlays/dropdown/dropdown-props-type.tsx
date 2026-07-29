import type { ReactNode, CSSProperties, MouseEvent } from 'react';
import type { DropdownPosition } from './dropdown-position-type.js';

/**
 * Props for the Nebula-themed Dropdown component.
 */
export type DropdownProps = {
  /**
   * The content or component that triggers the dropdown when clicked.
   * This is rendered inside an accessible button wrapper by the underlying component.
   * Users are responsible for styling their placeholder content to match the Nebula theme if needed.
   */
  placeholder: ReactNode;

  /**
   * The content to display within the dropdown's overlay.
   * This will be styled according to the Nebula theme.
   */
  children: ReactNode;

  /**
   * Determines the position of the dropdown overlay relative to the placeholder.
   * @default 'bottom-left'
   */
  openPosition?: DropdownPosition;

  /**
   * Optional click handler that is called when the placeholder is clicked.
   * This is called before the internal toggle logic of the underlying component.
   */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;

  /**
   * Optional class name to apply to the root dropdown container element of the underlying Dropdown.
   * This will be merged with Nebula-specific root styling.
   */
  className?: string;

  /**
   * Optional class name to apply to the dropdown content overlay element.
   * This will be merged with Nebula-specific content styling.
   */
  contentClassName?: string;

  /**
   * Optional inline style to apply to the root dropdown container element of the underlying Dropdown.
   */
  style?: CSSProperties;

  /**
   * Callback function fired when the dropdown's open state changes.
   * Receives the new `isOpen` boolean state as an argument.
   */
  onOpenChange?: (isOpen: boolean) => void;

  /**
   * Sets the initial open state of the dropdown when it first mounts.
   * @default false
   */
  initialOpen?: boolean;
};