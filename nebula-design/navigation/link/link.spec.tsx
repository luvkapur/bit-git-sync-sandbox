import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Link } from './link.js';
import styles from './link.module.scss';

describe('Link Component', () => {
  it('should render a link with the correct text and apply Nebula styles', () => {
    const { container } = render(
      <MemoryRouter>
        <Link href="/test">Test Link</Link>
      </MemoryRouter>
    );

    const linkElement = container.querySelector('a');
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveTextContent('Test Link');
    expect(linkElement).toHaveClass(styles.link);
  });

  it('should navigate to the correct path when clicked (internal link)', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Link href="/target">Go to Target</Link>} />
          <Route path="/target" element={<div data-testid="target-page">Target Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    const linkElement = container.querySelector('a') as HTMLAnchorElement;
    fireEvent.click(linkElement);

    const targetPage = screen.getByTestId('target-page');
    expect(targetPage).toBeInTheDocument();
  });

  it('should handle external links with proper target and rel attributes', () => {
    const { container } = render(
      <MemoryRouter>
        <Link href="https://example.com" external>
          External Link
        </Link>
      </MemoryRouter>
    );

    const linkElement = container.querySelector('a');
    expect(linkElement).toHaveAttribute('href', 'https://example.com');
    expect(linkElement).toHaveAttribute('target', '_blank');
    expect(linkElement).toHaveAttribute('rel', 'noopener noreferrer');
  });
});