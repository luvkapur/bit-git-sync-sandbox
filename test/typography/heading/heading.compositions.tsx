import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuraTheme } from '@luvktest/test.aura-theme';
import { Heading } from './heading.js';

const containerStyles: React.CSSProperties = {
  padding: 'var(--spacing-large)',
  backgroundColor: 'var(--colors-surface-background)',
  color: 'var(--colors-text-primary)',
  fontFamily: 'var(--typography-font-family)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-default)',
};

export const SemanticHeadings = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <div style={containerStyles}>
          <Heading level={1}>Level 1 Heading (H1)</Heading>
          <Heading level={2}>Level 2 Heading (H2)</Heading>
          <Heading level={3}>Level 3 Heading (H3)</Heading>
          <Heading level={4}>Level 4 Heading (H4)</Heading>
          <Heading level={5}>Level 5 Heading (H5)</Heading>
          <Heading level={6}>Level 6 Heading (H6)</Heading>
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const VisualLevelOverrideHeadings = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <div style={containerStyles}>
          <Heading level={1} visualLevel={3}>
            Semantic H1, Visual H3
          </Heading>
          <p style={{ margin: 0, color: 'var(--colors-text-secondary)' }}>
            This is a paragraph following an H1 that looks like an H3.
            It demonstrates decoupling semantic structure from visual presentation.
          </p>
          <Heading level={4} visualLevel={2}>
            Semantic H4, Visual H2
          </Heading>
          <p style={{ margin: 0, color: 'var(--colors-text-secondary)' }}>
            This is a paragraph following an H4 that looks like an H2.
            Useful for maintaining SEO structure while achieving a different visual hierarchy.
          </p>
          <Heading level={6} visualLevel={1}>
            Semantic H6, Visual H1 (Big impact, small semantic weight)
          </Heading>
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const CustomStyledHeading = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <div style={containerStyles}>
          <Heading
            level={2}
            className="custom-heading-class"
            style={{
              color: 'var(--colors-text-interactive-default)',
              borderBottom: '2px solid var(--colors-border-interactive-default)',
              paddingBottom: 'var(--spacing-small)',
            }}
          >
            Custom Styled H2
          </Heading>
          <p style={{ margin: 0, color: 'var(--colors-text-secondary)' }}>
            This heading uses a custom CSS class and inline styles for additional visual customization.
            The custom class could be defined in a global stylesheet or another SCSS module.
          </p>
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const HeadingsInDarkMode = () => {
  return (
    <MemoryRouter>
      <AuraTheme initialTheme="dark">
        <div style={containerStyles}>
          <Heading level={1}>Dark Mode: Level 1 Heading</Heading>
          <Heading level={3} visualLevel={5}>
            Dark Mode: Semantic H3, Visual H5
          </Heading>
          <Heading
            level={4}
            style={{ color: 'var(--colors-text-status-success)' }}
          >
            Dark Mode: H4 with Success Color
          </Heading>
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};