import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuraTheme } from '@luvktest/test.aura-theme';
import { Logo } from './logo.js';
import type { DefaultLogoProps } from './default-logo.js';

const CustomBrandIcon: React.FC<DefaultLogoProps> = ({ className, style, color = 'currentColor' }) => (
  <svg
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
    fill={color}
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
  </svg>
);


const CustomStarIcon: React.FC<DefaultLogoProps> = ({ className, style, color = 'var(--colors-status-warning-default)' }) => (
  <svg
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
    fill={color}
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </svg>
);


const containerStyle: React.CSSProperties = {
  padding: 'var(--spacing-large, 24px)',
  backgroundColor: 'var(--colors-surface-background)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-medium, 16px)',
  borderRadius: 'var(--borders-radius-medium, 8px)',
  border: '1px solid var(--colors-border-default)',
  minWidth: '300px'
};

export const DefaultAcmeLogo = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <div style={containerStyle}>
          <Logo slogan="Your Trusted Partner" />
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const CustomNameAndSlogan = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <div style={containerStyle}>
          <Logo name="Nova Corp" slogan="Innovate. Integrate. Inspire." href="/nova-corp" />
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const MinimalLogo = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <div style={containerStyle}>
          <Logo name="Acme Minimal" minimal href="/minimal" />
          <Logo name="Nova Corp Minimal" slogan="This won't show" minimal logoSize={50} href="/minimal-nova" />
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const CustomSvgLogo = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <div style={containerStyle}>
          <Logo
            name="Brand X"
            slogan="The Future is X"
            svgLogo={CustomBrandIcon}
            href="/brand-x"
            logoSize={36}
          />
          <Logo
            name="Star Power"
            slogan="Shining Bright"
            svgLogo={CustomStarIcon}
            href="/star-power"
            logoSize={44}
          />
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const VariousLogoSizes = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <div style={containerStyle}>
          <Logo name="Small Acme" slogan="Compact version" logoSize={24} />
          <Logo name="Medium Acme" slogan="Standard version" logoSize={40} />
          <Logo name="Large Acme" slogan="Prominent version" logoSize={56} />
          <Logo name="Minimal Large" minimal logoSize={60} svgLogo={CustomBrandIcon} />
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const LogoWithoutSlogan = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <div style={containerStyle}>
          <Logo name="Acme Inc." href="/acme-inc" />
          <Logo name="Nova Solutions" svgLogo={CustomStarIcon} logoSize={30} />
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};