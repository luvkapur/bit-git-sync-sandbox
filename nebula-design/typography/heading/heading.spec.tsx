import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Heading } from './heading.js';
import styles from './heading.module.scss';

describe('Heading Component', () => {
  it('should render a Heading with the correct level', () => {
    const { container } = render(
      <MemoryRouter>
        <Heading level={1}>Test Heading</Heading>
      </MemoryRouter>
    );
    const headingElement = container.querySelector('h1');
    expect(headingElement).toBeInTheDocument();
    expect(headingElement).toHaveTextContent('Test Heading');
  });

  it('should apply the baseHeading and level styles', () => {
    const { container } = render(
      <MemoryRouter>
        <Heading level={2}>Another Heading</Heading>
      </MemoryRouter>
    );
    const headingElement = container.querySelector('h2');
    expect(headingElement).toHaveClass(styles.baseHeading);
    expect(headingElement).toHaveClass(styles.h2Style);
  });

  it('should apply custom class names', () => {
    const { container } = render(
      <MemoryRouter>
        <Heading level={3} className="custom-class">
          Custom Heading
        </Heading>
      </MemoryRouter>
    );
    const headingElement = container.querySelector('h3');
    expect(headingElement).toHaveClass('custom-class');
  });
});