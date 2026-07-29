import React from 'react';
import { render, screen } from '@testing-library/react';
import { Heading } from './heading.js';
import styles from './heading.module.scss';
import { MemoryRouter } from 'react-router-dom';

describe('Heading Component', () => {
  it('should render a heading with the correct semantic level', () => {
    render(
      <MemoryRouter>
        <Heading level={2}>Test Heading</Heading>
      </MemoryRouter>
    );
    const headingElement = screen.getByRole('heading', { name: 'Test Heading' });
    expect(headingElement).toBeInTheDocument();
    expect(headingElement.tagName).toBe('H2');
  });

  it('should apply the correct visual style based on visualLevel', () => {
    render(
      <MemoryRouter>
        <Heading level={1} visualLevel={3}>
          Test Heading
        </Heading>
      </MemoryRouter>
    );
    const headingElement = screen.getByRole('heading', { name: 'Test Heading' });
    expect(headingElement).toBeInTheDocument();
    expect(headingElement.classList.contains(styles.h3Style)).toBe(true);
  });

  it('should apply additional class names', () => {
    render(
      <MemoryRouter>
        <Heading level={1} className="custom-class">
          Test Heading
        </Heading>
      </MemoryRouter>
    );
    const headingElement = screen.getByRole('heading', { name: 'Test Heading' });
    expect(headingElement).toBeInTheDocument();
    expect(headingElement.classList.contains('custom-class')).toBe(true);
  });
});