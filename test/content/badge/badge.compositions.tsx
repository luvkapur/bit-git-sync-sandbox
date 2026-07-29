import React from 'react';
import { AuraTheme } from '@luvktest/test.aura-theme';
import { Badge, BadgeVariant, BadgeSize } from './badge.js';

// Simple Icon for demonstration purposes
const StarIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </svg>
);

const BellIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className}
    xmlns="http://www.w3.org/2000/svg" 
    width="1em" 
    height="1em" 
    viewBox="0 0 24 24" 
    fill="currentColor"
  >
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
  </svg>
);


const sectionStyle: React.CSSProperties = {
  marginBottom: 'var(--spacing-large)',
  padding: 'var(--spacing-default)',
  border: '1px solid var(--colors-border-default)',
  borderRadius: 'var(--borders-radius-medium)',
  backgroundColor: 'var(--colors-surface-primary)'
};

const sectionHeaderStyle: React.CSSProperties = {
  color: 'var(--colors-text-primary)',
  fontFamily: 'var(--typography-font-family)',
  fontSize: 'var(--typography-sizes-heading-h5)',
  marginBottom: 'var(--spacing-default)',
  borderBottom: '1px solid var(--colors-border-default)',
  paddingBottom: 'var(--spacing-small)'
};

const badgeGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: 'var(--spacing-default)',
  alignItems: 'center',
  flexWrap: 'wrap',
};

const compositionContainerStyle: React.CSSProperties = {
  padding: 'var(--spacing-large)',
  backgroundColor: 'var(--colors-surface-background)',
  fontFamily: 'var(--typography-font-family)',
  color: 'var(--colors-text-primary)'
};

export const PredefinedColorBadges = () => (
  <AuraTheme>
    <div style={compositionContainerStyle}>
      <div style={sectionStyle}>
        <h3 style={sectionHeaderStyle}>Solid Badges (Medium Size)</h3>
        <div style={badgeGroupStyle}>
          <Badge label="Primary" color="primary" />
          <Badge label="Secondary" color="secondary" />
          <Badge label="Success" color="success" />
          <Badge label="Warning" color="warning" />
          <Badge label="Danger" color="danger" />
          <Badge label="Info" color="info" />
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionHeaderStyle}>Outline Badges (Medium Size)</h3>
        <div style={badgeGroupStyle}>
          <Badge label="Primary" variant="outline" color="primary" />
          <Badge label="Secondary" variant="outline" color="secondary" />
          <Badge label="Success" variant="outline" color="success" />
          <Badge label="Warning" variant="outline" color="warning" />
          <Badge label="Danger" variant="outline" color="danger" />
          <Badge label="Info" variant="outline" color="info" />
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionHeaderStyle}>Ghost Badges (Medium Size)</h3>
        <div style={badgeGroupStyle}>
          <Badge label="Primary" variant="ghost" color="primary" />
          <Badge label="Secondary" variant="ghost" color="secondary" />
          <Badge label="Success" variant="ghost" color="success" />
          <Badge label="Warning" variant="ghost" color="warning" />
          <Badge label="Danger" variant="ghost" color="danger" />
          <Badge label="Info" variant="ghost" color="info" />
        </div>
      </div>
    </div>
  </AuraTheme>
);

export const SizeVariantBadges = () => {
  const sizes: BadgeSize[] = ['small', 'medium', 'large'];
  const variants: BadgeVariant[] = ['solid', 'outline', 'ghost'];

  return (
    <AuraTheme>
      <div style={compositionContainerStyle}>
        {variants.map((variant) => (
          <div key={variant} style={sectionStyle}>
            <h3 style={sectionHeaderStyle}>
              {variant.charAt(0).toUpperCase() + variant.slice(1)} Badges (Primary Color)
            </h3>
            {sizes.map((size) => (
              <div key={size} style={{ marginBottom: 'var(--spacing-small)' }}>
                <h4 style={{ ...sectionHeaderStyle, fontSize: 'var(--typography-sizes-heading-h6)', borderBottom: 'none', marginBottom: 'var(--spacing-x8)' }}>
                  Size: {size}
                </h4>
                <div style={badgeGroupStyle}>
                  <Badge label={`${size.toUpperCase()}`} variant={variant} size={size} color="primary" />
                  <Badge label="With Icon" variant={variant} size={size} color="primary" icon={StarIcon} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </AuraTheme>
  );
};

export const IconAndCustomColorBadges = () => (
  <AuraTheme>
    <div style={compositionContainerStyle}>
      <div style={sectionStyle}>
        <h3 style={sectionHeaderStyle}>Badges with Icons</h3>
        <div style={badgeGroupStyle}>
          <Badge label="New" color="primary" icon={StarIcon} />
          <Badge label="Alert" variant="outline" color="danger" icon={BellIcon} size="large" />
          <Badge label="Info" variant="ghost" color="info" icon={BellIcon} size="small" />
          <Badge label="Feature" color="success" icon={StarIcon} size="medium" variant="solid"/>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionHeaderStyle}>Badges with Custom Colors</h3>
        <div style={badgeGroupStyle}>
          <Badge label="Hot Pink" color="#FF69B4" variant="solid" />
          <Badge label="Forest Green" color="forestgreen" variant="outline" />
          <Badge label="Steel Blue" color="steelblue" variant="ghost" />
          <Badge label="Gold" color="gold" variant="solid" style={{ color: 'var(--colors-text-primary)' }} icon={StarIcon} />
        </div>
      </div>
       <div style={sectionStyle}>
        <h3 style={sectionHeaderStyle}>Mixed Custom Badges</h3>
        <div style={badgeGroupStyle}>
          <Badge label="Plum Solid" color="#DDA0DD" variant="solid" size="large" icon={StarIcon} />
          <Badge label="Teal Outline" color="teal" variant="outline" size="small" />
          <Badge label="Orange Ghost" color="darkorange" variant="ghost" size="medium" icon={BellIcon} />
        </div>
      </div>
    </div>
  </AuraTheme>
);