import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuraTheme } from './aura-theme.js';
import styles from './aura-theme.module.scss';

describe('AuraTheme', () => {
  it('renders with children', () => {
    const { container } = render(
      <MemoryRouter>
        <AuraTheme>
          <div>Hello Aura!</div>
        </AuraTheme>
      </MemoryRouter>
    );
    expect(container.querySelector('div')?.textContent).toBe('Hello Aura!');
  });

  it('applies the auraTheme class', () => {
    const { container } = render(
      <MemoryRouter>
        <AuraTheme />
      </MemoryRouter>
    );
    expect(container.firstChild).toHaveClass(styles.auraTheme);
  });

  it('renders with custom style', () => {
    const customStyle = { backgroundColor: 'red' };
    const { container } = render(
      <MemoryRouter>
        <AuraTheme style={customStyle}>Test</AuraTheme>
      </MemoryRouter>
    );
    expect(container.firstChild).toHaveStyle('background-color: red');
  });
});