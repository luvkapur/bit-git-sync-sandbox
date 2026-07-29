import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';
import { Badge, type BadgeSize } from './badge.js';

// Simple Icon components for demonstration
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
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
  </svg>
);

const compositionContainerStyle: React.CSSProperties = {
  padding: 'var(--spacing-l)',
  backgroundColor: 'var(--colors-surface-background)',
  fontFamily: 'var(--typography-font-family)',
  color: 'var(--colors-text-default)',
  minHeight: '100vh',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 'var(--spacing-l)',
  padding: 'var(--spacing-m)',
  border: '1px solid var(--colors-border-default)',
  borderRadius: 'var(--borders-radius-container)', // Using container radius for sections
  backgroundColor: 'var(--colors-surface-primary)',
};

const sectionHeaderStyle: React.CSSProperties = {
  color: 'var(--colors-text-default)',
  fontFamily: 'var(--typography-font-family)',
  fontSize: '1.25rem', // Hardcoded, as no specific headline token for this context
  fontWeight: 600,
  marginBottom: 'var(--spacing-m)',
  borderBottom: '1px solid var(--colors-border-subtle, var(--colors-border-default))', // Fallback if subtle not present
  paddingBottom: 'var(--spacing-s)',
};

const badgeGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: 'var(--spacing-m)',
  alignItems: 'center',
  flexWrap: 'wrap',
};

export const BadgeVariantsAndColors = () => (
  <MemoryRouter>
    <NebulaTheme>
      <div style={compositionContainerStyle}>
        <div style={sectionStyle}>
          <h3 style={sectionHeaderStyle}>Solid Badges (Medium Size)</h3>
          <div style={badgeGroupStyle}>
            <Badge label="Primary" color="primary" variant="solid" />
            <Badge label="Secondary" color="secondary" variant="solid" />
            <Badge label="Success" color="success" variant="solid" />
            <Badge label="Warning" color="warning" variant="solid" />
            <Badge label="Danger" color="danger" variant="solid" />
            <Badge label="Info" color="info" variant="solid" />
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
    </NebulaTheme>
  </MemoryRouter>
);

export const BadgeSizesAndIcons = () => {
  const sizes: BadgeSize[] = ['small', 'medium', 'large'];

  return (
    <MemoryRouter>
      <NebulaTheme>
        <div style={compositionContainerStyle}>
          {sizes.map((size) => (
            <div key={size} style={sectionStyle}>
              <h3 style={sectionHeaderStyle}>
                Size: {size.charAt(0).toUpperCase() + size.slice(1)} (Solid Primary)
              </h3>
              <div style={badgeGroupStyle}>
                <Badge label={`${size.toUpperCase()}`} variant="solid" size={size} color="primary" />
                <Badge label="With Icon" variant="solid" size={size} color="primary" icon={StarIcon} />
                <Badge label="Alert" variant="outline" size={size} color="danger" icon={BellIcon} />
              </div>
            </div>
          ))}
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};

export const CustomColorAndMixedBadges = () => (
  <MemoryRouter>
    <NebulaTheme>
      <div style={compositionContainerStyle}>
        <div style={sectionStyle}>
          <h3 style={sectionHeaderStyle}>Badges with Custom Colors</h3>
          <div style={badgeGroupStyle}>
            <Badge label="Deep Purple Solid" color="#673AB7" variant="solid" icon={StarIcon} />
            <Badge label="Teal Outline" color="#009688" variant="outline" />
            <Badge label="Amber Ghost" color="#FFC107" variant="ghost" />
            <Badge
              label="Lime Solid (Custom Text)"
              color="lime"
              variant="solid"
              style={{ color: 'var(--colors-text-default)' }} // Override default inverse for light background
              icon={BellIcon}
            />
          </div>
        </div>

        <div style={sectionStyle}>
          <h3 style={sectionHeaderStyle}>Mixed Configuration Badges</h3>
          <div style={badgeGroupStyle}>
            <Badge label="Featured" color="primary" variant="solid" size="large" icon={StarIcon} />
            <Badge label="Experimental" color="secondary" variant="outline" size="small" />
            <Badge label="Archived" color="#607D8B" variant="ghost" size="medium" icon={BellIcon} />
            <Badge label="High Priority" color="danger" variant="solid" size="medium" icon={BellIcon} />
          </div>
        </div>
      </div>
    </NebulaTheme>
  </MemoryRouter>
);