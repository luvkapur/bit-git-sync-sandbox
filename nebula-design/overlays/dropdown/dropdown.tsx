import React from 'react';
import classNames from 'classnames';
import { Dropdown as BaseDropdown } from '@luvktest/test.overlays.dropdown';
import type { DropdownProps } from './dropdown-props-type.js';
// DropdownPosition type is implicitly used by BaseDropdown and defined in dropdown-props-type.js
import styles from './dropdown.module.scss';

/**
 * A Dropdown component styled according to the Nebula theme.
 * It utilizes the BaseDropdown from '@luvktest/test.overlays.dropdown'
 * and applies Nebula-specific styling primarily to the dropdown panel (content area).
 * Consumers of this component are responsible for styling the placeholder content
 * if specific Nebula theming is required for the trigger element itself.
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
  return (
    <BaseDropdown
      placeholder={placeholder}
      openPosition={openPosition}
      onClick={onClick}
      className={classNames(styles.dropdownRoot, className)}
      contentClassName={classNames(styles.dropdownContent, contentClassName)}
      style={style}
      onOpenChange={onOpenChange}
      initialOpen={initialOpen}
    >
      {children}
    </BaseDropdown>
  );
}