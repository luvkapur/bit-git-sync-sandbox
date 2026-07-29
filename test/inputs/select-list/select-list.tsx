import React, { useState, useEffect, useRef } from 'react';
import classNames from 'classnames';
import type { SelectListItemType } from './select-list-item-type.js';
import styles from './select-list.module.scss';

/**
 * Props for the SelectList component.
 */
export type SelectListProps = {
  /**
   * Array of options to be displayed in the select list.
   * Each option must have a unique `value` and a `label`.
   */
  options: SelectListItemType[];
  /**
   * The currently selected value.
   * If provided, the component operates in a controlled mode.
   * If undefined, the component manages its own state (uncontrolled).
   */
  value?: string;
  /**
   * Callback function invoked when an option is selected.
   * It receives the `value` of the selected option.
   */
  onChange?: (value: string) => void;
  /**
   * Placeholder text to display when no option is selected or the value is undefined.
   * @default 'Select an option…'
   */
  placeholder?: string;
  /**
   * If true, the select list is disabled and cannot be interacted with.
   * @default false
   */
  disabled?: boolean;
  /**
   * Custom CSS class name to apply to the root element of the component.
   */
  className?: string;
  /**
   * Custom inline styles to apply to the root element of the component.
   */
  style?: React.CSSProperties;
  /**
   * Aria-label for the select list button, enhancing accessibility.
   * It's recommended to provide a descriptive label.
   */
  ariaLabel?: string;
};

const ChevronIcon: React.FC<{ isOpen: boolean; className?: string }> = ({ isOpen, className }) => (
  <svg
    className={classNames(styles.chevronIcon, className, { [styles.chevronIconOpen]: isOpen })}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/**
 * SelectList is a custom dropdown component that allows users to select an option from a list.
 * It supports controlled and uncontrolled modes, custom styling, and accessibility features.
 * The component is designed to be responsive and visually appealing.
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
  // Internal state for uncontrolled mode or to sync with `value` prop
  const [currentValue, setCurrentValue] = useState<string | undefined>(value);

  const selectRef = useRef<HTMLDivElement>(null);

  // Effect to sync internal state when `value` prop changes (for controlled component)
  useEffect(() => {
    // This effect ensures that the internal `currentValue` state
    // is synchronized with the external `value` prop.
    // This is crucial for controlled component behavior and for
    // handling scenarios like form resets where `value` might become `undefined`.
    setCurrentValue(value);
  }, [value]);

  // Effect to handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
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

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleOptionClick = (optionValue: string) => {
    // For uncontrolled component (value prop is undefined), update internal state
    if (value === undefined) {
      setCurrentValue(optionValue);
    }
    // Always call onChange if provided
    if (onChange) {
      onChange(optionValue);
    }
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => opt.value === currentValue);
  const displayLabel = selectedOption?.label;

  const containerClasses = classNames(styles.selectListContainer, className);
  const selectedItemClasses = classNames(styles.selectedItemDisplay, {
    [styles.disabled]: disabled,
  });

  const displayLabelClasses = classNames({
    [styles.selectedItemLabel]: !!displayLabel,
    [styles.selectedItemPlaceholder]: !displayLabel,
  });

  return (
    <div ref={selectRef} className={containerClasses} style={style}>
      <button
        type="button"
        className={selectedItemClasses}
        onClick={toggleDropdown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span className={displayLabelClasses}>
          {displayLabel || placeholder}
        </span>
        <ChevronIcon isOpen={isOpen} />
      </button>
      {isOpen && (
        <ul className={classNames(styles.dropdownList, { [styles.open]: isOpen })} role="listbox">
          {options.length > 0 ? (
            options.map((option) => (
              <li
                key={option.value}
                className={classNames(styles.dropdownItem, {
                  [styles.itemSelected]: selectedOption?.value === option.value,
                  [styles.itemDisabled]: option.disabled,
                })}
                onClick={() => !option.disabled && handleOptionClick(option.value)}
                role="option"
                aria-selected={selectedOption?.value === option.value}
                aria-disabled={option.disabled}
              >
                {option.label}
              </li>
            ))
          ) : (
            <li className={classNames(styles.dropdownItem, styles.noOptionsItem)} role="option" aria-disabled="true">
              No options available
            </li>
          )}
        </ul>
      )}
    </div>
  );
}