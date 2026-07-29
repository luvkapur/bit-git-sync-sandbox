import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Tooltip } from './tooltip.js';
import styles from './tooltip.module.scss';

describe('Tooltip', () => {
  it('should render tooltip content on hover', () => {
    const content = 'Test tooltip content';
    const { container, getByText } = render(
      <MemoryRouter>
        <Tooltip content={content}>
          <span>Hover me</span>
        </Tooltip>
      </MemoryRouter>
    );

    const wrapper = container.querySelector(`.${styles.tooltipWrapper}`);
    fireEvent.mouseEnter(wrapper as Element);

    const tooltipContentElement = getByText(content).closest(`.${styles.tooltipContent}`);
    expect(tooltipContentElement).toBeInTheDocument();
    expect(tooltipContentElement).toHaveTextContent(content);
  });

  it('should hide tooltip content on mouse leave', () => {
    const content = 'Test tooltip content';
    const { container, getByText } = render(
      <MemoryRouter>
        <Tooltip content={content}>
          <span>Hover me</span>
        </Tooltip>
      </MemoryRouter>
    );

    const wrapper = container.querySelector(`.${styles.tooltipWrapper}`);
    fireEvent.mouseEnter(wrapper as Element);
    
    // Tooltip should be visible
    let tooltipContentElement = getByText(content).closest(`.${styles.tooltipContent}`);
    expect(tooltipContentElement).toHaveClass(styles.visible);

    fireEvent.mouseLeave(wrapper as Element);
    
    // Re-query or check class, as element might still be in DOM but not visible
    tooltipContentElement = container.querySelector(`.${styles.tooltipContent}`);
    expect(tooltipContentElement).not.toHaveClass(styles.visible);
  });

  it('should render tooltip with custom class name', () => {
    const content = 'Test tooltip content';
    const className = 'custom-class';
    const { container } = render(
      <MemoryRouter>
        <Tooltip content={content} className={className}>
          <span>Hover me</span>
        </Tooltip>
      </MemoryRouter>
    );

    const wrapper = container.querySelector(`.${styles.tooltipWrapper}`);
    expect(wrapper).toHaveClass(className);
  });
});