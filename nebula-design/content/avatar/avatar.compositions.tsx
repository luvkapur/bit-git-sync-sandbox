import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';
import { Avatar, type AvatarProps } from './avatar.js';
import type { AvatarStatusType } from './avatar-status-type.js';

const IMAGE_URL_1 = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwxfHx1c2VyJTIwYXZhdGFyfGVufDB8fHx8MTcwMzk1NzYxNXww&ixlib=rb-4.0.3&w=200&h=200&fit=crop";
const IMAGE_URL_2 = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwyfHx1c2VyJTIwcG9ydHJhaXR8ZW58MHx8fHwxNzAzOTU3NjQ1fDA&ixlib=rb-4.0.3&w=200&h=200&fit=crop";
const IMAGE_URL_3 = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwzfHx1c2VyJTIwZmFjZXxlbnwwfHx8fDE3MDM5NTc2NzN8MA&ixlib=rb-4.0.3&w=200&h=200&fit=crop";
const INVALID_IMAGE_URL = "https://example.com/nonexistent-image.png";

const CenteredContainer = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    padding: 'var(--spacing-xl)',
    backgroundColor: 'var(--colors-surface-background)',
    color: 'var(--colors-text-default)',
    minHeight: '100vh',
    fontFamily: 'var(--typography-font-family)',
  }}>
    {children}
  </div>
);

const CompositionRow = ({ title, children, style }: { title: string, children: React.ReactNode, style?: React.CSSProperties }) => (
  <div style={{ marginBottom: 'var(--spacing-l)', ...style }}>
    <h3 style={{
      fontFamily: 'var(--typography-font-family)',
      color: 'var(--colors-text-default)',
      // Using a hardcoded value as specific headline tokens might not map directly to h3 size
      fontSize: '1.5rem', // Example size for h3
      fontWeight: 600, // Example: semi-bold
      marginBottom: 'var(--spacing-m)',
      paddingBottom: 'var(--spacing-s)',
      borderBottom: '1px solid var(--colors-border-subtle)',
    }}>{title}</h3>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-m)', alignItems: 'center' }}>
      {children}
    </div>
  </div>
);

export const BasicAvatars = () => (
  <MemoryRouter>
    <NebulaTheme>
      <CenteredContainer>
        <CompositionRow title="Image Avatars">
          <Avatar src={IMAGE_URL_1} alt="User One" name="User One" />
          <Avatar src={IMAGE_URL_2} alt="User Two" name="User Two" />
          <Avatar src={IMAGE_URL_3} alt="User Three" name="User Three" />
        </CompositionRow>

        <CompositionRow title="Initials Avatars">
          <Avatar name="Nova Spark" alt="Avatar for Nova Spark" />
          <Avatar name="Nebula" alt="Avatar for Nebula" />
          <Avatar name="Alex Rider" alt="Avatar for Alex Rider" />
          <Avatar name="Z" alt="Avatar for Z" />
        </CompositionRow>

        <CompositionRow title="Fallback & Default Avatars">
          <Avatar alt="Default avatar" />
          <Avatar src={INVALID_IMAGE_URL} name="Invalid Img" alt="Invalid image, fallback to initials" />
          <Avatar src={INVALID_IMAGE_URL} alt="Invalid image, fallback to placeholder" />
        </CompositionRow>
      </CenteredContainer>
    </NebulaTheme>
  </MemoryRouter>
);

