import React, { useState, useEffect, useRef } from 'react';
import classNames from 'classnames';
import type { SelectListItemType } from './select-list-item-type.js';
import styles from './select-list.module.scss';

/**
 * Props for the SelectList component.
 * Defines the configurable options for the custom select dropdown.
 */
export type SelectListProps = {
  /**
   * An array of items to be displayed as options in the dropdown.
   * Each item must conform to the SelectListItemType structure.
   */
  options: SelectListItemType[];
  /**
   * The currently selected value.
   * Providing this prop makes the component controlled; its state is managed externally.
   * If undefined, the component is uncontrolled and manages its own selection state.
   */
  value?: string;
  /**
   * Callback function that is invoked when an option is selected by the user.
   * It receives the string value of the newly selected option.
   */
  onChange?: (value: string) => void;
  /**
   * Placeholder text displayed when no option is selected or the provided value is undefined.
   * Defaults to 'Select an option…'.
   */
  placeholder?: string;
  /**
   * If true, the select list is visually disabled and cannot be interacted with.
   * Defaults to false.
   */
  disabled?: boolean;
  /**
   * An optional CSS class name to apply to the root element of the component.
   * Allows for custom styling externally.
   */
  className?: string;
  /**
   * Optional inline CSS styles to apply to the root element of the component.
   * Use sparingly; prefer classNames for styling.
   */
  style?: React.CSSProperties;
  /**
   * An ARIA label for the select list button, crucial for accessibility.
   * It should provide a descriptive label for screen readers.
   * Defaults to 'Select option'.
   */
  ariaLabel?: string;
};

/**
 * SelectList is a custom dropdown component that allows users to select an option from a list.
 * It is styled according to the Nebula theme, supporting controlled/uncontrolled modes,
 * custom styling via className/style props, and accessibility features.
 * The component aims for a responsive and visually appealing user experience.
 */
export function SelectList({
  options,
  value,
  onChange,
  placeholder = 'Select an option…',
  disabled = false,
  className,
  style,
  ariaLabel = 'Select option',
}: SelectListProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  const selectListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectListRef.current && !selectListRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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
  }, [isOpen]);

  const handleToggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleOptionClick = (optionValue: string) => {
    if (value === undefined) { // Uncontrolled component
      setSelectedValue(optionValue);
    }
    if (onChange) {
      onChange(optionValue);
    }
    setIsOpen(false);
  };

  const getSelectedOptionLabel = () => {
    const selectedOption = options.find(option => option.value === selectedValue);
    return selectedOption ? selectedOption.label : placeholder;
  };

  const selectedLabel = getSelectedOptionLabel();

  return (
    <div
      className={classNames(styles.selectListContainer, className)}
      style={style}
      ref={selectListRef}
    >
      <button
        type="button"
        className={classNames(styles.selectedItemDisplay, { [styles.disabled]: disabled })}
        onClick={handleToggleDropdown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        {selectedValue ? (
          <span className={styles.selectedItemLabel}>{selectedLabel}</span>
        ) : (
          <span className={styles.selectedItemPlaceholder}>{placeholder}</span>
        )}
        <span
          className={classNames(styles.chevronIcon, { [styles.chevronIconOpen]: isOpen })}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>
      {isOpen ? (
        <ul
          className={classNames(styles.dropdownList, { [styles.open]: isOpen })}
          role="listbox"
          aria-label={ariaLabel ? `${ariaLabel} options` : 'Options list'}
        >
          {options.length > 0 ? (
            options.map((option) => (
              <li
                key={option.value}
                className={classNames(styles.dropdownItem, {
                  [styles.itemSelected]: option.value === selectedValue,
                  [styles.itemDisabled]: option.disabled,
                })}
                onClick={() => !option.disabled && handleOptionClick(option.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!option.disabled) handleOptionClick(option.value);
                  }
                }}
                role="option"
                aria-selected={option.value === selectedValue}
                aria-disabled={option.disabled}
                tabIndex={option.disabled ? -1 : 0}
              >
                {option.label}
              </li>
            ))
          ) : (
            <li className={styles.noOptionsItem} role="option" aria-live="polite">
              No options available
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}