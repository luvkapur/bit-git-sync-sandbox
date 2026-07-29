import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';
import { Icon } from './icon.js';

const ExamplePaths = {
  star: <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />,
  heart: <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />,
  settings: <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22-.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />,
  home: <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />,
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-l)',
  padding: 'var(--spacing-l)',
  fontFamily: 'var(--typography-font-family)',
  color: 'var(--colors-text-default)', // Nebula text default
  backgroundColor: 'var(--colors-surface-background)', // Nebula surface background
  minHeight: '100vh',
};

const iconGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: 'var(--spacing-m)',
  alignItems: 'center',
  border: '1px solid var(--colors-border-default)', // Nebula border
  padding: 'var(--spacing-m)',
  borderRadius: 'var(--borders-radius-container)', // Nebula container radius
  backgroundColor: 'var(--colors-surface-primary)', // Nebula surface primary
};

const h3Style: React.CSSProperties = {
  color: 'var(--colors-text-default)',
  fontFamily: 'var(--typography-font-family)', // Nebula heading font (Inter) will be applied via NebulaTheme if configured
  margin: '0 0 var(--spacing-s) 0',
};

export const BasicIconsInNebula = () => {
  return (
    <MemoryRouter>
      <NebulaTheme>
        <div style={containerStyle}>
          <h3 style={h3Style}>Basic Icons in Nebula (Default & Nebula Colors)</h3>
          <div style={iconGroupStyle}>
            <Icon title="Home Icon (default color)">{ExamplePaths.home}</Icon>
            <Icon title="Star Icon (default color)">{ExamplePaths.star}</Icon>
            <Icon title="Heart Icon (default color)">{ExamplePaths.heart}</Icon>
            <Icon title="Settings Icon (default color)">{ExamplePaths.settings}</Icon>
            <span>Default size (24px), color (currentColor from Nebula text)</span>
          </div>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};

export const StyledIconsInNebula = () => {
  return (
    <MemoryRouter>
      <NebulaTheme>
        <div style={containerStyle}>
          <h3 style={h3Style}>Sized and Colored Icons with Nebula Theme</h3>
          <div style={iconGroupStyle}>
            <Icon size={16} color="var(--colors-primary-default)" title="Small Primary Home">
              {ExamplePaths.home}
            </Icon>
            <Icon size={32} color="var(--colors-status-success-default)" title="Medium Success Star">
              {ExamplePaths.star}
            </Icon>
            <Icon size="3em" color="var(--colors-text-interactive-default)" title="Large Interactive Heart">
              {ExamplePaths.heart}
            </Icon>
            <Icon size={40} color="var(--colors-secondary-default)" title="X-Large Secondary Settings">
              {ExamplePaths.settings}
            </Icon>
            <span>Custom sizes & Nebula theme colors</span>
          </div>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};

export const ClickableIconsInNebula = () => {
  const handleClick = (iconName: string) => {
    // eslint-disable-next-line no-alert
    alert(`${iconName} icon clicked! Check console for event.`);
  };

  return (
    <MemoryRouter>
      <NebulaTheme>
        <div style={containerStyle}>
          <h3 style={h3Style}>Clickable and Accessible Icons in Nebula</h3>
          <div style={iconGroupStyle}>
            <Icon
              size={30}
              color="var(--colors-text-interactive-default)" // Nebula interactive color
              onClick={(e) => {
                console.log('Home icon clicked', e);
                handleClick('Home');
              }}
              title="Clickable Home Icon"
            >
              {ExamplePaths.home}
            </Icon>
            <Icon
              size={30}
              color="var(--colors-primary-default)" // Nebula primary color
              onClick={(e) => {
                console.log('Star icon clicked', e);
                handleClick('Star');
              }}
              title="Clickable Star Icon"
            >
              {ExamplePaths.star}
            </Icon>
            <Icon
              size={30}
              onClick={(e) => {
                console.log('Settings icon clicked', e);
                handleClick('Settings');
              }}
              title="Clickable Settings Icon (Nebula default color)"
            >
              {ExamplePaths.settings}
            </Icon>
            <span>Interactive icons with Nebula colors.</span>
          </div>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};