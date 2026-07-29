import React from 'react';
import { render, screen } from '@testing-library/react';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';
import { Spinner } from './spinner.js';
import styles from './spinner.module.scss'; // To check for .visuallyHidden class

describe('Spinner', () => {
  const renderInTheme = (ui: React.ReactElement) => {
    return render(<NebulaTheme>{ui}</NebulaTheme>);
  };

  it('should render with default props', () => {
    renderInTheme(<Spinner />);
    const spinnerElement = screen.getByRole('status');
    expect(spinnerElement).toBeInTheDocument();
    expect(spinnerElement).toHaveAttribute('aria-label', 'Loading');
    expect(spinnerElement).toHaveStyle('--spinner-size: 24px');
    expect(spinnerElement).toHaveStyle('--spinner-thickness: 3px');
    expect(spinnerElement).toHaveStyle('--spinner-color: var(--colors-primary-default, currentColor)');
    expect(spinnerElement).toHaveStyle('--spinner-track-color: var(--colors-border-default, transparent)');
  });

  it('should render with custom size and thickness', () => {
    renderInTheme(<Spinner size={32} thickness={4} />);
    const spinnerElement = screen.getByRole('status');
    expect(spinnerElement).toHaveStyle('--spinner-size: 32px');
    expect(spinnerElement).toHaveStyle('--spinner-thickness: 4px');
  });

  it('should render with custom colors', () => {
    renderInTheme(<Spinner color="red" trackColor="blue" />);
    const spinnerElement = screen.getByRole('status');
    expect(spinnerElement).toHaveStyle('--spinner-color: red');
    expect(spinnerElement).toHaveStyle('--spinner-track-color: blue');
  });

  it('should apply custom className', () => {
    renderInTheme(<Spinner className="custom-class" />);
    const spinnerElement = screen.getByRole('status');
    expect(spinnerElement).toHaveClass('custom-class');
    expect(spinnerElement).toHaveClass(styles.spinner); // Ensure default class is also present
  });

  it('should apply custom style and merge with internal styles', () => {
    renderInTheme(<Spinner style={{ margin: '10px', '--spinner-color': 'purple' } as React.CSSProperties} />);
    const spinnerElement = screen.getByRole('status');
    expect(spinnerElement).toHaveStyle('margin: 10px');
    // User-provided style for --spinner-color should override default/prop-derived if it comes after in spread
    // In the current implementation, ...style is last, so it CAN override.
    expect(spinnerElement).toHaveStyle('--spinner-color: purple');
  });
  
  it('should consistently use the default aria-label "Loading"', () => {
    renderInTheme(<Spinner />);
    const spinnerElement = screen.getByRole('status');
    expect(spinnerElement).toHaveAttribute('aria-label', 'Loading');
    // Check for the visually hidden span and its content
    const visuallyHiddenText = screen.getByText('Loading'); // This finds the span's content
    expect(visuallyHiddenText).toBeInTheDocument();
    expect(visuallyHiddenText).toHaveClass(styles.visuallyHidden); 
  });

  it('should have visually hidden text matching the default aria-label', () => {
    renderInTheme(<Spinner />);
    const spinnerElement = screen.getByRole('status');
    // More specific query for the span if multiple "Loading" texts could exist
    const visuallyHiddenSpan = spinnerElement.querySelector(`.${styles.visuallyHidden}`);
    expect(visuallyHiddenSpan).toBeInTheDocument();
    expect(visuallyHiddenSpan).toHaveTextContent('Loading');
  });
});