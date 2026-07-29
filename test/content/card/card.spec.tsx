import React from 'react';
import { render, screen } from '@testing-library/react';
import { Card } from './card.js';
import styles from './card.module.scss';

describe('Card Component', () => {
  it('should render children content', () => {
    const { container } = render(
      <Card>
        <div>Test Content</div>
      </Card>
    );
    expect(container.querySelector(`.${styles.bodySection}`)).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should render title if provided', () => {
    render(<Card title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should apply interactive styles when interactive is true', () => {
    const { container } = render(<Card interactive />);
    expect(container.querySelector(`.${styles.interactiveState}`)).toBeInTheDocument();
  });

  it('should apply custom styles', () => {
    const customStyle = { backgroundColor: 'red', color: 'blue' };
    const { container } = render(<Card style={customStyle} />);
    // The test environment may compute color values, e.g., 'red' to 'rgb(255, 0, 0)'
    // We check against the computed value as indicated by the original error.
    expect(container.firstChild).toHaveStyle('background-color: rgb(255, 0, 0);');
    expect(container.firstChild).toHaveStyle('color: rgb(0, 0, 255);');
  });
});