import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuraTheme } from '@luvktest/test.aura-theme';
import { Tabs } from './tabs.js';

const commonChildStyle: React.CSSProperties = {
  padding: 'var(--spacing-default)',
  border: '1px dashed var(--colors-border-default)',
  borderRadius: 'var(--borders-radius-medium)',
  marginTop: 'var(--spacing-small)',
  backgroundColor: 'var(--colors-surface-secondary)',
  color: 'var(--colors-text-primary)',
};

export const BasicDefaultTabs = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-background)' }}>
          <Tabs>
            <div style={commonChildStyle}>
              <p>This is the content of the first tab panel.</p>
              <p>It uses the <strong>default</strong> variant which provides a card-like appearance.</p>
            </div>
          </Tabs>
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const TabsWithTitle = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-background)' }}>
          <Tabs title="Section Title">
            <div style={commonChildStyle}>
              <p>This tab container has a title: "Section Title".</p>
              <p>The title is displayed above the tab content using an h2 tag by default.</p>
            </div>
          </Tabs>
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const MinimalVariantTabs = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-background)' }}>
          <Tabs variant="minimal">
            <div style={{...commonChildStyle, backgroundColor: 'transparent', borderStyle: 'solid' }}>
              <p>This tab container uses the <strong>minimal</strong> variant.</p>
              <p>It typically features a simpler design, often just a separator line, without a distinct background or shadow.</p>
            </div>
          </Tabs>
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const TabsWithCustomClassNameAndStyle = () => {
  const customStyle: React.CSSProperties = {
    borderColor: 'var(--colors-primary-default)',
    borderWidth: '2px',
  };
  return (
    <MemoryRouter>
      <AuraTheme>
        <style>{`
          .custom-tabs-composition-highlight {
            box-shadow: var(--effects-shadows-x-large);
            border: 2px solid var(--colors-primary-default);
          }
          .custom-tabs-composition-highlight .custom-title-style {
            color: var(--colors-text-interactive-default);
            font-style: italic;
          }
        `}</style>
        <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-background)' }}>
          <Tabs
            title="Custom Styled Tabs"
            className="custom-tabs-composition-highlight"
            style={customStyle}
          >
            <div style={commonChildStyle}>
              <p>This tab container has a custom CSS class <code>custom-tabs-composition-highlight</code> applied, which adds a prominent shadow and border.</p>
              <p>It also has inline styles applied for a custom border color (though CSS variables are preferred).</p>
              <p>The title also has a custom class <code>custom-title-style</code> applied internally for demonstration if the component supported it (it doesn't directly, but this showcases the idea).</p>
            </div>
          </Tabs>
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};