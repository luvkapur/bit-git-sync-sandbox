import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';
import { Heading } from './heading.js';

const containerStyles: React.CSSProperties = {
  padding: 'var(--spacing-l, 24px)', // Fallback if token not available
  backgroundColor: 'var(--colors-surface-background)',
  color: 'var(--colors-text-default)', // Changed from primary to default as per Nebula tokens
  fontFamily: 'var(--typography-font-family)', // This will be Inter in Nebula
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-m, 16px)', // Fallback
  minHeight: '100vh', // Ensure visibility in Bit dev server
};

export const HeadingsWithNebulaTheme = () => {
  return (
    <MemoryRouter>
      <NebulaTheme>
        <div style={containerStyles}>
          <Heading level={1}>Nebula H1: The Quick Brown Fox</Heading>
          <p style={{ margin: 0, color: 'var(--colors-text-secondary)' }}>
            This showcases a standard H1 heading styled by the Nebula theme. Notice the 'Inter' font.
          </p>
          <Heading level={2}>Nebula H2: Jumps Over The Lazy Dog</Heading>
          <p style={{ margin: 0, color: 'var(--colors-text-secondary)' }}>
            A standard H2 heading.
          </p>
          <Heading level={3}>Nebula H3: Pack My Box With Five Dozen Liquor Jugs</Heading>
          <Heading level={4}>Nebula H4: How Vexingly Quick Daft Zebras Jump</Heading>
          <Heading level={5}>Nebula H5: Sphinx of Black Quartz, Judge My Vow</Heading>
          <Heading level={6}>Nebula H6: The Five Boxing Wizards Jump Quickly</Heading>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};

export const VisualOverrideWithNebulaTheme = () => {
  return (
    <MemoryRouter>
      <NebulaTheme>
        <div style={containerStyles}>
          <Heading level={1} visualLevel={3}>
            Nebula: Semantic H1, Visual H3
          </Heading>
          <p style={{ margin: 0, color: 'var(--colors-text-secondary)' }}>
            This is an H1 tag that looks like an H3, styled by Nebula. Good for SEO while controlling appearance. Font should be 'Inter'.
          </p>
          <Heading level={4} visualLevel={1}>
            Nebula: Semantic H4, Visual H1
          </Heading>
          <p style={{ margin: 0, color: 'var(--colors-text-secondary)' }}>
            An H4 tag that looks like a large H1. Useful for impactful text with lower semantic weight.
          </p>
          <Heading level={6} visualLevel={2}>
            Nebula: Semantic H6, Visual H2
          </Heading>
           <p style={{ margin: 0, color: 'var(--colors-text-secondary)' }}>
            An H6 tag that looks like an H2.
          </p>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};

export const CustomStyledHeadingWithNebulaTheme = () => {
  return (
    <MemoryRouter>
      <NebulaTheme>
        <div style={containerStyles}>
          <Heading
            level={2}
            className="custom-nebula-heading"
            style={{
              color: 'var(--colors-text-interactive-default)', // Nebula's interactive color (purple)
              borderBottom: '3px dashed var(--colors-primary-default)', // Nebula's primary color (purple)
              paddingBottom: 'var(--spacing-s, 8px)',
              textShadow: '1px 1px 2px var(--colors-overlay, rgba(0,0,0,0.5))', // Using overlay for a subtle shadow
            }}
          >
            Nebula H2: Custom Interactive Styling
          </Heading>
          <p style={{ margin: 0, color: 'var(--colors-text-secondary)' }}>
            This H2 uses custom inline styles and a placeholder class, demonstrating further customization on top of Nebula's base heading styles. The font remains 'Inter'.
          </p>
          <Heading
            level={1}
            style={{
              color: 'var(--colors-text-success)', // Nebula's success color (cyan)
            }}
          >
            Nebula H1: Success Status Color
          </Heading>
           <p style={{ margin: 0, color: 'var(--colors-text-secondary)' }}>
            This H1 uses Nebula's success color, showcasing integration with status colors from the theme.
          </p>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};