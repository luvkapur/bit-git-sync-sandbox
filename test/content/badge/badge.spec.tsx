import React from 'react';
import { render } from '@testing-library/react';
import { Badge } from './badge.js';
import styles from './badge.module.scss';

describe('Badge Component', () => {
  it('should render the badge with the provided label', () => {
    const { getByText } = render(<Badge label="Test Badge" />);
    const rendered = getByText('Test Badge');
    expect(rendered).toBeTruthy();
  });

  it('should apply the correct variant class', () => {
    const { container } = render(<Badge label="Test Badge" variant="outline" />);
    const badgeElement = container.querySelector(`.${styles.badge}`);
    expect(badgeElement).toHaveClass(styles.outlineVariant);
  });

  it('should apply the correct size class', () => {
    const { container } = render(<Badge label="Test Badge" size="large" />);
    const badgeElement = container.querySelector(`.${styles.badge}`);
    expect(badgeElement).toHaveClass(styles.largeSize);
  });

  it('should apply custom styles for solid variant with custom color', () => {
    const { container } = render(<Badge label="Custom Solid" variant="solid" color="red" />);
    const badgeElement = container.querySelector(`.${styles.badge}`);
    expect(badgeElement).toHaveStyle('background-color: rgb(255, 0, 0)');
  });

  it('should apply custom styles for outline variant with custom color', () => {
    const { container } = render(<Badge label="Custom Outline" variant="outline" color="blue" />);
    const badgeElement = container.querySelector(`.${styles.badge}`);
    expect(badgeElement).toHaveStyle('border-color: rgb(0, 0, 255)');
    expect(badgeElement).toHaveStyle('color: rgb(0, 0, 255)');
  });

  it('should apply custom styles for ghost variant with custom color', () => {
    const { container } = render(<Badge label="Custom Ghost" variant="ghost" color="green" />);
    const badgeElement = container.querySelector(`.${styles.badge}`);
    expect(badgeElement).toHaveStyle('color: rgb(0, 128, 0)'); // 'green' is rgb(0, 128, 0)
  });

  it('should allow overriding text color for solid variant with custom background', () => {
    const customTextColor = 'rgb(0, 0, 0)'; // black
    const { container } = render(
      <Badge 
        label="Custom Solid Text" 
        variant="solid" 
        color="yellow" 
        style={{ color: customTextColor }} 
      />
    );
    const badgeElement = container.querySelector(`.${styles.badge}`);
    expect(badgeElement).toHaveStyle('background-color: rgb(255, 255, 0)'); // yellow
    expect(badgeElement).toHaveStyle(`color: ${customTextColor}`);
  });
});