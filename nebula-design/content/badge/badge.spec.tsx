import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge.js';
import styles from './badge.module.scss';

describe('Badge Component', () => {
  it('should render the badge with the correct label', () => {
    const label = 'Test Badge';
    render(<Badge label={label} />);
    const badgeElement = screen.getByText(label);
    expect(badgeElement).toBeInTheDocument();
  });

  it('should apply the correct variant class', () => {
    const label = 'Test Badge';
    render(<Badge label={label} variant="outline" />);
    const badgeElement = screen.getByText(label).closest('span');
    expect(badgeElement).toHaveClass(styles.outlineVariant);
  });

  it('should apply the correct size class', () => {
    const label = 'Test Badge';
    render(<Badge label={label} size="large" />);
    const badgeElement = screen.getByText(label).closest('span');
    expect(badgeElement).toHaveClass(styles.largeSize);
  });
});