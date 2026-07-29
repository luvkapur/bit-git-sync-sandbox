import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { Icon } from './icon.js';
import styles from './icon.module.scss';

describe('Icon Component', () => {
  it('renders the icon with default size and color', () => {
    const { container } = render(
      <MemoryRouter>
        <Icon>
          <path d="M12 2L2 7.71l9.43 7.71L22 7.71 12 2z" />
        </Icon>
      </MemoryRouter>
    );

    const svgElement = container.querySelector('svg');
    expect(svgElement).toBeInTheDocument();
    expect(svgElement).toHaveAttribute('width', '24');
    expect(svgElement).toHaveAttribute('height', '24');
    expect(svgElement).toHaveAttribute('fill', 'currentColor');
  });

  it('renders the icon with custom size and color', () => {
    const { container } = render(
      <MemoryRouter>
        <Icon size={32} color="var(--colors-primary-default)">
          <path d="M12 2L2 7.71l9.43 7.71L22 7.71 12 2z" />
        </Icon>
      </MemoryRouter>
    );

    const svgElement = container.querySelector('svg');
    expect(svgElement).toHaveAttribute('width', '32');
    expect(svgElement).toHaveAttribute('height', '32');
    expect(svgElement).toHaveAttribute('fill', 'var(--colors-primary-default)');
  });

  it('handles onClick event', () => {
    const onClick = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <Icon onClick={onClick}>
          <path d="M12 2L2 7.71l9.43 7.71L22 7.71 12 2z" />
        </Icon>
      </MemoryRouter>
    );

    const svgElement = container.querySelector('svg');
    fireEvent.click(svgElement as Element);
    expect(onClick).toHaveBeenCalled();
    expect(svgElement).toHaveClass(styles.clickable);
  });
});