import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';
import { Flex } from './flex.js';

const StyledItem = ({
  children,
  style,
  className,
}: {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) => (
  <div
    style={{
      backgroundColor: 'var(--colors-surface-secondary)',
      color: 'var(--colors-text-default)',
      padding: 'var(--spacing-m)',
      borderRadius: 'var(--borders-radius-medium)',
      border: '1px solid var(--colors-border-default)',
      minHeight: '60px',
      minWidth: '100px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      fontFamily: 'var(--typography-font-family)',
      ...style,
    }}
    className={className}
  >
    {children}
  </div>
);

export const BasicRowFlexNebula = () => (
  <MemoryRouter>
    <NebulaTheme>
      <div style={{ padding: 'var(--spacing-l)', backgroundColor: 'var(--colors-surface-background)', minHeight: '100vh' }}>
        <h3 style={{ color: 'var(--colors-text-default)', fontFamily: 'var(--typography-font-family)', marginBottom: 'var(--spacing-m)' }}>
          Basic Row Flex (Nebula Theme)
        </h3>
        <Flex gap="var(--spacing-m)">
          <StyledItem style={{ flexGrow: 1 }}>Item 1 (grows)</StyledItem>
          <StyledItem>Item 2</StyledItem>
          <StyledItem style={{ flexShrink: 0 }}>Item 3 (no shrink)</StyledItem>
        </Flex>
      </div>
    </NebulaTheme>
  </MemoryRouter>
);

export const ColumnFlexWithNebulaTheme = () => (
  <MemoryRouter>
    <NebulaTheme>
      <div style={{ padding: 'var(--spacing-l)', backgroundColor: 'var(--colors-surface-background)', minHeight: '100vh' }}>
        <h3 style={{ color: 'var(--colors-text-default)', fontFamily: 'var(--typography-font-family)', marginBottom: 'var(--spacing-m)' }}>
          Column Flex with Gap (Nebula Theme)
        </h3>
        <Flex
          flexDirection="column"
          gap="var(--spacing-s)"
          style={{ width: '250px' }}
        >
          <StyledItem>Item A</StyledItem>
          <StyledItem>Item B</StyledItem>
          <StyledItem>Item C</StyledItem>
        </Flex>
      </div>
    </NebulaTheme>
  </MemoryRouter>
);

export const JustifyAndAlignFlexNebula = () => (
  <MemoryRouter>
    <NebulaTheme>
      <div style={{ padding: 'var(--spacing-l)', backgroundColor: 'var(--colors-surface-background)', minHeight: '100vh' }}>
        <h3 style={{ color: 'var(--colors-text-default)', fontFamily: 'var(--typography-font-family)', marginBottom: 'var(--spacing-m)' }}>
          Justify Content & Align Items (Nebula Theme)
        </h3>
        <Flex
          justifyContent="space-around"
          alignItems="center"
          style={{
            height: '250px',
            border: '1px dashed var(--colors-border-interactive)',
            backgroundColor: 'var(--colors-surface-primary)',
            padding: 'var(--spacing-m)',
          }}
        >
          <StyledItem style={{ height: '80px', backgroundColor: 'var(--colors-primary-default)', color: 'var(--colors-text-inverse) !important' }}>
            Aligned Center
          </StyledItem>
          <StyledItem style={{ alignSelf: 'flex-start' }}>Align Self: Start</StyledItem>
          <StyledItem style={{ alignSelf: 'flex-end', order: -1 }}>Order: -1 (End)</StyledItem>
        </Flex>
      </div>
    </NebulaTheme>
  </MemoryRouter>
);

export const FlexWrapWithNebulaTheme = () => (
  <MemoryRouter>
    <NebulaTheme>
      <div style={{ padding: 'var(--spacing-l)', backgroundColor: 'var(--colors-surface-background)', minHeight: '100vh' }}>
        <h3 style={{ color: 'var(--colors-text-default)', fontFamily: 'var(--typography-font-family)', marginBottom: 'var(--spacing-m)' }}>
          Flex Wrap (Nebula Theme)
        </h3>
        <Flex
          flexWrap="wrap"
          gap="var(--spacing-m)"
          justifyContent="center"
          style={{ maxWidth: '480px', border: '1px solid var(--colors-border-default)', padding: 'var(--spacing-m)', backgroundColor: 'var(--colors-surface-primary)' }}
        >
          <StyledItem style={{ width: '150px', height: '120px' }}>Wrapped Item 1</StyledItem>
          <StyledItem style={{ width: '150px', height: '120px' }}>Wrapped Item 2</StyledItem>
          <StyledItem style={{ width: '150px', height: '120px' }}>Wrapped Item 3</StyledItem>
          <StyledItem style={{ width: '150px', height: '120px', backgroundColor: 'var(--colors-secondary-default)', color: 'var(--colors-text-inverse) !important' }}>
            Wrapped Item 4 (Secondary BG)
          </StyledItem>
        </Flex>
      </div>
    </NebulaTheme>
  </MemoryRouter>
);