import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Tooltip } from './tooltip.js';
import styles from './tooltip.module.scss';

describe('Tooltip Component', () => {
  it('should display the tooltip on mouse enter', () => {
    const content = 'Test tooltip content';
    const { container } = render(
      <MemoryRouter>
        <Tooltip content={content}>
          <button>Hover me</button>
        </Tooltip>
      </MemoryRouter>
    );

    const button = container.querySelector('button');
    fireEvent.mouseEnter(button as Element);

    const tooltipContent = container.querySelector(`.${styles.tooltipContent}`);
    expect(tooltipContent).toBeVisible();
    expect(tooltipContent).toHaveTextContent(content);
  });

  it('should hide the tooltip on mouse leave', () => {
    const content = 'Test tooltip content';
    const { container } = render(
      <MemoryRouter>
        <Tooltip content={content}>
          <button>Hover me</button>
        </Tooltip>
      </MemoryRouter>
    );

    const button = container.querySelector('button');
    fireEvent.mouseEnter(button as Element);

    let tooltipContent = container.querySelector(`.${styles.tooltipContent}`);
    expect(tooltipContent).toBeVisible();

    fireEvent.mouseLeave(button as Element);
    tooltipContent = container.querySelector(`.${styles.tooltipContent}`);
    expect(tooltipContent).not.toHaveClass(styles.visible);
  });

  it('should display the tooltip on focus and hide on blur', () => {
    const content = 'Test tooltip content';
    const { container } = render(
      <MemoryRouter>
        <Tooltip content={content}>
          <button>Focus me</button>
        </Tooltip>
      </MemoryRouter>
    );

    const button = container.querySelector('button');
    fireEvent.focus(button as Element);

    let tooltipContent = container.querySelector(`.${styles.tooltipContent}`);
    expect(tooltipContent).toBeVisible();

    fireEvent.blur(button as Element);
    tooltipContent = container.querySelector(`.${styles.tooltipContent}`);
    expect(tooltipContent).not.toHaveClass(styles.visible);
  });
});