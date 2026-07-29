import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { Dropdown } from './dropdown.js';
import styles from './dropdown.module.scss';
import { MemoryRouter } from 'react-router-dom';

describe('Dropdown', () => {
  it('should open and close the dropdown on placeholder click', () => {
    const placeholderText = 'Open Dropdown';
    const { container } = render(
      <MemoryRouter>
        <Dropdown placeholder={<button>{placeholderText}</button>}>
          <div>Dropdown Content</div>
        </Dropdown>
      </MemoryRouter>
    );

    const placeholderButton = container.querySelector('button');
    expect(placeholderButton).toBeInTheDocument();

    fireEvent.click(placeholderButton!);

    const dropdownContent = container.querySelector(`.${styles.dropdownContent}`);
    expect(dropdownContent).toBeInTheDocument();

    fireEvent.click(placeholderButton!);
    const dropdownContentClosed = container.querySelector(`.${styles.dropdownContent}`);
    expect(dropdownContentClosed).not.toBeInTheDocument();
  });

  it('should call onClick handler when placeholder is clicked', () => {
    const onClick = vi.fn();
    const placeholderText = 'Open Dropdown';
    const { container } = render(
        <MemoryRouter>
            <Dropdown placeholder={<button>{placeholderText}</button>} onClick={onClick}>
                <div>Dropdown Content</div>
            </Dropdown>
        </MemoryRouter>
    );

    const placeholderButton = container.querySelector('button');
    expect(placeholderButton).toBeInTheDocument();

    fireEvent.click(placeholderButton!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should close dropdown on outside click', () => {
    const placeholderText = 'Open Dropdown';
    const { container } = render(
      <MemoryRouter>
        <Dropdown placeholder={<button>{placeholderText}</button>}>
          <div>Dropdown Content</div>
        </Dropdown>
      </MemoryRouter>
    );

    const placeholderButton = container.querySelector('button');
    expect(placeholderButton).toBeInTheDocument();

    fireEvent.click(placeholderButton!);

    const dropdownContent = container.querySelector(`.${styles.dropdownContent}`);
    expect(dropdownContent).toBeInTheDocument();

    fireEvent.mouseDown(document);

    const dropdownContentClosed = container.querySelector(`.${styles.dropdownContent}`);
    expect(dropdownContentClosed).not.toBeInTheDocument();
  });
});