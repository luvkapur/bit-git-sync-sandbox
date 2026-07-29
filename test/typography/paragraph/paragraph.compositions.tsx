import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuraTheme } from '@luvktest/test.aura-theme';
import { Paragraph } from './paragraph.js';

export const BasicParagraph = () => (
  <MemoryRouter>
    <AuraTheme>
      <div style={{ padding: 'var(--spacing-default)' }}>
        <Paragraph>
          This is a standard paragraph. It uses the default 'p' HTML element and showcases the base typography for body text within the design system. Readability and clarity are key.
        </Paragraph>
        <Paragraph>
          Another paragraph to demonstrate spacing and flow. The component aims for consistent typography across different applications, ensuring a pleasant reading experience for users.
        </Paragraph>
      </div>
    </AuraTheme>
  </MemoryRouter>
);

export const ParagraphAsVariousElements = () => (
  <MemoryRouter>
    <AuraTheme>
      <div style={{ padding: 'var(--spacing-default)' }}>
        <Paragraph element="p">
          This is a standard <strong>paragraph (p)</strong> element. It's the most common use case for displaying blocks of text.
        </Paragraph>
        <Paragraph element="div">
          This content is rendered as a <strong>div</strong>. It can be useful when you need a block-level container with paragraph styling but 'p' is not semantically appropriate.
        </Paragraph>
        <Paragraph element="span">
          This content is rendered as a <strong>span</strong>. Note that while it's a span, it receives base paragraph styling. Vertical margins from the <code>.paragraph</code> class might not apply as typically expected for inline elements.
        </Paragraph>
        <p style={{ marginTop: 'var(--spacing-default)' }}>
          Regular text with an inline{' '}
          <Paragraph element="span" style={{ color: 'var(--colors-text-interactive-default)', display: 'inline', margin: 0 }}>
            Paragraph as span
          </Paragraph>{' '}
          inside, styled to be truly inline.
        </p>
        <Paragraph element="label">
          This is a <strong>label</strong> element using paragraph styling. Useful for form field labels that require consistent text appearance.
        </Paragraph>
      </div>
    </AuraTheme>
  </MemoryRouter>
);

export const ParagraphAsBlockquote = () => (
  <MemoryRouter>
    <AuraTheme>
      <div style={{ padding: 'var(--spacing-default)' }}>
        <Paragraph element="blockquote">
          "The only true wisdom is in knowing you know nothing." - Socrates.
          <br />
          This paragraph is rendered as a <strong>blockquote</strong>, showcasing distinct styling provided for quoted text, typically including indentation and a thematic border.
        </Paragraph>
      </div>
    </AuraTheme>
  </MemoryRouter>
);

export const ParagraphWithCustomStylingInDarkMode = () => (
  <MemoryRouter>
    <AuraTheme initialTheme="dark">
      <div style={{ padding: 'var(--spacing-default)', backgroundColor: 'var(--colors-surface-background)' }}>
        <style>{`
          .custom-paragraph-appearance {
            color: var(--colors-text-status-success) !important; /* Overriding theme color for emphasis */
            font-weight: var(--typography-font-weight-bold);
            border: 1px dashed var(--colors-border-interactive-default);
            padding: var(--spacing-small);
            border-radius: var(--borders-radius-medium);
            background-color: var(--colors-surface-primary); /* Using a subtle background */
          }
        `}</style>
        <Paragraph className="custom-paragraph-appearance">
          This paragraph, shown in dark mode, has a custom CSS class (<code>custom-paragraph-appearance</code>) applied. This class provides specific styling like a different text color, font weight, a dashed border, padding, and a subtle background.
        </Paragraph>
        <Paragraph style={{ fontSize: 'var(--typography-sizes-body-large)', color: 'var(--colors-text-interactive-default)', marginTop: 'var(--spacing-default)' }}>
          This paragraph uses the inline <code>style</code> prop to apply a larger font size and the interactive text color. Inline styles are useful for one-off adjustments.
        </Paragraph>
      </div>
    </AuraTheme>
  </MemoryRouter>
);