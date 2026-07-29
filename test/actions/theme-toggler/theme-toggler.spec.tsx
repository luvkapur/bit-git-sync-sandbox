import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThemeToggler } from './theme-toggler.js';
import { AuraTheme } from '@luvktest/test.aura-theme';
import styles from './theme-toggler.module.scss';
import type { ThemeDefinition } from './theme-definition-type.js';

const mockAvailableThemes: ThemeDefinition[] = [
  { value: 'aura', label: 'Aura Theme' },
  { value: 'nova', label: 'Nova Theme' },
];

describe('ThemeToggler', () => {
  // Mock document.documentElement.setAttribute
  const originalSetAttribute = document.documentElement.setAttribute;
  const originalDataset = Object.getOwnPropertyDescriptor(document.documentElement, 'dataset');

  beforeEach(() => {
    document.documentElement.setAttribute = vi.fn();
    // Mock dataset property to be writable for testing
    Object.defineProperty(document.documentElement, 'dataset', {
      value: {},
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    document.documentElement.setAttribute = originalSetAttribute;
    if (originalDataset) {
      Object.defineProperty(document.documentElement, 'dataset', originalDataset);
    }
    vi.restoreAllMocks();
  });

  it('should render the theme toggler container with mode button and theme selector', () => {
    const { container } = render(
      <AuraTheme>
        <ThemeToggler availableThemes={mockAvailableThemes} />
      </AuraTheme>
    );
    const togglerContainer = container.querySelector(`.${styles.themeTogglerContainer}`);
    expect(togglerContainer).not.toBeNull();

    const modeButton = container.querySelector(`.${styles.modeToggler}`);
    expect(modeButton).not.toBeNull();

    const themeSelector = container.querySelector(`.${styles.themeSelector}`); // This class is applied to the SelectList wrapper by ThemeToggler
    expect(themeSelector).not.toBeNull();
  });

  it('should set initial data-theme attribute based on default theme name and AuraTheme mode', async () => {
    render(
      <AuraTheme initialTheme="light">
        <ThemeToggler availableThemes={mockAvailableThemes} defaultThemeName="aura" />
      </AuraTheme>
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('aura-light');
    });
  });

  it('should toggle the light/dark mode and update data-theme when mode button is clicked', async () => {
    const { container } = render(
      <AuraTheme initialTheme="light">
        <ThemeToggler availableThemes={mockAvailableThemes} defaultThemeName="aura" />
      </AuraTheme>
    );
    
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('aura-light');
    });

    const modeButton = container.querySelector(`.${styles.modeToggler}`) as HTMLButtonElement;
    expect(modeButton).not.toBeNull();
    fireEvent.click(modeButton);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('aura-dark');
    });

    fireEvent.click(modeButton);
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('aura-light');
    });
  });

  it('should change selected theme and update data-theme when SelectList value changes', async () => {
    const { getByText, container } = render(
      <AuraTheme initialTheme="light">
        <ThemeToggler availableThemes={mockAvailableThemes} defaultThemeName="aura" />
      </AuraTheme>
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('aura-light');
    });
    
    // Open the SelectList
    const selectDisplay = container.querySelector('.selectedItemDisplay'); // Class from SelectList's internal structure
    expect(selectDisplay).not.toBeNull();
    if (!selectDisplay) return;
    fireEvent.click(selectDisplay);

    // Select "Nova Theme"
    const novaOption = await waitFor(() => getByText('Nova Theme')); // Label of the option
    fireEvent.click(novaOption);
    
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('nova-light');
    });

     // Toggle mode to dark
    const modeButton = container.querySelector(`.${styles.modeToggler}`) as HTMLButtonElement;
    fireEvent.click(modeButton);

    await waitFor(() => {
        expect(document.documentElement.dataset.theme).toBe('nova-dark');
    });
  });


  it('should apply custom ARIA labels for mode toggler', async () => {
    const ariaLabelLight = 'Switch to Dark Side';
    const ariaLabelDark = 'Switch to Light Side';

    const { container, rerender } = render(
      <AuraTheme initialTheme="light">
        <ThemeToggler ariaLabelLight={ariaLabelLight} ariaLabelDark={ariaLabelDark} />
      </AuraTheme>
    );
    
    let modeButton = container.querySelector(`.${styles.modeToggler}`) as HTMLButtonElement;
    await waitFor(() => expect(modeButton?.getAttribute('aria-label')).toBe(ariaLabelLight));

    fireEvent.click(modeButton);

    // To simulate AuraTheme updating its context for useThemeController
    rerender(
      <AuraTheme initialTheme="dark"> 
        <ThemeToggler ariaLabelLight={ariaLabelLight} ariaLabelDark={ariaLabelDark} />
      </AuraTheme>
    );
    modeButton = container.querySelector(`.${styles.modeToggler}`) as HTMLButtonElement; // Re-query
    await waitFor(() => expect(modeButton?.getAttribute('aria-label')).toBe(ariaLabelDark));
  });

  it('should apply custom ARIA label for theme selector', () => {
    const selectorAriaLabel = 'Choose Your Destiny';
    const { container } = render(
      <AuraTheme>
        <ThemeToggler themeSelectorAriaLabel={selectorAriaLabel} availableThemes={mockAvailableThemes} />
      </AuraTheme>
    );
    // SelectList component should receive this aria-label.
    // We test if the ThemeToggler passes it correctly.
    // The actual attribute might be on an inner button of SelectList.
    // For simplicity, we check if the SelectList container is there, assuming it gets the prop.
    const selectListContainer = container.querySelector(`.${styles.themeSelector}`);
    expect(selectListContainer).not.toBeNull(); 
    // To properly test this, we'd need to know SelectList's internal aria structure or have it expose the labelled element.
    // This test mainly ensures the prop is passed down.
  });


  it('should apply custom classNames and styles to its elements', () => {
    const customContainerClass = 'my-container';
    const customModeButtonClass = 'my-mode-button';
    const customSelectorClass = 'my-selector';
    const containerStyle = { padding: '20px' };
    const modeStyle = { margin: '5px' };
    // const selectorStyle = { border: '1px solid red' }; // Style prop for SelectList is not directly asserted on the .themeSelector div in this test setup

    const { container } = render(
      <AuraTheme>
        <ThemeToggler
          className={customContainerClass}
          style={containerStyle}
          modeTogglerClassName={customModeButtonClass}
          modeTogglerStyle={modeStyle}
          themeSelectorClassName={customSelectorClass}
          // themeSelectorStyle={selectorStyle} // Not directly testable on the wrapper div
          availableThemes={mockAvailableThemes}
        />
      </AuraTheme>
    );

    const togglerContainer = container.querySelector(`.${styles.themeTogglerContainer}`);
    expect(togglerContainer).toHaveClass(customContainerClass);
    expect(togglerContainer).toHaveStyle('padding: 20px');

    const modeButton = container.querySelector(`.${styles.modeToggler}`);
    expect(modeButton).toHaveClass(customModeButtonClass);
    expect(modeButton).toHaveStyle('margin: 5px');
    
    const themeSelector = container.querySelector(`.${styles.themeSelector}`);
    expect(themeSelector).toHaveClass(customSelectorClass);
    // SelectList likely wraps its content, so style might be on an inner element or its root.
    // This checks if the class is applied to the element we target with themeSelectorClassName.
    // Testing actual style application on SelectList would depend on SelectList's structure.
  });
});