import React from 'react';
import { render, screen } from '@testing-library/react';
import { Flex } from './flex.js';
import styles from './flex.module.scss';
import { MemoryRouter } from 'react-router-dom';

describe('Flex Component', () => {
  it('should render children within a flex container', () => {
    const { container } = render(
      <MemoryRouter>
        <Flex>
          <div>Child 1</div>
          <div>Child 2</div>
        </Flex>
      </MemoryRouter>
    );

    expect(container.querySelector(`.${styles.flex}`)).toBeInTheDocument();
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });

  it('should apply custom class names', () => {
    const customClass = 'custom-flex';
    const { container } = render(
      <MemoryRouter>
        <Flex className={customClass}>
          <div>Content</div>
        </Flex>
      </MemoryRouter>
    );
    const flexElement = container.querySelector(`.${styles.flex}`) as HTMLElement;
    expect(flexElement).toHaveClass(customClass);
  });

  it('should apply custom styles', () => {
    const customStyle = { backgroundColor: 'red', color: 'white' };
    const { container } = render(
      <MemoryRouter>
        <Flex style={customStyle}>
          <div>Content</div>
        </Flex>
      </MemoryRouter>
    );
    const flexElement = container.querySelector(`.${styles.flex}`) as HTMLElement;
    expect(flexElement).toHaveStyle('background-color: red');
    expect(flexElement).toHaveStyle('color: white');
  });
});