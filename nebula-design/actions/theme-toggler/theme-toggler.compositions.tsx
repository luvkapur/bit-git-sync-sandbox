import React, { useEffect, useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuraTheme, useThemeController, type ThemeMode } from '@luvktest/test.aura-theme';
import { ThemeToggler, type ThemeTogglerProps, type IconProps } from './theme-toggler.js';
import type { ThemeDefinition } from './theme-definition-type.js';
// SunIcon and MoonIcon are default but not directly used in showcase logic here
// import { SunIcon } from './sun-icon.js';
// import { MoonIcon } from './moon-icon.js';
import styles from './theme-toggler-compositions.module.scss';

const availableThemesForCompositions: ThemeDefinition[] = [
  { value: 'aura', label: 'Aura Design' },
  { value: 'nova', label: 'Nova Design' },
  { value: 'custom', label: 'Custom Theme (Disabled)', disabled: true },
];

// Helper component to display current theme state and the toggler
const ThemeTogglerShowcase = ({
  title,
  description,
  // initialAuraThemeMode is handled by AuraTheme provider wrapper
  initialSelectedBrandTheme = 'aura',
  themeTogglerProps = {},
}: {
  title: string;
  description: string;
  initialAuraThemeMode?: ThemeMode; // Used to inform AuraTheme, not directly by TogglerShowcase
  initialSelectedBrandTheme?: string;
  themeTogglerProps?: Partial<ThemeTogglerProps>;
}) => {
  // This useThemeController is for the AuraTheme wrapping this showcase
  const { themeMode: auraModeFromContext } = useThemeController();
  const [currentDataThemeAttribute, setCurrentDataThemeAttribute] = useState<string | null>(null);

  useEffect(() => {
    const updateThemeAttribute = () => {
      setCurrentDataThemeAttribute(document.documentElement.dataset.theme || null);
    };

    const observer = new MutationObserver(updateThemeAttribute);

    if (typeof document !== 'undefined' && document.documentElement) {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
      // Set initial value
      updateThemeAttribute();
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.showcaseContainer}>
      <h3 className={styles.showcaseTitle}>{title}</h3>
      <p className={styles.showcaseDescription}>{description}</p>
      <div className={styles.statusGrid}>
        <p>Aura Base Mode (Context): <strong className={styles.statusValue}>{auraModeFromContext}</strong></p>
        <p><code>data-theme</code> (Live): <strong className={styles.statusValue}>{currentDataThemeAttribute || 'not set'}</strong></p>
      </div>
      <div className={styles.togglerWrapper}>
        <ThemeToggler
          defaultThemeName={initialSelectedBrandTheme}
          availableThemes={availableThemesForCompositions}
          {...themeTogglerProps}
        />
      </div>
      <div className={styles.sampleContent}>
        <p>This is some sample text content to observe theme changes.</p>
        <button type="button" className={styles.sampleButton}>Sample Button</button>
      </div>
    </div>
  );
};

export const DefaultThemeToggler = () => (
  <MemoryRouter>
    <AuraTheme initialTheme="light">
      <ThemeTogglerShowcase
        title="Default Theme Toggler"
        description="Controls Aura light/dark mode and allows selection from default brand themes. Uses default icons and labels."
        initialAuraThemeMode="light"
        initialSelectedBrandTheme="aura"
      />
    </AuraTheme>
  </MemoryRouter>
);

export const DarkModeDefaultThemeToggler = () => (
  <MemoryRouter>
    <AuraTheme initialTheme="dark">
      <ThemeTogglerShowcase
        title="Dark Mode Default Toggler"
        description="Starts with Aura dark mode. The Toggler itself defaults to 'aura' brand, resulting in 'aura-dark'."
        initialAuraThemeMode="dark"
        initialSelectedBrandTheme="aura" // Toggler's default is aura
      />
    </AuraTheme>
  </MemoryRouter>
);

export const DarkModeWithNovaDefaultThemeToggler = () => (
  <MemoryRouter>
    <AuraTheme initialTheme="dark">
      <ThemeTogglerShowcase
        title="Dark Mode with 'Nova' Brand Default"
        description="Starts with Aura dark mode and the 'nova' brand theme selected initially by the Toggler."
        initialAuraThemeMode="dark"
        initialSelectedBrandTheme="nova" // Toggler is configured to default to nova
      />
    </AuraTheme>
  </MemoryRouter>
);

const CustomLightIcon = (props: IconProps) => <span {...props} style={{ ...props.style, fontSize: '20px' }} role="img" aria-label="light mode icon">🔆</span>;
const CustomDarkIcon = (props: IconProps) => <span {...props} style={{ ...props.style, fontSize: '20px' }} role="img" aria-label="dark mode icon">🌒</span>;

export const CustomIconsAndLabelsToggler = () => (
  <MemoryRouter>
    <AuraTheme initialTheme="light">
      <ThemeTogglerShowcase
        title="Custom Icons & Labels Toggler"
        description="Demonstrates using custom React components for icons and custom ARIA labels for accessibility."
        initialAuraThemeMode="light"
        initialSelectedBrandTheme="aura"
        themeTogglerProps={{
          lightIcon: CustomLightIcon,
          darkIcon: CustomDarkIcon,
          ariaLabelLight: 'Switch to the Night Side',
          ariaLabelDark: 'Embrace the Day Star',
          themeSelectorAriaLabel: 'Choose your visual style',
        }}
      />
    </AuraTheme>
  </MemoryRouter>
);

export const StyledThemeToggler = () => (
  <MemoryRouter>
    <AuraTheme initialTheme="light">
      <ThemeTogglerShowcase
        title="Styled Theme Toggler"
        description="Applies custom CSS classes (from compositions.module.scss) and inline styles to the toggler components."
        initialAuraThemeMode="light"
        initialSelectedBrandTheme="nova"
        themeTogglerProps={{
          className: styles.customTogglerContainer,
          modeTogglerClassName: styles.customModeButton,
          themeSelectorClassName: styles.customThemeSelector,
          modeTogglerStyle: { boxShadow: '0 0 8px var(--content-primary, rebeccapurple)' },
          themeSelectorStyle: { background: 'var(--fill-subtle, #e0e7ff)' },
          availableThemes: [
            { value: 'aura', label: 'Aura Styled' },
            { value: 'nova', label: 'Nova Styled' },
          ],
        }}
      />
    </AuraTheme>
  </MemoryRouter>
);