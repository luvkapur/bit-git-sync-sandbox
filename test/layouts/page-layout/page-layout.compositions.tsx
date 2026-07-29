import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuraTheme } from '@luvktest/test.aura-theme';
import { PageLayout } from './page-layout.js';

const commonContentStyle: React.CSSProperties = {
  padding: 'var(--spacing-large)',
  backgroundColor: 'var(--colors-surface-primary)',
  borderRadius: 'var(--borders-radius-container)',
  border: '1px solid var(--colors-border-default)',
  boxShadow: 'var(--effects-shadows-medium)',
  color: 'var(--colors-text-primary)',
};

const headingStyle: React.CSSProperties = {
  fontSize: 'var(--typography-sizes-heading-h3)',
  color: 'var(--colors-text-primary)',
  marginBottom: 'var(--spacing-default)',
};

const paragraphStyle: React.CSSProperties = {
  fontSize: 'var(--typography-sizes-body-default)',
  lineHeight: 'var(--typography-line-height-base)',
  marginBottom: 'var(--spacing-small)',
};

const imageStyle: React.CSSProperties = {
  maxWidth: '100%',
  height: 'auto',
  borderRadius: 'var(--borders-radius-medium)',
  marginTop: 'var(--spacing-default)',
  display: 'block',
};

export const BasicPageLayout = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <PageLayout pageTitle="My Awesome App - Home">
          <div style={commonContentStyle}>
            <h2 style={headingStyle}>Welcome to the Home Page!</h2>
            <p style={paragraphStyle}>
              This is a basic page layout example. It showcases the fundamental structure
              with a page title set for SEO and browser tabs. The content area is clean
              and uses theme tokens for consistent styling.
            </p>
            <p style={paragraphStyle}>
              The PageLayout component ensures responsive behavior and a modern, wide
              screen appearance by default.
            </p>
            <img
              src="https://images.unsplash.com/photo-1659123739225-ebc34dbdab0c?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwxfHxyZXNwb25zaXZlJTIwd2Vic2l0ZSUyMGxheW91dCUyQyUyMGNsZWFuJTIwVUklMkMlMjBkaWdpdGFsJTIwc2NyZWVuJTJDJTIwd2ViJTIwZGV2ZWxvcG1lbnR8ZW58MXwwfHxibHVlfDE3NDk3NzY5MTh8MA&ixlib=rb-4.1.0"
              alt="Visual 3D Typography"
              style={imageStyle}
            />
          </div>
        </PageLayout>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const PageLayoutWithSeoDescription = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <PageLayout
          pageTitle="About Our Company | Innovatech Solutions"
          pageDescription="Discover Innovatech Solutions, our mission, vision, and the core values that drive our commitment to technological excellence."
        >
          <div style={commonContentStyle}>
            <h2 style={headingStyle}>About Innovatech Solutions</h2>
            <p style={paragraphStyle}>
              This page demonstrates the PageLayout component with both a page title and
              a meta description for enhanced SEO. This is crucial for search engine
              visibility and providing users with relevant information in search results.
            </p>
            <p style={paragraphStyle}>
              Our mission is to pioneer innovative solutions that empower businesses and individuals.
              We believe in the transformative power of technology.
            </p>
            <img
              src="https://images.unsplash.com/photo-1544731612-de7f96afe55f?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHw2fHxyZXNwb25zaXZlJTIwd2Vic2l0ZSUyMGxheW91dCUyQyUyMGNsZWFuJTIwVUklMkMlMjBkaWdpdGFsJTIwc2NyZWVuJTJDJTIwd2ViJTIwZGV2ZWxvcG1lbnR8ZW58MXwwfHxibHVlfDE3NDk3NzY5MTh8MA&ixlib=rb-4.1.0"
              alt="Modern workspace with laptop"
              style={imageStyle}
            />
          </div>
        </PageLayout>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const PageLayoutWithInnerNavigation = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <PageLayout
          pageTitle="User Dashboard - My Account"
          innerNavigationTitle="Account Overview"
        >
          {/* Content here is wrapped by Tabs component internally */}
          <div>
            <h3 style={{...headingStyle, fontSize: 'var(--typography-sizes-heading-h4)'}}>Profile Details</h3>
            <p style={paragraphStyle}>Name: Jane Doe</p>
            <p style={paragraphStyle}>Email: jane.doe@example.com</p>
            <p style={paragraphStyle}>Membership: Premium</p>
            <h3 style={{...headingStyle, fontSize: 'var(--typography-sizes-heading-h4)', marginTop: 'var(--spacing-large)'}}>Recent Activity</h3>
            <ul style={{paddingLeft: 'var(--spacing-default)', ...paragraphStyle}}>
              <li>Logged in successfully.</li>
              <li>Updated profile picture.</li>
              <li>Viewed billing history.</li>
            </ul>
            <img
              src="https://images.unsplash.com/photo-1541462608143-67571c6738dd?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHw3fHxyZXNwb25zaXZlJTIwd2Vic2l0ZSUyMGxheW91dCUyQyUyMGNsZWFuJTIwVUklMkMlMjBkaWdpdGFsJTIwc2NyZWVuJTJDJTIwd2ViJTIwZGV2ZWxvcG1lbnR8ZW58MXwwfHxibHVlfDE3NDk3NzY5MTh8MA&ixlib=rb-4.1.0"
              alt="Organized desk with devices"
              style={imageStyle}
            />
          </div>
        </PageLayout>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const PageLayoutWithMinimalInnerNavigation = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <PageLayout
          pageTitle="Application Settings - Preferences"
          innerNavigationTitle="System Preferences"
          tabsVariant="minimal"
        >
          {/* Content here is wrapped by Tabs component (minimal variant) internally */}
           <div>
            <h3 style={{...headingStyle, fontSize: 'var(--typography-sizes-heading-h4)'}}>Notification Settings</h3>
            <p style={paragraphStyle}>Email Notifications: Enabled</p>
            <p style={paragraphStyle}>Push Notifications: Disabled</p>

            <h3 style={{...headingStyle, fontSize: 'var(--typography-sizes-heading-h4)', marginTop: 'var(--spacing-large)'}}>Appearance</h3>
            <p style={paragraphStyle}>Theme: Auto (Follows system)</p>
            <p style={paragraphStyle}>Font Size: Medium</p>
            <p style={paragraphStyle}>
              This example uses the 'minimal' variant for the inner navigation tabs.
              This provides a cleaner, less prominent container for the content, often
              just separated by a line, suitable for settings pages or less complex sections.
            </p>
          </div>
        </PageLayout>
      </AuraTheme>
    </MemoryRouter>
  );
};