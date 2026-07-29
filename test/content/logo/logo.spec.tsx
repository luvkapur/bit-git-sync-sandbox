import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Logo } from './logo.js';
import styles from './logo.module.scss';

describe('Logo Component', () => {
  it('should render the default logo with name and slogan', () => {
    render(
      <MemoryRouter>
        <Logo slogan="Your Trusted Partner" />
      </MemoryRouter>
    );

    const linkElement = screen.getByRole('link', { name: /Acme Your Trusted Partner homepage/i });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', '/');

    expect(within(linkElement).getByText('Acme')).toBeInTheDocument();
    expect(within(linkElement).getByText('Your Trusted Partner')).toBeInTheDocument();
    expect(linkElement.querySelector(`.${styles.svgContainer}`)).toBeInTheDocument();
  });

  it('should render a custom logo with name and link', () => {
    render(
      <MemoryRouter>
        <Logo name="Nova Corp" href="/nova-corp" />
      </MemoryRouter>
    );

    const linkElement = screen.getByRole('link', { name: /Nova Corp homepage/i });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', '/nova-corp');

    expect(within(linkElement).getByText('Nova Corp')).toBeInTheDocument();
    expect(within(linkElement).queryByText(/.+/i, { selector: `.${styles.slogan}` })).not.toBeInTheDocument(); // Slogan should not be present
    expect(linkElement.querySelector(`.${styles.svgContainer}`)).toBeInTheDocument();
  });

  it('should render only the SVG logo in minimal mode', () => {
    render(
      <MemoryRouter>
        <Logo name="Acme Minimal" minimal />
      </MemoryRouter>
    );

    const linkElement = screen.getByRole('link', { name: /Acme Minimal/i });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', '/');
    
    expect(linkElement.querySelector(`.${styles.svgContainer}`)).toBeInTheDocument();
    expect(linkElement.querySelector(`.${styles.textContainer}`)).not.toBeInTheDocument();
  });

  it('should apply custom className and style', () => {
    const customClassName = 'my-custom-logo';
    const customStyle = { opacity: 0.5 };
    render(
      <MemoryRouter>
        <Logo className={customClassName} style={customStyle} />
      </MemoryRouter>
    );

    const linkElement = screen.getByRole('link');
    expect(linkElement).toHaveClass(customClassName);
    expect(linkElement).toHaveStyle('opacity: 0.5');
  });

  it('should use custom svgLogo when provided', () => {
    const CustomSvg = () => <svg data-testid="custom-svg" />;
    render(
      <MemoryRouter>
        <Logo svgLogo={CustomSvg} />
      </MemoryRouter>
    );
    expect(screen.getByTestId('custom-svg')).toBeInTheDocument();
  });
});