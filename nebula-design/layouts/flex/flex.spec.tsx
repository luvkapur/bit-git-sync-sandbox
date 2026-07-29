import React from 'react';
import { render } from '@testing-library/react';
import { Flex } from './flex.js';
import styles from './flex.module.scss';

describe('Flex', () => {
  it('should render children', () => {
    const { container } = render(
      <Flex>
        <div>Child 1</div>
        <div>Child 2</div>
      </Flex>
    );

    expect(container.querySelector('div:first-child')?.textContent).toBe('Child 1');
    expect(container.querySelector('div:last-child')?.textContent).toBe('Child 2');
  });

  it('should apply flexDirection style', () => {
    const { container } = render(<Flex flexDirection="column" />);
    expect(container.firstChild).toHaveStyle('flex-direction: column;');
  });

  it('should apply the flex class', () => {
    const { container } = render(<Flex />);
    expect(container.firstChild).toHaveClass(styles.flex);
  });
});