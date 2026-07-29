import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Paragraph } from './paragraph.js';
import styles from './paragraph.module.scss';

describe('Paragraph Component', () => {
  it('should render a paragraph with default props', () => {
    const { container } = render(
      <MemoryRouter>
        <Paragraph>This is a paragraph.</Paragraph>
      </MemoryRouter>
    );
    const paragraphElement = container.querySelector('p');
    expect(paragraphElement).toBeInTheDocument();
    expect(paragraphElement).toHaveClass(styles.paragraph);
    expect(paragraphElement).toHaveTextContent('This is a paragraph.');
  });

  it('should render a paragraph with a custom element', () => {
    const { container } = render(
      <MemoryRouter>
        <Paragraph element="div">This is a div.</Paragraph>
      </MemoryRouter>
    );
    const divElement = container.querySelector('div');
    expect(divElement).toBeInTheDocument();
    // The component renders the element itself as a div, and that div should have the .paragraph class
    // The original querySelector('div') might pick up the MemoryRouter's div if not specific enough.
    // Let's ensure we are targeting the component's rendered element.
    const componentElement = container.firstChild as HTMLElement; // Assuming Paragraph is the direct child
    expect(componentElement.tagName).toBe('DIV');
    expect(componentElement).toHaveClass(styles.paragraph);
    expect(componentElement).toHaveTextContent('This is a div.');
  });

  it('should render a paragraph with custom class name', () => {
    const customClassName = 'custom-class';
    const { container } = render(
      <MemoryRouter>
        <Paragraph className={customClassName}>This is a paragraph with a custom class.</Paragraph>
      </MemoryRouter>
    );
    const paragraphElement = container.querySelector('p');
    expect(paragraphElement).toBeInTheDocument();
    expect(paragraphElement).toHaveClass(styles.paragraph);
    expect(paragraphElement).toHaveClass(customClassName);
    expect(paragraphElement).toHaveTextContent('This is a paragraph with a custom class.');
  });

  it('should apply custom inline styles', () => {
    const customStyle = { backgroundColor: 'red', color: 'blue', fontSize: '18px' };
    const { getByText } = render(
      <MemoryRouter>
        <Paragraph style={customStyle}>Styled paragraph</Paragraph>
      </MemoryRouter>
    );
    const paragraphElement = getByText('Styled paragraph');
    expect(paragraphElement).toBeInTheDocument();
    // Browsers often convert named colors to rgb() format.
    expect(paragraphElement).toHaveStyle('background-color: rgb(255, 0, 0)'); // red
    expect(paragraphElement).toHaveStyle('color: rgb(0, 0, 255)'); // blue
    expect(paragraphElement).toHaveStyle('font-size: 18px');
  });
});