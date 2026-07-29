import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { Link } from './link.js';
import styles from './link.module.scss';

describe('Link Component', () => {
  it('should render an internal link with the correct text and href', () => {
    const { container } = render(
      <MemoryRouter>
        <Link href="/test">Test Link</Link>
      </MemoryRouter>
    );

    const linkElement = container.querySelector(`.${styles.link}`) as HTMLAnchorElement;
    expect(linkElement).toBeInTheDocument();
    expect(linkElement.textContent).toBe('Test Link');
    expect(linkElement.getAttribute('href')).toBe('/test');
  });

  it('should render an external link with the correct text and href', () => {
    const { container } = render(
      <Link href="https://example.com" external>
        External Link
      </Link>
    );

    const linkElement = container.querySelector(`.${styles.link}`) as HTMLAnchorElement;
    expect(linkElement).toBeInTheDocument();
    expect(linkElement.textContent).toBe('External Link');
    expect(linkElement.getAttribute('href')).toBe('https://example.com');
    expect(linkElement.getAttribute('target')).toBe('_blank');
    expect(linkElement.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('should call onClick handler when clicked', () => {
    const onClick = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <Link href="/test" onClick={onClick}>
          Clickable Link
        </Link>
      </MemoryRouter>
    );

    const linkElement = container.querySelector(`.${styles.link}`) as HTMLAnchorElement;
    fireEvent.click(linkElement);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should apply custom class and handle computed style for background-color', () => {
    // Inject a style rule for this test
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      .test-custom-bg-red {
        background-color: red;
      }
    `;
    document.head.appendChild(styleElement);

    const { getByText } = render(
      <MemoryRouter>
        <Link href="/custom-style-test" className="test-custom-bg-red">
          Custom Background Link
        </Link>
      </MemoryRouter>
    );

    const linkElement = getByText('Custom Background Link');
    // This assertion addresses the common issue where 'red' (or other named colors) 
    // is computed as 'rgb(R, G, B)' by testing environments/browsers.
    expect(linkElement).toHaveStyle('background-color: rgb(255, 0, 0)');

    // Clean up the added style element
    document.head.removeChild(styleElement);
  });
});