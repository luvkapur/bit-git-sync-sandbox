import React, { useEffect, useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuraTheme, useThemeController, type ThemeMode } from '@luvktest/test.aura-theme';
import { ThemeToggler } from './theme-toggler.js';
import type { ThemeDefinition } from './theme-definition-type.js';

const availableThemesForCompositions: ThemeDefinition[] = [
  { value: 'aura', label: 'Aura' },
  { value: 'nova', label: 'Nova' },
  { value: 'custom', label: 'Custom (disabled)', disabled: true },
];

// Helper component to display current theme state and the toggler
const ThemeTogglerShowcase = ({
  title,
  initialAuraThemeMode = 'light',
  initialSelectedThemeName = 'aura'
}: {
  title: string;
  initialAuraThemeMode?: ThemeMode;
  initialSelectedThemeName?: string;
}) => {
  const { themeMode } = useThemeController(); // This is Aura's light/dark mode
  const [currentDataTheme, setCurrentDataTheme] = useState('');

  useEffect(() => {
    // Helper to read the data-theme from the root element for display purposes
    const observer = new MutationObserver(() => {
      setCurrentDataTheme(document.documentElement.dataset.theme || '');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    // Set initial value
    setCurrentDataTheme(document.documentElement.dataset.theme || '');
    return () => observer.disconnect();
  }, []);


  return (
    <div style={{
      padding: 'var(--spacing-large)',
      margin: 'var(--spacing-default)',
      backgroundColor: 'var(--colors-surface-primary)',
      color: 'var(--colors-text-primary)',
      minHeight: '250px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--spacing-default)',
      fontFamily: 'var(--typography-font-family)',
      borderRadius: 'var(--borders-radius-container)',
      border: '1px solid var(--colors-border-default)',
      boxShadow: 'var(--effects-shadows-medium)',
      textAlign: 'center'
    }}>
      <h3 style={{ margin: '0 0 var(--spacing-small) 0', fontSize: 'var(--typography-sizes-heading-h3)', color: 'var(--colors-text-primary)' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 'var(--typography-sizes-body-default)', color: 'var(--colors-text-secondary)' }}>
        Aura Mode: <strong style={{ color: 'var(--colors-text-primary)' }}>{themeMode}</strong>
      </p>
      <p style={{ margin: 0, fontSize: 'var(--typography-sizes-body-default)', color: 'var(--colors-text-secondary)' }}>
        Root data-theme: <strong style={{ color: 'var(--colors-text-primary)' }}>{currentDataTheme || 'Not set'}</strong>
      </p>
      <ThemeToggler
        availableThemes={availableThemesForCompositions}
        defaultThemeName={initialSelectedThemeName}
      />
      <p style={{fontSize: 'var(--typography-sizes-caption-default)', color: 'var(--colors-text-secondary)', marginTop: 'var(--spacing-small)'}}>
        Interact with the controls to change themes and modes.
        <br />
        Note: Visual changes for &apos;Nova&apos; theme require corresponding CSS definitions in the application.
      </p>
    </div>
  );
};


export const DefaultThemeToggler = () => {
  return (
    <MemoryRouter>
      <AuraTheme initialTheme="light">
        <div style={{ backgroundColor: 'var(--colors-surface-background)', padding: 'var(--spacing-large)', minHeight: '100vh' }}>
          <ThemeTogglerShowcase title="Theme Toggler (Aura Light)" initialAuraThemeMode="light" initialSelectedThemeName="aura" />
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const ThemeTogglerInDarkMode = () => {
  return (
    <MemoryRouter>
      <AuraTheme initialTheme="dark">
         <div style={{ backgroundColor: 'var(--colors-surface-background)', padding: 'var(--spacing-large)', minHeight: '100vh' }}>
          <ThemeTogglerShowcase title="Theme Toggler (Aura Dark)" initialAuraThemeMode="dark" initialSelectedThemeName="aura" />
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const ThemeTogglerWithNovaSelected = () => {
  return (
    <MemoryRouter>
      <AuraTheme initialTheme="light">
        <div style={{ backgroundColor: 'var(--colors-surface-background)', padding: 'var(--spacing-large)', minHeight: '100vh' }}>
          <ThemeTogglerShowcase title="Theme Toggler (Nova Light)" initialAuraThemeMode="light" initialSelectedThemeName="nova" />
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const ThemeTogglerWithCustomLabelsAndStyles = () => {
  return (
    <MemoryRouter>
      <AuraTheme initialTheme="light">
        <div style={{
          backgroundColor: 'var(--colors-surface-background)',
          padding: 'var(--spacing-large)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '100vh'
        }}>
           <div style={{
            padding: 'var(--spacing-large)',
            margin: 'var(--spacing-default)',
            backgroundColor: 'var(--colors-surface-primary)',
            color: 'var(--colors-text-primary)',
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--spacing-default)',
            fontFamily: 'var(--typography-font-family)',
            borderRadius: 'var(--borders-radius-container)',
            border: '1px solid var(--colors-primary-default)',
            boxShadow: 'var(--effects-shadows-large)'
          }}>
            <h3 style={{ margin: 0, fontSize: 'var(--typography-sizes-heading-h3)', color: 'var(--colors-text-primary)' }}>Customized Toggler</h3>
            <ThemeToggler
              ariaLabelLight="Switch to Spooky Mode"
              ariaLabelDark="Switch to Sunny Mode"
              themeSelectorAriaLabel="Choose your universe"
              availableThemes={availableThemesForCompositions}
              defaultThemeName="aura"
              className="custom-toggler-container" // Example custom class for container
              modeTogglerClassName="custom-mode-button" // Example for button
              themeSelectorClassName="custom-theme-select" // Example for select
              style={{ border: '2px dashed var(--colors-primary-default)', padding: 'var(--spacing-default)', borderRadius: 'var(--borders-radius-medium)'}}
            />
            <p style={{fontSize: 'var(--typography-sizes-caption-default)', color: 'var(--colors-text-secondary)', textAlign: 'center', marginTop: 'var(--spacing-small)'}}>
              Inspect elements for custom classes and ARIA labels. Container has a dashed border via style prop.
            </p>
          </div>
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};