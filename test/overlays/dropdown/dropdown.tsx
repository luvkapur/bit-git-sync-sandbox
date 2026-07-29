import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './dropdown.module.scss';

/**
 * Defines the possible positions for the dropdown overlay relative to the placeholder.
 */
export type DropdownPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type DropdownProps = {
  /**
   * The content or component that triggers the dropdown when clicked.
   * This is rendered inside an accessible button wrapper.
   */
  placeholder: React.ReactNode;
  /**
   * The content to display within the dropdown's overlay.
   * This can be any valid React node, including interactive elements.
   */
  children: React.ReactNode;
  /**
   * Determines the position of the dropdown overlay relative to the placeholder.
   * @default 'bottom-left'
   */
  openPosition?: DropdownPosition;
  /**
   * Optional click handler that is called when the placeholder is clicked.
   * This is called before the internal toggle logic.
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /**
   * Optional class name to apply to the root dropdown container element.
   */
  className?: string;
  /**
   * Optional class name to apply to the dropdown content overlay element.
   */
  contentClassName?: string;
  /**
   * Optional inline style to apply to the root dropdown container element.
   */
  style?: React.CSSProperties;
  /**
   * Callback function fired when the dropdown's open state changes (e.g., opened or closed).
   * Receives the new `isOpen` boolean state as an argument.
   */
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * Sets the initial open state of the dropdown when it first mounts.
   * @default false
   */
  initialOpen?: boolean;
};

/**
 * A flexible and accessible dropdown component that renders interactive content
 * within a visually distinct overlay, triggered by a placeholder.
 */
export function Dropdown({
  placeholder,
  children,
  openPosition = 'bottom-left',
  onClick,
  className,
  contentClassName,
  style,
  onOpenChange,
  initialOpen = false,
}: DropdownProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggleDropdown = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(event);
    }
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    if (onOpenChange) {
      onOpenChange(newIsOpen);
    }
  }, [isOpen, onClick, onOpenChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (onOpenChange) {
          onOpenChange(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onOpenChange]);


  const positionClasses: Record<DropdownPosition, string> = {
    'top-left': styles.positionTopLeft,
    'top-right': styles.positionTopRight,
    'bottom-left': styles.positionBottomLeft,
    'bottom-right': styles.positionBottomRight,
  };

  const currentPositionClass = positionClasses[openPosition];

  const rootClassNames = [styles.dropdownContainer, className].filter(Boolean).join(' ');
  
  const contentClasses = [
    styles.dropdownContent,
    currentPositionClass,
    contentClassName,
    isOpen ? styles.dropdownContentOpen : undefined,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={rootClassNames}
      style={style}
      ref={dropdownRef}
    >
      <button
        type="button"
        className={styles.placeholderWrapper}
        onClick={handleToggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'dropdown-content' : undefined}
      >
        {placeholder}
      </button>
      {isOpen && (
        <div
          id="dropdown-content"
          className={contentClasses}
          role="listbox"
        >
          {children}
        </div>
      )}
    </div>
  );
}