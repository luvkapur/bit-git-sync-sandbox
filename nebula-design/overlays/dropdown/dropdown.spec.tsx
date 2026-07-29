import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dropdown } from './dropdown.js';
import styles from './dropdown.module.scss';
import { vi } from 'vitest';

describe('Dropdown Component', () => {
  it('should render the placeholder', () => {
    const placeholderText = 'Open Dropdown';
    const { container } = render(
      <MemoryRouter>
        <Dropdown placeholder={<button type="button">{placeholderText}</button>}>
          <div>Dropdown Content</div>
        </Dropdown>
      </MemoryRouter>
    );
    const placeholderButton = container.querySelector('button');
    expect(placeholderButton).toHaveTextContent(placeholderText);
  });

  it('should toggle dropdown content on placeholder click', () => {
    const { container } = render(
      <MemoryRouter>
        <Dropdown placeholder={<button type="button">Open Dropdown</button>}>
          <div className="dropdown-content">Dropdown Content</div>
        </Dropdown>
      </MemoryRouter>
    );

    const placeholderButton = container.querySelector('button');
    if (placeholderButton) {
      fireEvent.click(placeholderButton);
    }


    const dropdownContent = container.querySelector(`.${styles.dropdownContent}`);
    expect(dropdownContent).toBeInTheDocument();
  });

  it('should call onOpenChange when the dropdown opens', () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <Dropdown placeholder={<button type="button">Open Dropdown</button>} onOpenChange={onOpenChange}>
          <div>Dropdown Content</div>
        </Dropdown>
      </MemoryRouter>
    );

    const placeholderButton = container.querySelector('button');
    if (placeholderButton) {
      fireEvent.click(placeholderButton);
    }

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});