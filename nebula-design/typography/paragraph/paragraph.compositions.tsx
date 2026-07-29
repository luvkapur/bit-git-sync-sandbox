import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';
import { Paragraph } from './paragraph.js';

export const BasicParagraphNebula = () => (
  <MemoryRouter>
    <NebulaTheme>
      <div style={{ padding: 'var(--spacing-l)', backgroundColor: 'var(--colors-surface-background)' }}>
        <Paragraph>
          This is a standard paragraph within the Nebula theme. It utilizes the default 'p' HTML element and showcases the fundamental typography for body text. The Nebula theme ensures a sleek, modern look and feel, emphasizing readability against its distinct backgrounds.
        </Paragraph>
        <Paragraph>
          Another paragraph demonstrating the default styling and spacing provided by the Nebula theme. Consistent typographic treatment is crucial for a cohesive user experience across all interfaces powered by Nebula.
        </Paragraph>
      </div>
    </NebulaTheme>
  </MemoryRouter>
);

export const ParagraphAsVariousElementsNebula = () => (
  <MemoryRouter>
    <NebulaTheme>
      <div style={{ padding: 'var(--spacing-l)', backgroundColor: 'var(--colors-surface-background)' }}>
        <Paragraph element="p">
          This is a standard <strong>paragraph (p)</strong> element within Nebula. It's the most common use case for displaying blocks of text, styled according to Nebula's typographic rules.
        </Paragraph>
        <Paragraph element="div">
          This content is rendered as a <strong>div</strong>, styled as a paragraph. This is useful when a block-level container with paragraph styling is needed, but 'p' is not semantically appropriate in the Nebula-themed layout.
        </Paragraph>
        <Paragraph element="span">
          This content is rendered as a <strong>span</strong> with Nebula paragraph styling. Note that while it's a span, it receives base paragraph styling. Vertical margins from the <code>.paragraph</code> class might not apply as typically expected for inline elements without further custom styling.
        </Paragraph>
        <p style={{ marginTop: 'var(--spacing-m)', color: 'var(--colors-text-default)' }}>
          Regular text flow with an inline{' '}
          <Paragraph element="span" style={{ color: 'var(--colors-text-interactive-default)', display: 'inline', margin: 0 }}>
            Paragraph as interactive span
          </Paragraph>{' '}
          styled to be truly inline within a Nebula context.
        </p>
        <Paragraph element="label">
          This is a <strong>label</strong> element styled by Nebula's paragraph component. It's ideal for form field labels requiring consistent text appearance with the rest of the Nebula UI.
        </Paragraph>
         <Paragraph element="figcaption">
          This content is rendered as a <strong>figcaption</strong>. Useful for providing captions for figures or images, styled with Nebula's paragraph typography.
        </Paragraph>
      </div>
    </NebulaTheme>
  </MemoryRouter>
);

export const BlockquoteParagraphNebula = () => (
  <MemoryRouter>
    <NebulaTheme>
      <div style={{ padding: 'var(--spacing-l)', backgroundColor: 'var(--colors-surface-background)' }}>
        <Paragraph element="blockquote">
          "In the vast expanse of the digital cosmos, Nebula provides clarity and order." - A Future Visionary.
          <br />
          This paragraph is rendered as a <strong>blockquote</strong>. It showcases Nebula's distinct styling for quoted text, which includes thematic indentation and a border, using variables like <code>--colors-border-default</code> and <code>--colors-text-secondary</code>.
        </Paragraph>
      </div>
    </NebulaTheme>
  </MemoryRouter>
);