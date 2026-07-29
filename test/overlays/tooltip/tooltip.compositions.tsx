import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuraTheme } from '@luvktest/test.aura-theme';
import { Tooltip } from './tooltip.js';

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '60px',
  padding: '50px',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '300px',
  fontFamily: 'var(--typography-font-family)',
  backgroundColor: 'var(--colors-surface-background)',
  color: 'var(--colors-text-primary)',
};

const triggerStyle: React.CSSProperties = {
  padding: '10px 20px',
  border: '1px solid var(--colors-border-default)',
  borderRadius: 'var(--borders-radius-medium)',
  backgroundColor: 'var(--colors-surface-primary)',
  color: 'var(--colors-text-primary)',
  cursor: 'var(--interactions-cursor-pointer)',
  textAlign: 'center',
};

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '20px',
  border: '1px dashed var(--colors-border-default)',
  padding: '30px',
  borderRadius: 'var(--borders-radius-container)',
  backgroundColor: 'var(--colors-surface-secondary)',
};

const h2Style: React.CSSProperties = {
    color: 'var(--colors-text-primary)',
    fontFamily: 'var(--typography-font-family)',
    fontSize: 'var(--typography-sizes-heading-h3)',
    marginBottom: '20px',
};

export const BasicTooltip = () => (
  <MemoryRouter>
    <AuraTheme>
      <div style={containerStyle}>
         <h2 style={h2Style}>Basic Tooltip (Default Top)</h2>
        <Tooltip content="This is a basic tooltip!">
          <button style={triggerStyle}>Hover or Focus Me</button>
        </Tooltip>
      </div>
    </AuraTheme>
  </MemoryRouter>
);

export const PositionedTooltips = () => (
  <MemoryRouter>
    <AuraTheme>
      <div style={containerStyle}>
        <h2 style={h2Style}>Tooltip Positions</h2>
        <div style={{ display: 'flex', gap: '70px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Tooltip content="Tooltip on top" position="top">
            <span style={triggerStyle}>Top Tooltip</span>
          </Tooltip>
          <Tooltip content="Tooltip on bottom" position="bottom">
            <span style={triggerStyle}>Bottom Tooltip</span>
          </Tooltip>
          <Tooltip content="Tooltip on left" position="left">
            <span style={triggerStyle}>Left Tooltip</span>
          </Tooltip>
          <Tooltip content="Tooltip on right" position="right">
            <span style={triggerStyle}>Right Tooltip</span>
          </Tooltip>
        </div>
      </div>
    </AuraTheme>
  </MemoryRouter>
);

export const DelayedTooltip = () => (
  <MemoryRouter>
    <AuraTheme>
      <div style={containerStyle}>
        <h2 style={h2Style}>Delayed Tooltip</h2>
        <Tooltip
          content="Appears after 500ms, disappears after 300ms."
          enterDelay={500}
          leaveDelay={300}
        >
          <button style={triggerStyle}>Hover for Delayed Tooltip</button>
        </Tooltip>
      </div>
    </AuraTheme>
  </MemoryRouter>
);

export const TooltipWithHtmlContent = () => (
  <MemoryRouter>
    <AuraTheme>
      <div style={containerStyle}>
        <h2 style={h2Style}>Tooltip with HTML Content</h2>
        <Tooltip
          content={
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ margin: '0 0 5px 0', fontSize: 'var(--typography-sizes-body-large)', color: 'var(--colors-text-primary)' }}>
                Rich Content!
              </h3>
              <p style={{ margin: 0, fontSize: 'var(--typography-sizes-body-small)', color: 'var(--colors-text-secondary)'}}>
                You can put <strong>any HTML</strong> or React components here.
              </p>
              <ul style={{ margin: '5px 0 0 20px', padding: 0 }}>
                <li style={{ fontSize: 'var(--typography-sizes-body-small)', color: 'var(--colors-text-secondary)'}}>Item 1</li>
                <li style={{ fontSize: 'var(--typography-sizes-body-small)', color: 'var(--colors-text-secondary)'}}>Item 2</li>
              </ul>
            </div>
          }
          position="bottom"
        >
          <button style={triggerStyle}>Hover for HTML Content</button>
        </Tooltip>
      </div>
    </AuraTheme>
  </MemoryRouter>
);

export const AllTooltipsShowcase = () => (
  <MemoryRouter>
    <AuraTheme>
      <div style={{ ...containerStyle, gap: '40px', padding: '30px' }}>
        <div style={sectionStyle}>
            <h2 style={h2Style}>Basic</h2>
            <Tooltip content="This is a basic tooltip!">
            <button style={triggerStyle}>Hover or Focus Me (Top)</button>
            </Tooltip>
        </div>

        <div style={sectionStyle}>
            <h2 style={h2Style}>Positions</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px 80px', alignItems: 'center' }}>
            <Tooltip content="Tooltip on top" position="top">
                <span style={triggerStyle}>Top</span>
            </Tooltip>
            <Tooltip content="Tooltip on right" position="right">
                <span style={triggerStyle}>Right</span>
            </Tooltip>
            <Tooltip content="Tooltip on bottom" position="bottom">
                <span style={triggerStyle}>Bottom</span>
            </Tooltip>
            <Tooltip content="Tooltip on left" position="left">
                <span style={triggerStyle}>Left</span>
            </Tooltip>
            </div>
        </div>

        <div style={sectionStyle}>
            <h2 style={h2Style}>Delays</h2>
            <Tooltip
            content="Enter: 500ms, Leave: 300ms."
            enterDelay={500}
            leaveDelay={300}
            position="top"
            >
            <button style={triggerStyle}>Delayed Tooltip</button>
            </Tooltip>
        </div>

        <div style={sectionStyle}>
            <h2 style={h2Style}>HTML Content</h2>
            <Tooltip
            content={
                <div style={{ textAlign: 'left', padding: 'var(--spacing-small)' }}>
                <h3 style={{ margin: '0 0 var(--spacing-small) 0', fontSize: 'var(--typography-sizes-body-large)', color: 'var(--colors-text-primary)' }}>
                    Info Card
                </h3>
                <p style={{ margin: 0, fontSize: 'var(--typography-sizes-body-default)', color: 'var(--colors-text-secondary)'}}>
                    Detailed information can be placed here using standard HTML elements.
                </p>
                </div>
            }
            position="bottom"
            tooltipClassName="custom-tooltip-class-wider" // Example for custom styling hook
            >
            <button style={triggerStyle}>Complex Content</button>
            </Tooltip>
        </div>
        <style>{`
            .custom-tooltip-class-wider {
                min-width: 200px !important;
            }
        `}</style>
      </div>
    </AuraTheme>
  </MemoryRouter>
);