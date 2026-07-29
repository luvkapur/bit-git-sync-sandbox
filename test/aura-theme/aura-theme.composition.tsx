import { useTheme } from './aura-theme-provider.js';
import { AuraTheme } from './aura-theme.js';
import { TokenViewer } from '@bitdesign/sparks.sparks-theme';
import { useThemeController } from './theme-controller.js';
import { CSSProperties, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

// Define a simple styled box component for demonstration
const DemoBox = ({ style, children }: { style?: CSSProperties, children?: ReactNode }) => (
  <div
    style={{
      padding: '20px',
      margin: '10px 0',
      border: '1px solid var(--colors-border-default)',
      borderRadius: 'var(--borders-radius-container)',
      backgroundColor: 'var(--colors-surface-primary)',
      color: 'var(--colors-text-primary)',
      fontFamily: 'var(--typography-font-family)',
      ...style
    }}
  >
    {children}
  </div>
);

const ThemeAwareComponent = () => {
  const theme = useTheme(); // Access all tokens
  const { themeMode, toggleTheme, setThemeMode } = useThemeController(); // Access theme mode and controllers

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <DemoBox>
        <p>Current Theme Mode: <strong>{themeMode}</strong></p>
        <p style={{ color: 'var(--colors-text-interactive-default)' }}>This text uses interactive default color.</p>
        <p style={{ color: 'var(--colors-text-status-success)' }}>This text uses status success color.</p>
        <p style={{ fontFamily: 'var(--typography-font-family)'}}>
          This text uses the theme's default font family ({theme.typography?.fontFamily}).
        </p>
        <p>Container border radius: {theme.borders?.radius?.container}</p>
      </DemoBox>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
            onClick={toggleTheme}
            style={{
                padding: '10px 15px',
                backgroundColor: 'var(--colors-primary-default)',
                color: 'var(--colors-text-inverse)',
                border: 'none',
                borderRadius: 'var(--borders-radius-medium)',
                cursor: 'var(--interactions-cursor-pointer)'
            }}
        >
          Toggle Theme (Light/Dark)
        </button>
        <button
            onClick={() => setThemeMode('light')}
            style={{
                padding: '10px 15px',
                backgroundColor: 'var(--colors-secondary-default)',
                color: 'var(--colors-text-primary)',
                border: '1px solid var(--colors-border-default)',
                borderRadius: 'var(--borders-radius-medium)',
                cursor: 'var(--interactions-cursor-pointer)'
            }}
        >
          Set Light Theme
        </button>
        <button
            onClick={() => setThemeMode('dark')}
            style={{
                padding: '10px 15px',
                backgroundColor: 'var(--colors-secondary-default)',
                color: 'var(--colors-text-primary)',
                border: '1px solid var(--colors-border-default)',
                borderRadius: 'var(--borders-radius-medium)',
                cursor: 'var(--interactions-cursor-pointer)'
            }}
        >
          Set Dark Theme
        </button>
      </div>
    </div>
  );
};


function ViewTokens() {
  const theme = useTheme();
  return <TokenViewer theme={theme} />;
}

export const LightTheme = () => {
  return (
    <MemoryRouter>
      <AuraTheme initialTheme="light">
        <div style={{ padding: '20px', backgroundColor: 'var(--colors-surface-background)', color: 'var(--colors-text-primary)'}}>
          <h1>Aura Light Theme</h1>
          <ThemeAwareComponent />
          <h2 style={{ marginTop: '30px' }}>All Tokens:</h2>
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
        <div style={{ padding: '20px', backgroundColor: 'var(--colors-surface-background)', color: 'var(--colors-text-primary)'}}>
          <h1>Aura Dark Theme</h1>
          <ThemeAwareComponent />
          <h2 style={{ marginTop: '30px' }}>All Tokens:</h2>
          <ViewTokens />
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const ThemeWithOverrides = () => {
  const customOverrides = {
    colors: {
      primary: {
        default: '#FF69B4', // Hot Pink
        hover: '#FF85C7',
        active: '#E650A1',
      },
      text: {
        primary: '#1E90FF', // Dodger Blue
      },
      surface: {
        background: '#333333',
      }
    },
    borders: {
      radius: {
        container: '24px',
      },
    },
    typography: {
      fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
    },
  };

  return (
    <MemoryRouter>
      <AuraTheme initialTheme="light" overrides={customOverrides}>
        <div style={{ padding: '20px', backgroundColor: 'var(--colors-surface-background)', color: 'var(--colors-text-primary)' }}>
          <h1>Aura Theme with Overrides (Light Mode Base)</h1>
          <p>This composition demonstrates overriding specific tokens of the Aura theme.</p>
          <DemoBox>
            <p>Primary Color should be Hot Pink.</p>
            <p>Text Primary color should be Dodger Blue.</p>
            <p>Container border radius should be 24px.</p>
            <p style={{ fontFamily: 'var(--typography-font-family)' }}>Font family should be Comic Sans MS.</p>
          </DemoBox>
          <ThemeAwareComponent />
          <h2 style={{ marginTop: '30px' }}>All Tokens (with overrides):</h2>
          <ViewTokens />
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};