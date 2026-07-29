import React from 'react';
import { render, screen } from '@testing-library/react';
import { Spinner } from './spinner.js';
import styles from './spinner.module.scss';

describe('Spinner', () => {
  it('should render the spinner with default props', () => {
    render(<Spinner />);
    const spinnerElement = screen.getByRole('status');
    expect(spinnerElement).toBeInTheDocument();
    expect(spinnerElement).toHaveClass(styles.spinner);
    expect(spinnerElement).toHaveStyle({
      '--spinner-size': '24px',
      '--spinner-thickness': '3px',
    });

    const visuallyHiddenText = screen.getByText('Loading...');
    expect(visuallyHiddenText).toBeInTheDocument();
    expect(visuallyHiddenText).toHaveClass(styles.visuallyHidden);
  });

  it('should render the spinner with custom size and thickness', () => {
    const size = 48;
    const thickness = 6;
    render(<Spinner size={size} thickness={thickness} />);
    const spinnerElement = screen.getByRole('status');
    expect(spinnerElement).toBeInTheDocument();
    expect(spinnerElement).toHaveClass(styles.spinner);
    expect(spinnerElement).toHaveStyle({
      '--spinner-size': `${size}px`,
      '--spinner-thickness': `${thickness}px`,
    });
  });

  it('should render the spinner with custom colors', () => {
    const color = 'var(--colors-status-positive-default)';
    const trackColor = 'var(--colors-status-positive-subtle)';
    render(<Spinner color={color} trackColor={trackColor} />);
    const spinnerElement = screen.getByRole('status');
    expect(spinnerElement).toBeInTheDocument();
    expect(spinnerElement).toHaveClass(styles.spinner);
    expect(spinnerElement).toHaveStyle({
      '--spinner-size': '24px', // Default size
      '--spinner-thickness': '3px', // Default thickness
      '--spinner-color': color,
      '--spinner-track-color': trackColor,
    });
  });
});