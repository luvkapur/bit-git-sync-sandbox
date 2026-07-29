import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';
import { Tooltip } from './tooltip.js';

const pageStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-xl, 40px)',
  padding: 'var(--spacing-l, 30px)',
  alignItems: 'center',
  minHeight: '100vh',
  backgroundColor: 'var(--colors-surface-background)',
  color: 'var(--colors-text-default)',
  fontFamily: 'var(--typography-font-family)',
};

const sectionStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'var(--spacing-l, 30px)', // Increased gap for better visual separation within sections
  padding: 'var(--spacing-l, 30px)',
  borderRadius: 'var(--borders-radius-container)', // Nebula: 8px
  backgroundColor: 'var(--colors-surface-primary)',
  border: '1px solid var(--colors-border-subtle)',
  width: '100%',
  maxWidth: '600px',
  boxSizing: 'border-box',
};

const triggerButtonStyles: React.CSSProperties = {
  padding: 'var(--spacing-s, 10px) var(--spacing-m, 15px)',
  border: '1px solid var(--colors-border-interactive)',
  borderRadius: 'var(--borders-radius-medium)', // Nebula: e.g., 6px
  backgroundColor: 'var(--colors-primary-default)',
  color: 'var(--colors-text-inverse)', // Text on primary color
  cursor: 'var(--interactions-cursor-pointer)',
  fontFamily: 'var(--typography-font-family)',
  fontSize: 'var(--typography-sizes-body-default)',
  fontWeight: 500,
};

const triggerSpanStyles: React.CSSProperties = {
  padding: 'var(--spacing-s, 10px) var(--spacing-m, 15px)',
  border: '1px solid var(--colors-border-default)',
  borderRadius: 'var(--borders-radius-medium)',
  backgroundColor: 'var(--colors-surface-secondary)',
  color: 'var(--colors-text-default)',
  cursor: 'var(--interactions-cursor-pointer)',
  fontFamily: 'var(--typography-font-family)',
  textAlign: 'center',
};

const h2Styles: React.CSSProperties = {
  fontFamily: 'var(--typography-font-family)', // Nebula should apply 'Inter' if this token points to heading family
  color: 'var(--colors-text-default)',
  fontSize: '1.75rem', // Example size
  margin: '0 0 var(--spacing-s, 10px) 0',
  textAlign: 'center',
};

const pStyles: React.CSSProperties = {
  color: 'var(--colors-text-secondary)',
  margin: '0 0 var(--spacing-m, 20px) 0',
  textAlign: 'center',
  maxWidth: '90%',
};

export const BasicNebulaTooltip = () => (
  <MemoryRouter>
    <NebulaTheme>
      <div style={pageStyles}>
        <section style={sectionStyles}>
          <h2 style={h2Styles}>Basic Tooltip</h2>
          <p style={pStyles}>A simple tooltip with default (top) positioning, using Nebula theme styles.</p>
          <Tooltip content="Hello from Nebula! This is a basic tooltip.">
            <button style={triggerButtonStyles} type="button">Hover or Focus Me</button>
          </Tooltip>
        </section>
      </div>
    </NebulaTheme>
  </MemoryRouter>
);

export const PositionedNebulaTooltips = () => (
  <MemoryRouter>
    <NebulaTheme>
      <div style={pageStyles}>
        <section style={sectionStyles}>
          <h2 style={h2Styles}>Tooltip Positions</h2>
          <p style={pStyles}>Demonstrating tooltips in all available positions: top, bottom, left, and right.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-xl, 50px) var(--spacing-xxl, 70px)', alignItems: 'center', justifyContent: 'center' }}>
            <Tooltip content="Tooltip on the Top" position="top">
              <span style={triggerSpanStyles} tabIndex={0}>Top Tooltip</span>
            </Tooltip>
            <Tooltip content="Tooltip on the Bottom" position="bottom">
              <span style={triggerSpanStyles} tabIndex={0}>Bottom Tooltip</span>
            </Tooltip>
            <Tooltip content="Tooltip on the Left" position="left">
              <span style={triggerSpanStyles} tabIndex={0}>Left Tooltip</span>
            </Tooltip>
            <Tooltip content="Tooltip on the Right" position="right">
              <span style={triggerSpanStyles} tabIndex={0}>Right Tooltip</span>
            </Tooltip>
          </div>
        </section>
      </div>
    </NebulaTheme>
  </MemoryRouter>
);

export const RichContentAndDelayedNebulaTooltip = () => (
  <MemoryRouter>
    <NebulaTheme>
      <div style={pageStyles}>
        <section style={sectionStyles}>
          <h2 style={h2Styles}>Rich Content & Delays</h2>
          <p style={pStyles}>Tooltip with custom HTML content, enter and leave delays, styled by Nebula.</p>
          <Tooltip
            content={
              <div style={{ textAlign: 'left', padding: 'var(--spacing-xs, 4px)' }}>
                <h3 style={{ margin: '0 0 var(--spacing-xs, 5px) 0', fontSize: 'var(--typography-sizes-body-default)', color: 'var(--colors-text-default)' }}>
                  Nebula Info Card
                </h3>
                <p style={{ margin: 0, fontSize: 'var(--typography-sizes-body-small)', color: 'var(--colors-text-secondary)' }}>
                  This tooltip demonstrates <strong>rich HTML content</strong>.
                  <br />
                  It appears after <em>500ms</em> and hides after <em>300ms</em>.
                </p>
                <img 
                  src="https://images.unsplash.com/photo-1618849821300-5f216d5e4937?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwxfHxmdXR1cmlzdGljJTIwdGVjaG5vbG9neSUyMGRhcmslMjBpbnRlcmZhY2V8ZW58MXwwfHxibHVlfDE3NDk3NzY5Njd8MA&ixlib=rb-4.1.0&q=80&w=200" 
                  alt="Cyberpunk" 
                  style={{ width: '100%', maxWidth: '150px', borderRadius: 'var(--borders-radius-small)', marginTop: 'var(--spacing-s)' }} 
                />
              </div>
            }
            position="bottom"
            enterDelay={500}
            leaveDelay={300}
            tooltipClassName="custom-nebula-tooltip"
          >
            <button style={triggerButtonStyles} type="button">Hover for Rich Content (Delayed)</button>
          </Tooltip>
        </section>
        {/* Example of how a custom class could be used if needed for more specific styling */}
        <style>{`
          .custom-nebula-tooltip {
            min-width: 220px; /* Make it a bit wider for the rich content */
            background-color: var(--colors-primary-default) !important; /* Example override for emphasis */
            color: var(--colors-text-inverse) !important;
            border: 1px solid var(--colors-border-interactive);
          }
          .custom-nebula-tooltip .tooltipArrow {
            border-bottom-color: var(--colors-primary-default) !important; /* Match arrow to new background */
          }
          .custom-nebula-tooltip h3 {
            color: var(--colors-text-inverse) !important;
          }
          .custom-nebula-tooltip p {
            color: var(--colors-text-inverse) !important;
            opacity: 0.9;
          }
        `}</style>
      </div>
    </NebulaTheme>
  </MemoryRouter>
);