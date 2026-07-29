import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Tabs } from './tabs.js';
import styles from './tabs.module.scss';

describe('Tabs Component', () => {
  it('should render children content', () => {
    const { container } = render(
      <MemoryRouter>
        <Tabs>
          <div>Test Content</div>
        </Tabs>
      </MemoryRouter>
    );
    expect(container.querySelector('div')).toHaveTextContent('Test Content');
  });

  it('should render title when provided', () => {
    const titleText = 'Section Title';
    const { container } = render(
      <MemoryRouter>
        <Tabs title={titleText}>
          <div>Test Content</div>
        </Tabs>
      </MemoryRouter>
    );
    const titleElement = container.querySelector(`.${styles.title}`);
    expect(titleElement).toHaveTextContent(titleText);
  });

  it('should apply minimal variant class when variant is set to "minimal"', () => {
    const { container } = render(
      <MemoryRouter>
        <Tabs variant="minimal">
          <div>Test Content</div>
        </Tabs>
      </MemoryRouter>
    );
    const tabsContainer = container.querySelector(`.${styles.tabsContainer}`);
    expect(tabsContainer).toHaveClass(styles.minimalVariant);
  });

  it('should apply custom className and style properties', () => {
    const customClassName = 'my-custom-tabs-class';
    const customStyle = { backgroundColor: 'red', margin: '10px' };
    const { container } = render(
      <MemoryRouter>
        <Tabs className={customClassName} style={customStyle}>
          <div>Content with custom class and style</div>
        </Tabs>
      </MemoryRouter>
    );
    const tabsElement = container.firstChild as HTMLElement;
    
    expect(tabsElement).toHaveClass(customClassName);
    // Correctly assert RGB value for colors, as browsers/JSDOM compute them this way
    expect(tabsElement).toHaveStyle('background-color: rgb(255, 0, 0)');
    expect(tabsElement).toHaveStyle('margin: 10px');
  });
});