import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { SelectList } from './select-list.js';
import type { SelectListItemType } from './select-list-item-type.js';
import styles from './select-list.module.scss';

describe('SelectList', () => {
  const options: SelectListItemType[] = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
  ];

  it('renders the select list with options', () => {
    const { container } = render(
      <MemoryRouter>
        <SelectList options={options} onChange={() => {}} />
      </MemoryRouter>
    );

    const selectedItemDisplay = container.querySelector(`.${styles.selectedItemDisplay}`);
    expect(selectedItemDisplay).toBeInTheDocument();
  });

  it('opens and closes the dropdown list when the button is clicked', () => {
    const { container } = render(
      <MemoryRouter>
        <SelectList options={options} onChange={() => {}} />
      </MemoryRouter>
    );

    const selectedItemDisplay = container.querySelector(`.${styles.selectedItemDisplay}`) as HTMLButtonElement;
    expect(selectedItemDisplay).toBeInTheDocument();

    fireEvent.click(selectedItemDisplay);
    let dropdownList = container.querySelector(`.${styles.dropdownList}`);
    expect(dropdownList).toBeInTheDocument();

    fireEvent.click(selectedItemDisplay);
    dropdownList = container.querySelector(`.${styles.dropdownList}`);
    expect(dropdownList).not.toBeInTheDocument();
  });

  it('calls onChange when an option is selected', () => {
    const onChange = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <SelectList options={options} onChange={onChange} />
      </MemoryRouter>
    );

    const selectedItemDisplay = container.querySelector(`.${styles.selectedItemDisplay}`) as HTMLButtonElement;
    expect(selectedItemDisplay).toBeInTheDocument();

    fireEvent.click(selectedItemDisplay);
    const dropdownItem = container.querySelector(`.${styles.dropdownItem}`) as HTMLLIElement;
    expect(dropdownItem).toBeInTheDocument();

    fireEvent.click(dropdownItem);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('option1'); // Assuming first option is clicked
  });
});