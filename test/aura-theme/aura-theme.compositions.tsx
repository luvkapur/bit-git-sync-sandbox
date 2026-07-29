import { TokenViewer } from '@bitdesign/sparks.sparks-theme';
import { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom'; // For robust component rendering, e.g. if TokenViewer uses Links
import { AuraTheme } from './aura-theme.js';
import { useTheme } from './aura-theme-provider.js';
import { useThemeController } from './theme-controller.js';
import { AuraThemeOverrides } from './aura-theme-provider.js';

// Private component to view tokens
const ViewTokens = () => {
  const theme = useTheme(); // Correctly uses the theme hook provided by AuraThemeProvider
  return <TokenViewer theme={theme} />;
};

// A reusable styled box for demo content
const DemoBox = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      padding: 'var(--spacing-large)', // Using actual theme token
      margin: 'var(--spacing-default) 0',
      border: 'var(--borders-default-width) var(--borders-default-style) var(--borders-default-color)',
      borderRadius: 'var(--borders-radius-container)',
      backgroundColor: 'var(--colors-surface-primary)',
      color: 'var(--colors-text-primary)',
      fontFamily: 'var(--typography-font-family)',
      boxShadow: 'var(--effects-shadows-medium)',
    }}
  >
    {children}
  </div>
);

// A reusable component to demonstrate theme awareness and control
const ThemeAwareComponent = () => {
  const { themeMode, toggleTheme, setThemeMode } = useThemeController();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-default)' }}>
      <DemoBox>
        <p style={{ fontFamily: 'var(--typography-font-family)', fontSize: 'var(--typography-sizes-body-default)'}}>
          Current Theme Mode: <strong style={{ color: 'var(--colors-primary-default)'}}>{themeMode}</strong>
        </p>
        <p style={{ color: 'var(--colors-text-secondary)', fontSize: 'var(--typography-sizes-body-small)' }}>
          This text uses secondary text color.
        </p>
        <p style={{ color: 'var(--colors-status-positive-default)', fontWeight: 'var(--typography-font-weight-bold)' }}>
          This text uses status positive color.
        </p>
        <p style={{ fontFamily: 'var(--typography-font-family)'}}>
          Font family: <span style={{ fontFamily: 'var(--typography-font-family)'}}>Sample of themed font.</span>
        </p>
        <p>
          Primary button border radius: <span style={{color: 'var(--colors-primary-default)'}}>var(--borders-radius-button)</span>
        </p>
      </DemoBox>
      <div style={{ display: 'flex', gap: 'var(--spacing-default)', flexWrap: 'wrap' }}>
        <button
          onClick={toggleTheme}
          style={{
            padding: 'var(--spacing-small) var(--spacing-default)',
            backgroundColor: 'var(--colors-primary-default)',
            color: 'var(--colors-text-inverse) !important',
            border: 'var(--borders-width-button) solid transparent',
            borderRadius: 'var(--borders-radius-button)',
            cursor: 'var(--interactions-cursor-pointer)',
            fontFamily: 'var(--typography-font-family)',
            fontWeight: 'var(--typography-font-weight-bold)',
            transition: 'background-color var(--interactions-transitions-duration-fast) var(--interactions-transitions-easing-easeInOut)',
          }}
        >
          Toggle Theme (Light/Dark)
        </button>
        <button
          onClick={() => setThemeMode('light')}
          style={{
            padding: 'var(--spacing-small) var(--spacing-default)',
            backgroundColor: 'var(--colors-surface-secondary)', // Using a less prominent background
            color: 'var(--colors-text-primary)',
            border: 'var(--borders-width-button) solid var(--colors-border-default)',
            borderRadius: 'var(--borders-radius-button)',
            cursor: 'var(--interactions-cursor-pointer)',
            fontFamily: 'var(--typography-font-family)',
          }}
        >
          Set Light Theme
        </button>
        <button
          onClick={() => setThemeMode('dark')}
          style={{
            padding: 'var(--spacing-small) var(--spacing-default)',
            backgroundColor: 'var(--colors-surface-secondary)',
            color: 'var(--colors-text-primary)',
            border: 'var(--borders-width-button) solid var(--colors-border-default)',
            borderRadius: 'var(--borders-radius-button)',
            cursor: 'var(--interactions-cursor-pointer)',
            fontFamily: 'var(--typography-font-family)',
          }}
        >
          Set Dark Theme
        </button>
      </div>
    </div>
  );
};

