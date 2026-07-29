import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Button } from './button.js';
import styles from './button.module.scss';

describe('Button Component', () => {
  it('renders a button with the correct text', () => {
    const { container } = render(<Button>Click me</Button>);
    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe('Click me');
  });

  it('calls onClick handler when clicked', () => {
    const onClick = vi.fn();
    const { container } = render(<Button onClick={onClick}>Click me</Button>);
    const button = container.querySelector('button');
    fireEvent.click(button as Element);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a disabled button when disabled prop is true', () => {
    const { container } = render(<Button disabled>Click me</Button>);
    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button?.classList.contains(styles.disabled)).toBe(true);
  });

  it('renders a link when href prop is provided', () => {
    const { container } = render(
      <MemoryRouter>
        <Button href="/test">Click me</Button>
      </MemoryRouter>
    );
    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/test');
  });

  it('applies the correct appearance class', () => {
    const { container } = render(<Button appearance="primary">Click me</Button>);
    const button = container.querySelector('button');
    expect(button?.classList.contains(styles.primary)).toBe(true);
  });
});