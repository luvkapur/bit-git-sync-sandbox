import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { useThemeController, useTheme, AuraThemeOverrides } from '@luvktest/test.aura-theme';
import { NebulaTheme } from './nebula-theme.js';

// DemoBox and ThemeAwareComponent for demonstration purposes
const DemoBox: React.FC<{ style?: React.CSSProperties, children?: React.ReactNode }> = ({ style, children }) => (
  <div
    style={{
      padding: 'var(--spacing-m)', 
      margin: 'var(--spacing-s) 0',
      border: '1px solid var(--colors-border-default)',
      borderRadius: 'var(--borders-radius-container)',
      backgroundColor: 'var(--colors-surface-primary)',
      color: 'var(--colors-text-primary)',
      fontFamily: 'var(--typography-font-family)',
      boxShadow: 'var(--shadows-medium)',
      ...style,
    }}
  >
    {children}
  </div>
);

const ThemeAwareComponent = () => {
  const theme = useTheme(); // Access all resolved tokens (Aura + Nebula)
  const { themeMode, toggleTheme, setThemeMode } = useThemeController();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-s)' }}>
      <DemoBox>
        <p>Current Aura Theme Mode: <strong>{themeMode}</strong></p>
        <p style={{ color: 'var(--colors-primary-default)' }}>This text uses Nebula's primary/accent color (var(--colors-primary-default)).</p>
        <p style={{ color: 'var(--colors-status-positive-default)' }}>This text uses Nebula's status success color (var(--colors-status-positive-default)).</p>
        <p style={{ fontFamily: 'var(--typography-font-family)'}}>
          Resolved Font family: {theme.typography?.fontFamily}. (set by var(--typography-font-family))
        </p>
        <p>Resolved Container border radius: {theme.borders?.radius?.container}. (set by var(--borders-radius-container))</p>
        <p>Resolved Primary color token: {theme.colors?.primary?.default}.</p>
        <div style={{backgroundColor: 'var(--colors-surface-primary)', padding: 'var(--spacing-x4, 4px)', marginTop: 'var(--spacing-x4, 4px)'}}>
          Container Content Background (var(--colors-surface-primary)): Shows effect of 'color-background-container-content'.
        </div>
        <div style={{borderTop: `1px solid var(--colors-border-default)`, marginTop: 'var(--spacing-x4, 4px)', paddingTop: 'var(--spacing-x4, 4px)'}}>
          Container Top Border (var(--colors-border-default)): Shows effect of 'color-border-container-top'.
        </div>
      </DemoBox>
      <div style={{ display: 'flex', gap: 'var(--spacing-s)', flexWrap: 'wrap' }}>
        <button
          onClick={toggleTheme}
          style={{
            padding: 'var(--spacing-s) var(--spacing-m)',
            backgroundColor: 'var(--colors-primary-default)',
            color: 'var(--colors-text-inverse) !important',
            border: 'none',
            borderRadius: 'var(--borders-radius-medium)',
            cursor: 'var(--interactions-cursor-pointer)',
            fontFamily: 'var(--typography-font-family)',
          }}
        >
          Toggle Aura Base Theme (Light/Dark)
        </button>
        <button 
          onClick={() => setThemeMode('light')} 
          style={{ 
            padding: 'var(--spacing-s)', 
            fontFamily: 'var(--typography-font-family)',
            backgroundColor: 'var(--colors-surface-secondary)',
            color: 'var(--colors-text-primary)',
            border: '1px solid var(--colors-border-subtle)',
            borderRadius: 'var(--borders-radius-medium)',
            cursor: 'var(--interactions-cursor-pointer)',
          }}
        >
          Set Aura Light
        </button>
        <button 
          onClick={() => setThemeMode('dark')} 
          style={{ 
            padding: 'var(--spacing-s)', 
            fontFamily: 'var(--typography-font-family)',
            backgroundColor: 'var(--colors-surface-secondary)',
            color: 'var(--colors-text-primary)',
            border: '1px solid var(--colors-border-subtle)',
            borderRadius: 'var(--borders-radius-medium)',
            cursor: 'var(--interactions-cursor-pointer)',
          }}
        >
          Set Aura Dark
        </button>
      </div>
    </div>
  );
};


// Base Nebula Theme (default values, inheriting Aura's dark mode)
export const BaseNebulaTheme = () => (
  <MemoryRouter>
    <NebulaTheme>
      <div style={{ padding: 'var(--spacing-l)', minHeight: '100vh', backgroundColor: 'var(--colors-surface-background)' }}>
        <h1 style={{fontFamily: 'var(--typography-font-family)', color: 'var(--colors-text-primary)'}}>Nebula Theme (Defaults on Aura Dark)</h1>
        <ThemeAwareComponent />
      </div>
    </NebulaTheme>
  </MemoryRouter>
);

// Nebula Theme with Light mode from Aura, Nebula tokens still applied over Aura's light
export const LightModeNebulaTheme = () => (
  <MemoryRouter>
    <NebulaTheme initialTheme="light">
      <div style={{ padding: 'var(--spacing-l)', minHeight: '100vh', backgroundColor: 'var(--colors-surface-background)' }}>
        <h1 style={{fontFamily: 'var(--typography-font-family)', color: 'var(--colors-text-primary)'}}>Nebula Theme (Applied on Aura Light Mode)</h1>
        <ThemeAwareComponent />
      </div>
    </NebulaTheme>
  </MemoryRouter>
);


// Nebula Theme with specific runtime token overrides
export const OverriddenNebulaTheme = () => {
  const runtimeOverrides: AuraThemeOverrides = {
    colors: {
      primary: {
        default: '#FF69B4', // Hot Pink
      },
      text: { 
        primary: '#FFF0F5', // LavenderBlush 
      },
      status: { // Moved from text to status, and mapped success to positive
        positive: { default: '#32CD32' } // LimeGreen
      },
      surface: {
        background: '#36013F', // Dark Purple
        primary: '#590259', // Darker Purple for content containers
      },
      border: {
        default: '#FF69B4', // Hot Pink border
      }
    },
    typography: {
      fontFamily: "'Courier New', Courier, monospace",
    },
    borders: {
      radius: {
        container: '12px', // More rounded
      }
    }
  };

  return (
    <MemoryRouter>
      <NebulaTheme overrides={runtimeOverrides}>
        <div style={{ padding: 'var(--spacing-l)', minHeight: '100vh', backgroundColor: 'var(--colors-surface-background)' }}>
          <h1 style={{fontFamily: 'var(--typography-font-family)', color: 'var(--colors-text-primary)'}}>Nebula Theme with Runtime Overrides</h1>
          <p style={{fontFamily: 'var(--typography-font-family)', color: 'var(--colors-text-secondary)'}}>
            This composition demonstrates overriding specific Nebula/Aura tokens at runtime. 
            Primary color should be Hot Pink, font Courier New, success status LimeGreen.
          </p>
          <ThemeAwareComponent />
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};