export const LightTheme = () => {
  return (
    <MemoryRouter>
      <AuraTheme initialTheme="light">
        <div style={{ padding: 'var(--spacing-xl)', backgroundColor: 'var(--colors-surface-background)', color: 'var(--colors-text-primary)', minHeight: '100vh' }}>
          <h1 style={{ fontFamily: 'var(--typography-font-family)', fontSize: 'var(--typography-sizes-heading-h1)', color: 'var(--colors-text-primary)'}}>Aura Light Theme</h1>
          <ThemeAwareComponent />
          <h2 style={{ marginTop: 'var(--spacing-xl)', fontFamily: 'var(--typography-font-family)', fontSize: 'var(--typography-sizes-heading-h2)', color: 'var(--colors-text-primary)' }}>All Tokens (Light Mode):</h2>
          <ViewTokens />
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const DarkTheme = () => {
  return (
    <MemoryRouter>
      <AuraTheme initialTheme="dark">
        <div style={{ padding: 'var(--spacing-xl)', backgroundColor: 'var(--colors-surface-background)', color: 'var(--colors-text-primary)', minHeight: '100vh' }}>
          <h1 style={{ fontFamily: 'var(--typography-font-family)', fontSize: 'var(--typography-sizes-heading-h1)', color: 'var(--colors-text-primary)'}}>Aura Dark Theme</h1>
          <ThemeAwareComponent />
          <h2 style={{ marginTop: 'var(--spacing-xl)', fontFamily: 'var(--typography-font-family)', fontSize: 'var(--typography-sizes-heading-h2)', color: 'var(--colors-text-primary)' }}>All Tokens (Dark Mode):</h2>
          <ViewTokens />
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const ThemeWithOverrides = () => {
  const customOverrides: AuraThemeOverrides = {
    colors: {
      primary: {
        default: '#FF69B4', // Hot Pink
        hover: '#FF1493',   // Deep Pink
        active: '#C71585',  // Medium Violet Red
      },
      text: {
        primary: '#1E90FF', // Dodger Blue for primary text
        inverse: '#FFFFFF !important', // Ensure inverse text is white for the overridden pink button
      },
      surface: {
        background: '#F0F8FF', // AliceBlue background
        primary: '#E6E6FA' // Lavender surface for DemoBox
      }
    },
    borders: {
      radius: {
        container: '24px', // More rounded containers
        button: '30px',    // Pill-shaped buttons
      },
      default: {
        color: '#FF69B4' // Pink borders
      }
    },
    typography: {
      fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
      sizes: {
        heading: {
          h1: '36px' // Larger H1
        }
      }
    },
    spacing: {
      default: '10px', // Slightly larger default spacing
      large: '20px',
    }
  };

  return (
    <MemoryRouter>
      <AuraTheme initialTheme="light" overrides={customOverrides}>
        <div style={{ padding: 'var(--spacing-xl)', backgroundColor: 'var(--colors-surface-background)', color: 'var(--colors-text-primary)', minHeight: '100vh' }}>
          <h1 style={{ fontFamily: 'var(--typography-font-family)', fontSize: 'var(--typography-sizes-heading-h1)', color: 'var(--colors-text-primary)' }}>
            Aura Theme with Overrides
          </h1>
          <p style={{ fontFamily: 'var(--typography-font-family)', color: 'var(--colors-text-secondary)'}}>
            This composition demonstrates overriding specific tokens. Primary color should be pink, font Comic Sans, etc.
          </p>
          <ThemeAwareComponent />
          <h2 style={{ marginTop: 'var(--spacing-xl)', fontFamily: 'var(--typography-font-family)', fontSize: 'var(--typography-sizes-heading-h2)', color: 'var(--colors-text-primary)' }}>
            All Tokens (with overrides):
          </h2>
          <ViewTokens />
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};