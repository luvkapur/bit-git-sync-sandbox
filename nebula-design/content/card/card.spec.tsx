import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Card } from './card.js';
import styles from './card.module.scss';

describe('Card Component', () => {
  it('should render a card with a title', () => {
    const { container } = render(
      <MemoryRouter>
        <Card title="Test Card">
          <p>Test Content</p>
        </Card>
      </MemoryRouter>
    );
    const titleElement = container.querySelector(`.${styles.titleElement}`);
    expect(titleElement).toBeInTheDocument();
    expect((titleElement as HTMLElement).textContent).toBe("Test Card");
  });

  it('should render a card with children content', () => {
    const { container } = render(
      <MemoryRouter>
        <Card>
          <p>Test Content</p>
        </Card>
      </MemoryRouter>
    );
    const contentElement = container.querySelector(`.${styles.bodySection}`);
    expect(contentElement).toBeInTheDocument();
    expect((contentElement as HTMLElement).textContent).toBe("Test Content");
  });

  it('should apply the interactive class when interactive prop is true', () => {
    const { container } = render(
      <MemoryRouter>
        <Card interactive>
          <p>Test Content</p>
        </Card>
      </MemoryRouter>
    );
    const cardElement = container.querySelector(`.${styles.card}`);
    expect(cardElement).toHaveClass(styles.interactiveState);
  });
});