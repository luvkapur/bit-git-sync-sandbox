import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Flex } from './flex.js';
import { AuraTheme } from '@luvktest/test.aura-theme';

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
      color: 'var(--colors-text-primary)',
      padding: 'var(--spacing-default)',
      borderRadius: 'var(--borders-radius-medium)',
      border: '1px solid var(--colors-border-default)',
      minHeight: '60px',
      minWidth: '100px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      fontFamily: 'var(--typography-font-family)',
      fontWeight: 'var(--typography-font-weight-medium)',
      ...style,
    }}
    className={className}
  >
    {children}
  </div>
);

export const BasicRowFlex = () => (
  <MemoryRouter>
    <AuraTheme>
      <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-background)' }}>
        <h3 style={{color: 'var(--colors-text-primary)', fontFamily: 'var(--typography-font-family)'}}>Basic Row</h3>
        <Flex gap="var(--spacing-medium)">
          <StyledItem style={{ flexGrow: 1 }}>Item 1 (grows)</StyledItem>
          <StyledItem>Item 2</StyledItem>
          <StyledItem style={{ flexShrink: 0 }}>Item 3 (no shrink)</StyledItem>
        </Flex>
      </div>
    </AuraTheme>
  </MemoryRouter>
);

export const ColumnFlexWithGap = () => (
  <MemoryRouter>
    <AuraTheme>
      <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-background)' }}>
        <h3 style={{color: 'var(--colors-text-primary)', fontFamily: 'var(--typography-font-family)'}}>Column with Gap</h3>
        <Flex
          flexDirection="column"
          gap="var(--spacing-medium)"
          style={{ width: '250px' }}
        >
          <StyledItem>Item A</StyledItem>
          <StyledItem>Item B</StyledItem>
          <StyledItem>Item C</StyledItem>
        </Flex>
      </div>
    </AuraTheme>
  </MemoryRouter>
);

export const JustifyAndAlignFlex = () => (
  <MemoryRouter>
    <AuraTheme>
      <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-background)' }}>
         <h3 style={{color: 'var(--colors-text-primary)', fontFamily: 'var(--typography-font-family)'}}>Justify Content & Align Items</h3>
        <Flex
          justifyContent="space-around"
          alignItems="center"
          style={{
            height: '250px',
            border: '1px dashed var(--colors-border-interactive-default)',
            backgroundColor: 'var(--colors-surface-primary)'
          }}
        >
          <StyledItem style={{ height: '80px', backgroundColor: 'var(--colors-primary-default)', color: 'var(--colors-text-inverse) !important' }}>Aligned Center</StyledItem>
          <StyledItem style={{ alignSelf: 'flex-start' }}>Align Self: Start</StyledItem>
          <StyledItem style={{ alignSelf: 'flex-end', order: -1 }}>Order: -1 (End)</StyledItem>
        </Flex>
      </div>
    </AuraTheme>
  </MemoryRouter>
);

export const FlexWrapWithImages = () => (
  <MemoryRouter>
    <AuraTheme>
      <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-background)' }}>
        <h3 style={{color: 'var(--colors-text-primary)', fontFamily: 'var(--typography-font-family)'}}>Flex Wrap with Image Backgrounds</h3>
        <Flex
          flexWrap="wrap"
          gap="var(--spacing-medium)"
          justifyContent="center"
          style={{ maxWidth: '480px', border: '1px solid var(--colors-border-default)', padding: 'var(--spacing-medium)' }}
        >
          <StyledItem
            style={{
              width: '150px',
              height: '120px',
              backgroundImage:
                'url("https://images.unsplash.com/photo-1618858553936-84170aa4be58?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGdyaWQlMjBwYXR0ZXJufGVufDF8Mnx8Ymx1ZXwxNzQ5Nzc2MzY4fDA&ixlib=rb-4.1.0")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: 'var(--colors-text-inverse) !important',
            }}
          >
            Pattern 1
          </StyledItem>
          <StyledItem
            style={{
              width: '150px',
              height: '120px',
              backgroundImage:
                'url("https://images.unsplash.com/photo-1698043649093-05c5d835f290?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMGdyaWQlMjBwYXR0ZXJufGVufDF8Mnx8Ymx1ZXwxNzQ5Nzc2MzY4fDA&ixlib=rb-4.1.0")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: 'var(--colors-text-inverse) !important',
            }}
          >
            Abstract Blue
          </StyledItem>
          <StyledItem
            style={{
              width: '150px',
              height: '120px',
              backgroundImage:
                'url("https://images.unsplash.com/photo-1647335858860-8f4d6b07ea8b?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMGdyaWQlMjBwYXR0ZXJufGVufDF8Mnx8Ymx1ZXwxNzQ5Nzc2MzY4fDA&ixlib=rb-4.1.0")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: 'var(--colors-text-inverse) !important',
            }}
          >
            Cubes
          </StyledItem>
          <StyledItem
            style={{
              width: '150px',
              height: '120px',
              backgroundImage:
                'url("https://images.unsplash.com/photo-1605106250963-ffda6d2a4b32?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHw3fHxhYnN0cmFjdCUyMGdyaWQlMjBwYXR0ZXJufGVufDF8Mnx8Ymx1ZXwxNzQ5Nzc2MzY4fDA&ixlib=rb-4.1.0")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: 'var(--colors-text-inverse) !important',
            }}
          >
            Checkered
          </StyledItem>
        </Flex>
      </div>
    </AuraTheme>
  </MemoryRouter>
);