export const SizedAndShapedAvatars = () => (
  <MemoryRouter>
    <NebulaTheme>
      <CenteredContainer>
        <CompositionRow title="Avatar Sizes (Circle)">
          <Avatar src={IMAGE_URL_1} alt="Nova small" name="Nova Spark" size="small" />
          <Avatar src={IMAGE_URL_1} alt="Nova medium" name="Nova Spark" size="medium" />
          <Avatar src={IMAGE_URL_1} alt="Nova large" name="Nova Spark" size="large" />
          <Avatar src={IMAGE_URL_1} alt="Nova xlarge" name="Nova Spark" size="xlarge" />
        </CompositionRow>

        <CompositionRow title="Avatar Shapes (Medium Size)">
          <Avatar src={IMAGE_URL_2} alt="Alex circle" name="Alex Rider" size="medium" shape="circle" />
          <Avatar src={IMAGE_URL_2} alt="Alex rounded" name="Alex Rider" size="medium" shape="rounded" />
          <Avatar src={IMAGE_URL_2} alt="Alex square" name="Alex Rider" size="medium" shape="square" />
        </CompositionRow>

        <CompositionRow title="Sizes with Initials (Rounded)">
          <Avatar name="NS" alt="NS small" size="small" shape="rounded" />
          <Avatar name="AR" alt="AR medium" size="medium" shape="rounded" />
          <Avatar name="LG" alt="LG large" size="large" shape="rounded" />
          <Avatar name="XL" alt="XL xlarge" size="xlarge" shape="rounded" />
        </CompositionRow>
      </CenteredContainer>
    </NebulaTheme>
  </MemoryRouter>
);

export const AvatarsWithStatus = () => {
  const statuses: AvatarStatusType[] = ['online', 'offline', 'busy', 'away'];
  const positions: AvatarProps['statusPosition'][] = ['bottom-right', 'top-right', 'bottom-left', 'top-left'];

  return (
    <MemoryRouter>
      <NebulaTheme>
        <CenteredContainer>
          <CompositionRow title="Status Types (Large, bottom-right)">
            {statuses.map(status => (
              <Avatar
                key={status}
                src={IMAGE_URL_3}
                name="Zoe Lightyear"
                alt={`Zoe is ${status}`}
                status={status}
                size="large"
              />
            ))}
          </CompositionRow>

          <CompositionRow title="Status Types with Initials (Large, bottom-right)">
            {statuses.map(status => (
              <Avatar
                key={`initials-${status}`}
                name="ZL"
                alt={`User ZL is ${status}`}
                status={status}
                size="large"
              />
            ))}
          </CompositionRow>

          <CompositionRow title="Status Positions (Online, Large)">
            {positions.map(position => (
              <Avatar
                key={position}
                src={IMAGE_URL_1}
                name="Nova Spark"
                alt={`Nova online, indicator ${position}`}
                status="online"
                statusPosition={position}
                size="large"
              />
            ))}
          </CompositionRow>

          <CompositionRow title="Status on Different Shapes (Large)">
             <Avatar src={IMAGE_URL_2} name="Alex Rider" alt="Alex online circle" status="online" size="large" shape="circle" />
             <Avatar src={IMAGE_URL_2} name="Alex Rider" alt="Alex busy rounded" status="busy" size="large" shape="rounded" />
             <Avatar src={IMAGE_URL_2} name="Alex Rider" alt="Alex away square" status="away" size="large" shape="square" />
          </CompositionRow>
        </CenteredContainer>
      </NebulaTheme>
    </MemoryRouter>
  );
};

export const InteractiveAvatars = () => (
  <MemoryRouter>
    <NebulaTheme>
      <CenteredContainer>
        <CompositionRow title="Clickable Avatars (Large)">
          <Avatar
            src={IMAGE_URL_1}
            name="Nova Spark"
            alt="Clickable Nova"
            size="large"
            onClick={() => alert('Nova Spark (image) clicked!')}
          />
          <Avatar
            name="Click Me"
            alt="Clickable initials CM"
            size="large"
            onClick={() => alert('CM (initials) clicked!')}
          />
           <Avatar
            src={IMAGE_URL_3}
            name="Zoe Lightyear"
            alt="Clickable avatar with online status"
            size="large"
            status="online"
            shape="rounded"
            onClick={() => alert('Zoe (status) clicked!')}
          />
        </CompositionRow>
      </CenteredContainer>
    </NebulaTheme>
  </MemoryRouter>
);