import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { TextInput } from './text-input.js';
import styles from './text-input.module.scss';

describe('TextInput Component', () => {
  it('should render a text input with the correct placeholder', () => {
    const placeholderText = 'Enter text here';
    const { container } = render(
      <TextInput
        id="test-input"
        value=""
        onChange={() => {}}
        placeholder={placeholderText}
      />
    );

    const inputElement = container.querySelector('input') as HTMLInputElement;
    expect(inputElement).toBeInTheDocument();
    expect(inputElement.placeholder).toBe(placeholderText);
  });

  it('should update the value when text is entered', () => {
    const onChange = vi.fn();
    const { container } = render(
      <TextInput
        id="test-input"
        value=""
        onChange={onChange}
        placeholder="Enter text"
      />
    );

    const inputElement = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(inputElement, { target: { value: 'test value' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('test value');
  });

  it('should apply the correct CSS class', () => {
    const { container } = render(
      <TextInput
        id="test-input"
        value=""
        onChange={() => {}}
        placeholder="Enter text"
      />
    );

    const inputElement = container.querySelector('input') as HTMLInputElement;
    expect(inputElement).toHaveClass(styles.textInput);
  });

  it('should render as disabled when disabled prop is true', () => {
    const { container } = render(
      <TextInput
        id="disabled-test-input"
        value="cannot edit"
        onChange={() => {}}
        disabled={true}
      />
    );
    const inputElement = container.querySelector('input') as HTMLInputElement;
    expect(inputElement).toBeDisabled();
  });

  it('should not be disabled when disabled prop is false or undefined', () => {
    const { container, rerender } = render(
      <TextInput
        id="enabled-test-input"
        value="can edit"
        onChange={() => {}}
        disabled={false}
      />
    );
    const inputElement = container.querySelector('input') as HTMLInputElement;
    expect(inputElement).not.toBeDisabled();

    rerender(
      <TextInput
        id="enabled-test-input-undefined"
        value="can edit"
        onChange={() => {}}
      />
    );
    const inputElementUndefined = container.querySelector('input') as HTMLInputElement;
    expect(inputElementUndefined).not.toBeDisabled();
  });

  it('should apply custom inline styles', () => {
    const customStyle = { backgroundColor: 'red', color: 'blue', margin: '10px' };
    const { container } = render(
      <TextInput
        id="test-input-custom-style"
        value=""
        onChange={() => {}}
        placeholder="Styled input"
        style={customStyle}
      />
    );
    const inputElement = container.querySelector('input') as HTMLInputElement;
    // @testing-library/jest-dom's toHaveStyle with an object argument
    // correctly handles computed style differences like 'red' vs 'rgb(255, 0, 0)'
    expect(inputElement).toHaveStyle({
      backgroundColor: 'red',
      color: 'blue',
      margin: '10px',
    });
  });
});