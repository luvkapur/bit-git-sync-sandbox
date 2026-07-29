import React from 'react';
import { render, screen } from '@testing-library/react';
import { Tabs } from './tabs.js';
import styles from './tabs.module.scss';

describe('Tabs Component', () => {
  it('should render children within the Tabs component', () => {
    const { container } = render(
      <Tabs>
        <div>Content inside Tabs</div>
      </Tabs>
    );

    expect(container.querySelector(`.${styles.tabsContainer}`)).toBeInTheDocument();
    expect(screen.getByText('Content inside Tabs')).toBeInTheDocument();
  });

  it('should render a title when the title prop is provided', () => {
    const titleText = 'My Tab Title';
    const { container } = render(<Tabs title={titleText}>Content</Tabs>);
    const titleElement = container.querySelector(`.${styles.title}`);

    expect(titleElement).toBeInTheDocument();
    expect(titleElement?.textContent).toBe(titleText);
  });

  it('should apply the minimal variant class when variant is set to "minimal"', () => {
    const { container } = render(<Tabs variant="minimal">Content</Tabs>);

    expect(container.querySelector(`.${styles.minimalVariant}`)).toBeInTheDocument();
  });
});