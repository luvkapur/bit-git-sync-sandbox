import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { TextInput } from './text-input.js';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

describe('TextInput', () => {
  it('renders with the correct placeholder', () => {
    const placeholderText = 'Enter your name';
    const { container } = render(
      <MemoryRouter>
        <TextInput
          value=""
          onChange={() => {}}
          placeholder={placeholderText}
        />
      </MemoryRouter>
    );
    const inputElement = container.querySelector('input');
    expect(inputElement).toHaveAttribute('placeholder', placeholderText);
  });

  it('updates the value when typing', () => {
    const onChange = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <TextInput
          value=""
          onChange={onChange}
          placeholder="Enter text"
        />
      </MemoryRouter>
    );
    const inputElement = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(inputElement, { target: { value: 'new value' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('new value');
  });

  it('applies the disabled state correctly', () => {
    const { container } = render(
      <MemoryRouter>
        <TextInput
          value="test"
          onChange={() => {}}
          disabled={true}
        />
      </MemoryRouter>
    );
    const inputElement = container.querySelector('input');
    expect(inputElement).toBeDisabled();
  });
});