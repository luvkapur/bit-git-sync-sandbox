import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Paragraph } from './paragraph.js';
import styles from './paragraph.module.scss';

describe('Paragraph', () => {
  it('should render a paragraph with default styling', () => {
    const { container } = render(
      <MemoryRouter>
        <Paragraph>This is a test paragraph.</Paragraph>
      </MemoryRouter>
    );
    const paragraphElement = container.querySelector('p');
    expect(paragraphElement).toBeInTheDocument();
    expect(paragraphElement).toHaveClass(styles.paragraph);
  });

  it('should render a paragraph with a custom element', () => {
    const { container } = render(
      <MemoryRouter>
        <Paragraph element="div">This is a test div.</Paragraph>
      </MemoryRouter>
    );
    const divElement = container.querySelector('div');
    expect(divElement).toBeInTheDocument();
    expect(divElement).toHaveClass(styles.paragraph);
  });

  it('should render a paragraph with additional classnames', () => {
    const { container } = render(
      <MemoryRouter>
        <Paragraph className="custom-class">This is a test paragraph.</Paragraph>
      </MemoryRouter>
    );
    const paragraphElement = container.querySelector('p');
    expect(paragraphElement).toBeInTheDocument();
    expect(paragraphElement).toHaveClass(styles.paragraph);
    expect(paragraphElement).toHaveClass('custom-class');
  });
});