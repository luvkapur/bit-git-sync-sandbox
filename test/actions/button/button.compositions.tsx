import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuraTheme } from '@luvktest/test.aura-theme';
import { Button } from './button.js';

const CompositionContainer: React.FC<{ title: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ title, children, style }) => (
  <div style={{ marginBottom: 'var(--spacing-large)', padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-primary)', borderRadius: 'var(--borders-radius-container)', ...style }}>
    <h3 style={{ fontFamily: 'var(--typography-font-family)', color: 'var(--colors-text-primary)', marginTop: 0, marginBottom: 'var(--spacing-default)' }}>
      {title}
    </h3>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-default)', alignItems: 'center' }}>
      {children}
    </div>
  </div>
);

const handleClick = (message: string) => () => {
  // In a real app, you might use a toast notification or console.log
  // For Bit compositions, alert is a simple way to show interaction.
  // eslint-disable-next-line no-alert
  alert(message);
};

export const ButtonAppearances = () => (
  <MemoryRouter>
    <AuraTheme>
      <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-background)', minHeight: '100vh' }}>
        <CompositionContainer title="Button Appearances">
          <Button appearance="primary" onClick={handleClick('Primary button clicked!')}>Primary Button</Button>
          <Button appearance="secondary" onClick={handleClick('Secondary button clicked!')}>Secondary Button</Button>
          <Button appearance="tertiary" onClick={handleClick('Tertiary button clicked!')}>Tertiary Button</Button>
        </CompositionContainer>
      </div>
    </AuraTheme>
  </MemoryRouter>
);

export const DisabledButtons = () => (
  <MemoryRouter>
    <AuraTheme>
      <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-background)', minHeight: '100vh' }}>
        <CompositionContainer title="Disabled Buttons">
          <Button appearance="primary" disabled onClick={handleClick('This should not fire')}>Primary Disabled</Button>
          <Button appearance="secondary" disabled onClick={handleClick('This should not fire')}>Secondary Disabled</Button>
          <Button appearance="tertiary" disabled onClick={handleClick('This should not fire')}>Tertiary Disabled</Button>
        </CompositionContainer>
      </div>
    </AuraTheme>
  </MemoryRouter>
);

export const LinkButtons = () => (
  <MemoryRouter initialEntries={['/buttons']}>
    <AuraTheme>
      <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-background)', minHeight: '100vh' }}>
        <CompositionContainer title="Buttons as Links">
          <Button appearance="primary" href="/buttons/internal-target" onClick={handleClick('Internal link button clicked! Navigation will occur.')}>
            Internal Link (Primary)
          </Button>
          <Button appearance="secondary" href="https://bit.dev" external onClick={handleClick('External link button clicked! New tab will open.')}>
            External Link (Secondary)
          </Button>
          <Button appearance="tertiary" href="/buttons/disabled-target" disabled onClick={handleClick('This disabled link button should not fire or navigate.')}>
            Disabled Link (Tertiary)
          </Button>
        </CompositionContainer>

        <Routes>
          <Route
            path="/buttons/internal-target"
            element={
              <div style={{ marginTop: 'var(--spacing-large)', padding: 'var(--spacing-default)', backgroundColor: 'var(--colors-surface-secondary)', color: 'var(--colors-text-primary)', borderRadius: 'var(--borders-radius-medium)' }}>
                Navigated to Internal Target Page!
              </div>
            }
          />
          <Route
            path="/buttons"
            element={
              <div style={{ marginTop: 'var(--spacing-large)', padding: 'var(--spacing-default)', color: 'var(--colors-text-secondary)' }}>
                Current path: /buttons. Click the links above to navigate.
              </div>
            }
          />
        </Routes>
      </div>
    </AuraTheme>
  </MemoryRouter>
);

export const ButtonsWithDifferentContent = () => (
  <MemoryRouter>
    <AuraTheme>
      <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-background)', minHeight: '100vh' }}>
        <CompositionContainer title="Buttons with Varied Content">
          <Button appearance="primary" onClick={handleClick('Emoji button clicked!')}>
            <span role="img" aria-label="rocket">🚀</span> Launch
          </Button>
          <Button appearance="secondary" onClick={handleClick('Icon button clicked!')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 'var(--spacing-small)'}}>
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
            </svg>
            Search
          </Button>
          <Button appearance="tertiary" onClick={handleClick('Short button clicked!')}>
            OK
          </Button>
        </CompositionContainer>
      </div>
    </AuraTheme>
  </MemoryRouter>
);