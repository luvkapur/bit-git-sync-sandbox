import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';
import { Tabs } from './tabs.js';

const commonChildStyle: React.CSSProperties = {
  padding: 'var(--spacing-m)',
  border: '1px dashed var(--colors-border-subtle)',
  borderRadius: 'var(--borders-radius-medium)',
  backgroundColor: 'var(--colors-surface-secondary)',
  color: 'var(--colors-text-default)',
  fontFamily: 'var(--typography-font-family)',
};

const compositionWrapperStyle: React.CSSProperties = {
  padding: 'var(--spacing-l)',
  backgroundColor: 'var(--colors-surface-background)',
  minHeight: '200px', // Ensure content is visible
};

export const BasicNebulaTabs = () => {
  return (
    <MemoryRouter>
      <NebulaTheme>
        <div style={compositionWrapperStyle}>
          <Tabs>
            <div style={commonChildStyle}>
              <p>This is the content of the tab panel within the Nebula Theme.</p>
              <p>It uses the <strong>default</strong> variant which provides a container with a subtle purple tint background and rounded corners as defined by Nebula.</p>
            </div>
          </Tabs>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};

export const NebulaTabsWithTitle = () => {
  return (
    <MemoryRouter>
      <NebulaTheme>
        <div style={compositionWrapperStyle}>
          <Tabs title="Nebula Section Title">
            <div style={commonChildStyle}>
              <p>This tab container has a title: "Nebula Section Title".</p>
              <p>The title font and color are styled according to Nebula theme (Inter font).</p>
            </div>
          </Tabs>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};

export const MinimalNebulaTabs = () => {
  return (
    <MemoryRouter>
      <NebulaTheme>
        <div style={compositionWrapperStyle}>
          <Tabs variant="minimal">
            <div style={{...commonChildStyle, backgroundColor: 'transparent', borderTop: 'none', paddingTop: 0 }}>
              <p>This tab container uses the <strong>minimal</strong> variant in Nebula Theme.</p>
              <p>It features a simpler design, typically a top border, without a distinct background. Content background here is transparent.</p>
            </div>
          </Tabs>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};

export const CustomStyledNebulaTabs = () => {
  const customStyle: React.CSSProperties = {
    borderColor: 'var(--colors-primary-default)', // Nebula primary color
    borderWidth: '2px',
  };
  return (
    <MemoryRouter>
      <NebulaTheme>
        <style>{`
          .custom-nebula-tabs-highlight {
            box-shadow: var(--shadows-large); /* Using Nebula shadow token */
            border: 2px solid var(--colors-primary-default); /* Nebula primary color */
          }
          .custom-nebula-tabs-highlight .custom-nebula-title-style {
            color: var(--colors-text-interactive-default); /* Nebula interactive color */
            font-style: italic;
          }
        `}</style>
        <div style={compositionWrapperStyle}>
          <Tabs
            title="Custom Styled Nebula Tabs"
            className="custom-nebula-tabs-highlight"
            style={customStyle}
          >
            <div style={commonChildStyle}>
              <p>This tab container has a custom CSS class <code>custom-nebula-tabs-highlight</code> applied.</p>
              <p>It also has inline styles applied for a custom border color using Nebula's primary color.</p>
              <p>The title uses Nebula's 'Inter' font by default from the component's styles.</p>
            </div>
          </Tabs>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};