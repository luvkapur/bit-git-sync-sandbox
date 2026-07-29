import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SelectList } from './select-list.js';
import type { SelectListItemType } from './select-list-item-type.js';
import styles from './select-list.module.scss';

describe('SelectList', () => {
  const options: SelectListItemType[] = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
  ];

  it('should open and close the dropdown list', () => {
    const { container } = render(
      <MemoryRouter>
        <SelectList options={options} onChange={() => {}} />
      </MemoryRouter>
    );

    const selectButton = container.querySelector(`.${styles.selectedItemDisplay}`) as HTMLButtonElement;
    fireEvent.click(selectButton);

    const dropdownList = container.querySelector(`.${styles.dropdownList}`);
    expect(dropdownList).toBeVisible();

    fireEvent.click(selectButton);
    // Dropdown should not be visible after clicking again.
    // Querying for it and expecting not.toBeVisible() can be tricky if the element is removed from DOM.
    // A better check might be to ensure it's not in the document or its 'open' class is removed.
    // However, given the current implementation likely uses visibility/opacity, toBeVisible is okay.
    // Let's assume the original test logic was sound for this part.
    expect(dropdownList).not.toBeVisible();
  });

  it('should call onChange when an option is clicked', () => {
    const onChange = vi.fn();
    const { container, getByText } = render(
      <MemoryRouter>
        <SelectList options={options} onChange={onChange} />
      </MemoryRouter>
    );

    const selectButton = container.querySelector(`.${styles.selectedItemDisplay}`) as HTMLButtonElement;
    fireEvent.click(selectButton);

    // Use getByText to find the option by its label, which is more robust
    const option1Element = getByText('Option 1');
    fireEvent.click(option1Element);

    expect(onChange).toHaveBeenCalledWith('option1');
  });

  it('should display the selected option label', () => {
    const { container } = render(
      <MemoryRouter>
        <SelectList options={options} value="option2" onChange={() => {}} />
      </MemoryRouter>
    );

    const selectedItemLabel = container.querySelector(`.${styles.selectedItemLabel}`);
    expect(selectedItemLabel).toHaveTextContent('Option 2');
  });

  it('should apply custom styles and className', () => {
    const customStyle = { backgroundColor: 'red', color: 'blue', padding: '5px' };
    const customClassName = 'my-custom-select-list';
    const { container } = render(
      <MemoryRouter>
        <SelectList
          options={options}
          onChange={() => {}}
          style={customStyle}
          className={customClassName}
        />
      </MemoryRouter>
    );

    const selectListRootElement = container.firstChild as HTMLElement;

    // Check for custom styles
    // Note: color names are often computed to rgb values by testing-library/jsdom
    expect(selectListRootElement).toHaveStyle('background-color: rgb(255, 0, 0)'); // red
    expect(selectListRootElement).toHaveStyle('color: rgb(0, 0, 255)'); // blue
    expect(selectListRootElement).toHaveStyle('padding: 5px');

    // Check for custom className
    expect(selectListRootElement).toHaveClass(customClassName);

    // Ensure default component class is also present
    expect(selectListRootElement).toHaveClass(styles.selectListContainer);
  });

  it('should be disabled when disabled prop is true', () => {
    const onChange = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <SelectList options={options} onChange={onChange} disabled={true} />
      </MemoryRouter>
    );

    const selectButton = container.querySelector(`.${styles.selectedItemDisplay}`) as HTMLButtonElement;
    expect(selectButton).toBeDisabled();

    // Try to click the disabled button
    fireEvent.click(selectButton);

    // Dropdown should not open
    const dropdownList = container.querySelector(`.${styles.dropdownList}`);
    expect(dropdownList).toBeNull(); // Or not.toBeVisible() if it's rendered but hidden

    // onChange should not have been called
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should display placeholder when no value is selected', () => {
    const placeholderText = "Choose an item";
    const { getByText } = render(
      <MemoryRouter>
        <SelectList options={options} onChange={() => {}} placeholder={placeholderText} />
      </MemoryRouter>
    );
    expect(getByText(placeholderText)).toBeInTheDocument();
  });

  it('should display "No options available" when options array is empty', () => {
    const { container, getByText } = render(
      <MemoryRouter>
        <SelectList options={[]} onChange={() => {}} />
      </MemoryRouter>
    );

    const selectButton = container.querySelector(`.${styles.selectedItemDisplay}`) as HTMLButtonElement;
    fireEvent.click(selectButton); // Open the dropdown

    expect(getByText('No options available')).toBeVisible();
  });

  it('should not select disabled options', () => {
    const onChange = vi.fn();
    const optionsWithDisabled: SelectListItemType[] = [
      { value: 'option1', label: 'Enabled Option' },
      { value: 'option2', label: 'Disabled Option', disabled: true },
    ];
    const { container, getByText } = render(
      <MemoryRouter>
        <SelectList options={optionsWithDisabled} onChange={onChange} />
      </MemoryRouter>
    );

    const selectButton = container.querySelector(`.${styles.selectedItemDisplay}`) as HTMLButtonElement;
    fireEvent.click(selectButton); // Open dropdown

    const disabledOptionElement = getByText('Disabled Option');
    expect(disabledOptionElement).toHaveClass(styles.itemDisabled);
    expect(disabledOptionElement).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(disabledOptionElement); // Attempt to click disabled option

    expect(onChange).not.toHaveBeenCalled(); // onChange should not be called

    // Dropdown should remain open or close depending on desired behavior for clicking disabled.
    // Current implementation closes dropdown. Let's assume it's fine.
    // If we want to check that the value hasn't changed:
    const selectedItemLabel = container.querySelector(`.${styles.selectedItemPlaceholder}`); // Assuming placeholder is shown
    expect(selectedItemLabel).toBeInTheDocument(); // Or check for specific placeholder text
  });
});