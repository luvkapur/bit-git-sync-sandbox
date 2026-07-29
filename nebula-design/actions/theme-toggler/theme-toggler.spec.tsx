import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuraTheme, useThemeController } from '@luvktest/test.aura-theme';
import { ThemeToggler, type ThemeTogglerProps } from './theme-toggler.js';
import { SunIcon } from './sun-icon.js';
import { MoonIcon } from './moon-icon.js';
import styles from './theme-toggler.module.scss';

// Helper to display current theme states for testing
const TestApp = (props: Partial<ThemeTogglerProps>) => {
  const { themeMode } = useThemeController();
  return (
    <div>
      <div data-testid="current-aura-mode">{themeMode}</div>
      <ThemeToggler {...props} />
    </div>
  );
};

describe('ThemeToggler', () => {
  beforeEach(() => {
    // Reset data-theme before each test
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.removeAttribute('data-theme');
    }
  });

  it('should render with default props and initial state', () => {
    render(
      <MemoryRouter>
        <AuraTheme initialTheme="light">
          <TestApp />
        </AuraTheme>
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Select theme' })).toBeInTheDocument();
    expect(screen.getByTestId('current-aura-mode')).toHaveTextContent('light');
    expect(document.documentElement.dataset.theme).toBe('aura-light'); // defaultThemeName 'aura' + initialTheme 'light'
    expect(screen.getByRole('option', { name: 'Aura' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Nova' })).toBeInTheDocument();
  });

  it('should toggle Aura theme mode (light/dark) and update data-theme', () => {
    render(
      <MemoryRouter>
        <AuraTheme initialTheme="light">
          <TestApp />
        </AuraTheme>
      </MemoryRouter>
    );

    const modeToggleButton = screen.getByRole('button', { name: 'Switch to dark theme' });

    // Initial: light
    expect(screen.getByTestId('current-aura-mode')).toHaveTextContent('light');
    expect(document.documentElement.dataset.theme).toBe('aura-light');
    expect(modeToggleButton).toHaveAttribute('aria-label', 'Switch to dark theme');
    expect(modeToggleButton.querySelector(`.${styles.lightIconActive}`)).toBeInTheDocument();
    expect(modeToggleButton.querySelector(`.${styles.darkIconInactive}`)).toBeInTheDocument();


    // Click to dark
    act(() => {
      fireEvent.click(modeToggleButton);
    });
    expect(screen.getByTestId('current-aura-mode')).toHaveTextContent('dark');
    expect(document.documentElement.dataset.theme).toBe('aura-dark');
    expect(modeToggleButton).toHaveAttribute('aria-label', 'Switch to light theme');
    expect(modeToggleButton.querySelector(`.${styles.darkIconActive}`)).toBeInTheDocument();
    expect(modeToggleButton.querySelector(`.${styles.lightIconInactive}`)).toBeInTheDocument();


    // Click back to light
    act(() => {
      fireEvent.click(modeToggleButton);
    });
    expect(screen.getByTestId('current-aura-mode')).toHaveTextContent('light');
    expect(document.documentElement.dataset.theme).toBe('aura-light');
    expect(modeToggleButton).toHaveAttribute('aria-label', 'Switch to dark theme');
  });

  it('should change brand theme via dropdown and update data-theme', () => {
    render(
      <MemoryRouter>
        <AuraTheme initialTheme="light">
          <TestApp />
        </AuraTheme>
      </MemoryRouter>
    );

    const themeSelector = screen.getByRole('combobox', { name: 'Select theme' });
    expect(document.documentElement.dataset.theme).toBe('aura-light'); // Aura is default brand

    // Change to Nova
    act(() => {
      fireEvent.change(themeSelector, { target: { value: 'nova' } });
    });
    expect(document.documentElement.dataset.theme).toBe('nova-light'); // Nova brand, still light mode
    expect((screen.getByRole('option', { name: 'Nova' }) as HTMLOptionElement).selected).toBe(true);


    // Change back to Aura
    act(() => {
      fireEvent.change(themeSelector, { target: { value: 'aura' } });
    });
    expect(document.documentElement.dataset.theme).toBe('aura-light');
    expect((screen.getByRole('option', { name: 'Aura' }) as HTMLOptionElement).selected).toBe(true);
  });

  it('should reflect combined state in data-theme (brand and mode)', () => {
    render(
      <MemoryRouter>
        <AuraTheme initialTheme="light">
          <TestApp />
        </AuraTheme>
      </MemoryRouter>
    );

    const modeToggleButton = screen.getByRole('button');
    const themeSelector = screen.getByRole('combobox');

    // Initial: aura-light
    expect(document.documentElement.dataset.theme).toBe('aura-light');

    // Change brand to Nova
    act(() => {
      fireEvent.change(themeSelector, { target: { value: 'nova' } });
    });
    expect(document.documentElement.dataset.theme).toBe('nova-light');

    // Change mode to dark
    act(() => {
      fireEvent.click(modeToggleButton);
    });
    expect(document.documentElement.dataset.theme).toBe('nova-dark');

    // Change brand back to Aura
    act(() => {
      fireEvent.change(themeSelector, { target: { value: 'aura' } });
    });
    expect(document.documentElement.dataset.theme).toBe('aura-dark');

    // Change mode back to light
    act(() => {
      fireEvent.click(modeToggleButton);
    });
    expect(document.documentElement.dataset.theme).toBe('aura-light');
  });

  it('should use custom icons and ARIA labels if provided', () => {
    const CustomSun = () => <div data-testid="custom-sun">☀️</div>;
    const CustomMoon = () => <div data-testid="custom-moon">🌙</div>;
    render(
      <MemoryRouter>
        <AuraTheme initialTheme="light">
          <TestApp
            lightIcon={CustomSun}
            darkIcon={CustomMoon}
            ariaLabelLight="Activate Darkness"
            ariaLabelDark="Embrace Light"
            themeSelectorAriaLabel="Choose Style"
          />
        </AuraTheme>
      </MemoryRouter>
    );

    expect(screen.getByTestId('custom-sun')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activate Darkness' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Choose Style' })).toBeInTheDocument();

    const modeToggleButton = screen.getByRole('button');
    act(() => {
      fireEvent.click(modeToggleButton);
    });
    expect(screen.getByTestId('custom-moon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Embrace Light' })).toBeInTheDocument();
  });

  it('should render custom available themes and defaultThemeName', () => {
    const customThemes = [
      { value: 'modern', label: 'Modern Look' },
      { value: 'classic', label: 'Classic Feel' },
    ];
    render(
      <MemoryRouter>
        <AuraTheme initialTheme="dark">
          <TestApp availableThemes={customThemes} defaultThemeName="classic" />
        </AuraTheme>
      </MemoryRouter>
    );

    expect(screen.getByRole('option', { name: 'Modern Look' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Classic Feel' })).toBeInTheDocument();
    expect((screen.getByRole('option', { name: 'Classic Feel' }) as HTMLOptionElement).selected).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('classic-dark');
  });
});