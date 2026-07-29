import React from 'react';
import { render } from '@testing-library/react';
import { PageLayout } from './page-layout.js';
import { MemoryRouter } from 'react-router-dom';
// Helmet import is not directly used for assertions on its instance, but its effects are tested.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Helmet } from 'react-helmet';
import '@testing-library/jest-dom/extend-expect';

describe('PageLayout', () => {
  it('should render the page title in the Helmet component', () => {
    const pageTitle = 'Test Page Title';
    render(
      <MemoryRouter>
        <PageLayout pageTitle={pageTitle}>
          <div>Test Content</div>
        </PageLayout>
      </MemoryRouter>
    );

    // Helmet updates document.head directly
    expect(document.title).toBe(pageTitle);
  });

  it('should render the page description in the Helmet component when provided', () => {
    const pageDescription = 'Test page description.';
    render(
      <MemoryRouter>
        <PageLayout pageTitle="Test Page" pageDescription={pageDescription}>
          <div>Test Content</div>
        </PageLayout>
      </MemoryRouter>
    );
    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription).toHaveAttribute('content', pageDescription);
  });

  it('should render children within the content wrapper', () => {
    const { getByTestId } = render(
      <MemoryRouter>
        <PageLayout pageTitle="Test Page">
          <div data-testid="test-content">Test Content</div>
        </PageLayout>
      </MemoryRouter>
    );
    const content = getByTestId('test-content');
    expect(content).toBeInTheDocument();
  });
});