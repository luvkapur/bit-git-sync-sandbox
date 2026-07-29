import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuraTheme } from '@luvktest/test.aura-theme';
import { Icon } from './icon.js';

const ExamplePaths = {
  star: <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />,
  heart: <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />,
  settings: <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22-.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />,
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  padding: '20px',
  alignItems: 'flex-start',
  backgroundColor: 'var(--colors-surface-background)',
  fontFamily: 'var(--typography-font-family)',
  color: 'var(--colors-text-primary)',
};

const iconGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '15px',
  alignItems: 'center',
  border: '1px solid var(--colors-border-default)',
  padding: '15px',
  borderRadius: 'var(--borders-radius-medium)',
  backgroundColor: 'var(--colors-surface-primary)'
};

export const BasicIcons = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <div style={containerStyle}>
          <h3>Basic Icons (Default Size and Color)</h3>
          <div style={iconGroupStyle}>
            <Icon title="Star Icon">{ExamplePaths.star}</Icon>
            <Icon title="Heart Icon">{ExamplePaths.heart}</Icon>
            <Icon title="Settings Icon">{ExamplePaths.settings}</Icon>
            <span>Default size (24px), color (currentColor)</span>
          </div>
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const SizedAndColoredIcons = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <div style={containerStyle}>
          <h3>Sized and Colored Icons</h3>
          <div style={iconGroupStyle}>
            <Icon size={16} color="var(--colors-primary-default)" title="Small Primary Star">
              {ExamplePaths.star}
            </Icon>
            <Icon size={32} color="var(--colors-status-positive-default)" title="Medium Success Heart">
              {ExamplePaths.heart}
            </Icon>
            <Icon size="3em" color="var(--colors-text-interactive-default)" title="Large Interactive Settings">
              {ExamplePaths.settings}
            </Icon>
             <span>Custom sizes and colors using theme variables</span>
          </div>

          <div style={iconGroupStyle}>
            <Icon size={40} color="#FF00FF" title="Magenta Star">
              {ExamplePaths.star}
            </Icon>
            <Icon size={40} fill="#00FFFF" title="Cyan Heart (using fill prop)">
              {ExamplePaths.heart}
            </Icon>
             <span>Custom sizes and direct hex/fill colors</span>
          </div>
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const ClickableAndAccessibleIcons = () => {
  const handleClick = (iconName: string) => {
    // eslint-disable-next-line no-alert
    alert(`${iconName} icon clicked!`);
  };

  return (
    <MemoryRouter>
      <AuraTheme>
        <div style={containerStyle}>
          <h3>Clickable and Accessible Icons</h3>
          <div style={iconGroupStyle}>
            <Icon
              size={30}
              color="var(--colors-text-interactive-default)"
              onClick={() => handleClick('Star')}
              title="Clickable Star Icon"
            >
              {ExamplePaths.star}
            </Icon>
            <Icon
              size={30}
              color="var(--colors-primary-default)"
              onClick={() => handleClick('Heart')}
              title="Clickable Heart Icon"
            >
              {ExamplePaths.heart}
            </Icon>
            <Icon
              size={30}
              onClick={() => handleClick('Settings')}
              title="Clickable Settings Icon (default color)"
            >
              {ExamplePaths.settings}
            </Icon>
            <span>These icons are clickable and have accessible titles.</span>
          </div>
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const CustomViewBoxIcon = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <div style={containerStyle}>
          <h3>Icon with Custom ViewBox</h3>
          <div style={iconGroupStyle}>
            <Icon size={50} viewBox="0 0 48 48" color="var(--colors-secondary-default)" title="Settings with custom viewBox">
              {/* A simple circle, assuming it's defined within a 0 0 48 48 coordinate system */}
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" fill="none" />
              {ExamplePaths.settings}
            </Icon>
            <span>Icon with a viewBox of "0 0 48 48" (original path might look small or offset if not designed for it)</span>
          </div>
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};