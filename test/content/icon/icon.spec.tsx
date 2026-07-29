import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Icon } from './icon.js';
import styles from './icon.module.scss';

describe('Icon Component', () => {
  it('should render the icon with default size and color', () => {
    const { container } = render(
      <MemoryRouter>
        <Icon>
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </Icon>
      </MemoryRouter>
    );
    const svgElement = container.querySelector('svg');
    expect(svgElement).toBeInTheDocument();
    expect(svgElement).toHaveAttribute('width', '24px');
    expect(svgElement).toHaveAttribute('height', '24px');
    expect(svgElement).toHaveAttribute('fill', 'currentColor');
  });

  it('should handle onClick event', () => {
    const onClick = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <Icon onClick={onClick} title="Clickable Icon">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </Icon>
      </MemoryRouter>
    );
    const svgElement = container.querySelector('svg');
    fireEvent.click(svgElement as Element);
    expect(onClick).toHaveBeenCalled();
  });

  it('should render with custom size and color', () => {
    const { container } = render(
      <MemoryRouter>
        <Icon size={32} color="blue">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </Icon>
      </MemoryRouter>
    );
    const svgElement = container.querySelector('svg');
    expect(svgElement).toBeInTheDocument();
    expect(svgElement).toHaveAttribute('width', '32px');
    expect(svgElement).toHaveAttribute('height', '32px');
    expect(svgElement).toHaveAttribute('fill', 'blue');
  });

  it('should apply clickable style when onClick is provided', () => {
    const { container } = render(
      <MemoryRouter>
        <Icon onClick={() => {}} title="Clickable Icon">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </Icon>
      </MemoryRouter>
    );
    const svgElement = container.querySelector('svg');
    expect(svgElement).toHaveClass(styles.icon);
    expect(svgElement).toHaveClass(styles.clickable);
  });

  it('should have title and role attributes for accessibility when title is provided', () => {
    const { container } = render(
      <MemoryRouter>
        <Icon title="Test Icon">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </Icon>
      </MemoryRouter>
    );
    const svgElement = container.querySelector('svg');
    expect(svgElement).toHaveAttribute('role', 'img');
    expect(svgElement).toHaveAttribute('aria-label', 'Test Icon');
  });
});