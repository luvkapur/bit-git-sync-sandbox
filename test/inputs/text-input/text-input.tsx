import React from 'react';
import classNames from 'classnames';
import styles from './text-input.module.scss';

/**
 * Properties for the TextInput component.
 */
export type TextInputProps = {
  /**
   * The unique identifier for the input element.
   */
  id?: string;
  /**
   * The current value of the input field.
   */
  value: string;
  /**
   * Callback function triggered when the input value changes.
   * @param value - The new value of the input field.
   */
  onChange: (value: string) => void;
  /**
   * Placeholder text to display when the input field is empty.
   */
  placeholder?: string;
  /**
   * The type of the input field (e.g., 'text', 'password', 'email').
   * Defaults to 'text'.
   */
  type?: string;
  /**
   * The name attribute for the input element.
   */
  name?: string;
  /**
   * Optional CSS class name to apply to the input element.
   */
  className?: string;
  /**
   * Optional inline styles to apply to the input element.
   */
  style?: React.CSSProperties;
  /**
   * If true, the input field will be disabled.
   * @default false
   */
  disabled?: boolean;
};

/**
 * A customizable text input component.
 * It allows users to enter and edit text, supporting various types and styles.
 */
export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  name,
  className,
  style,
  disabled = false,
}: TextInputProps): React.JSX.Element {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    onChange(event.target.value);
  };

  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      name={name}
      className={classNames(styles.textInput, className)}
      style={style}
      disabled={disabled}
      aria-disabled={disabled}
    />
  );
}