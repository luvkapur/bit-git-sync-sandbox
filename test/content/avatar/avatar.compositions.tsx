import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuraTheme } from '@luvktest/test.aura-theme';
import { Avatar, type AvatarProps } from './avatar.js';
import type { AvatarStatusType } from './avatar-status-type.js';

const IMAGE_URL_ROKO = "https://images.unsplash.com/photo-1509399693673-755307bfc4e1?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdHxlbnwxfDJ8fGJsdWV8MTc0OTczNTY0NHww&ixlib=rb-4.1.0";
const IMAGE_URL_SUNGLASSES = "https://images.unsplash.com/photo-1562783530-df27356a200d?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwzfHxwb3J0cmFpdHxlbnwxfDJ8fGJsdWV8MTc0OTczNTY0NHww&ixlib=rb-4.1.0";
const IMAGE_URL_WINTER_COAT = "https://images.unsplash.com/photo-1616339777117-5ca1e2e9811b?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHw0fHxwb3J0cmFpdHxlbnwxfDJ8fGJsdWV8MTc0OTczNTY0NHww&ixlib=rb-4.1.0";
const INVALID_IMAGE_URL = "https://example.com/invalid-image.png";


// Helper for layout in compositions
const CompositionRow = ({ title, children, style }: { title: string, children: React.ReactNode, style?: React.CSSProperties }) => (
  <div style={{ marginBottom: '32px', ...style }}>
    <h3 style={{ 
      fontFamily: 'var(--typography-font-family)', 
      color: 'var(--colors-text-primary)',
      fontSize: 'var(--typography-sizes-heading-h5)',
      fontWeight: 'var(--typography-font-weight-semi-bold)',
      marginBottom: '16px',
      paddingBottom: '8px',
      borderBottom: '1px solid var(--colors-border-default)',
    }}>{title}</h3>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
      {children}
    </div>
  </div>
);

const CenteredContainer = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: '24px', backgroundColor: 'var(--colors-surface-background)', color: 'var(--colors-text-primary)', minHeight: '100vh' }}>
    {children}
  </div>
);

export const VariousAvatarTypes = () => (
  <MemoryRouter>
    <AuraTheme>
      <CenteredContainer>
        <CompositionRow title="Image Avatars">
          <Avatar src={IMAGE_URL_ROKO} alt="Roko" name="Roko" />
          <Avatar src={IMAGE_URL_SUNGLASSES} alt="Woman with sunglasses" name="Sunny Profile" />
          <Avatar src={IMAGE_URL_WINTER_COAT} alt="Woman in winter coat" name="Winter Look" />
        </CompositionRow>

        <CompositionRow title="Initials Avatars">
          <Avatar name="Jane Doe" alt="Avatar for Jane Doe" />
          <Avatar name="Bit" alt="Avatar for Bit" />
          <Avatar name="User Example" alt="Avatar for User Example" />
           <Avatar name="A" alt="Avatar for A" />
        </CompositionRow>

        <CompositionRow title="Default & Fallback Avatars">
          <Avatar alt="Default user avatar" />
          <Avatar src={INVALID_IMAGE_URL} name="Error Prone" alt="Error Prone's avatar" />
          <Avatar src={INVALID_IMAGE_URL} alt="Fallback to default image" />
        </CompositionRow>
      </CenteredContainer>
    </AuraTheme>
  </MemoryRouter>
);

export const AvatarSizingAndShapes = () => (
  <MemoryRouter>
    <AuraTheme>
      <CenteredContainer>
        <CompositionRow title="Avatar Sizes (Circle)">
          <Avatar src={IMAGE_URL_ROKO} alt="Roko small" name="Roko" size="small" />
          <Avatar src={IMAGE_URL_ROKO} alt="Roko medium" name="Roko" size="medium" />
          <Avatar src={IMAGE_URL_ROKO} alt="Roko large" name="Roko" size="large" />
          <Avatar src={IMAGE_URL_ROKO} alt="Roko xlarge" name="Roko" size="xlarge" />
        </CompositionRow>

        <CompositionRow title="Avatar Shapes (Medium Size)">
          <Avatar src={IMAGE_URL_SUNGLASSES} alt="Woman circle" name="Sunny P" size="medium" shape="circle" />
          <Avatar src={IMAGE_URL_SUNGLASSES} alt="Woman rounded" name="Sunny P" size="medium" shape="rounded" />
          <Avatar src={IMAGE_URL_SUNGLASSES} alt="Woman square" name="Sunny P" size="medium" shape="square" />
        </CompositionRow>
        
        <CompositionRow title="Sizes with Initials">
          <Avatar name="SN" alt="SN small" size="small" shape="rounded"/>
          <Avatar name="MD" alt="MD medium" size="medium" shape="rounded"/>
          <Avatar name="LG" alt="LG large" size="large" shape="rounded"/>
          <Avatar name="XL" alt="XL xlarge" size="xlarge" shape="rounded"/>
        </CompositionRow>
      </CenteredContainer>
    </AuraTheme>
  </MemoryRouter>
);

export const AvatarWithStatusIndicators = () => {
  const statuses: AvatarStatusType[] = ['online', 'offline', 'busy', 'away'];
  const positions: AvatarProps['statusPosition'][] = ['bottom-right', 'top-right', 'bottom-left', 'top-left'];

  return (
    <MemoryRouter>
      <AuraTheme>
        <CenteredContainer>
          <CompositionRow title="Status Types (bottom-right)">
            {statuses.map(status => (
              <Avatar 
                key={status} 
                src={IMAGE_URL_WINTER_COAT} 
                name="Winter Look"
                alt={`User is ${status}`} 
                status={status} 
                size="large" 
              />
            ))}
          </CompositionRow>
          
          <CompositionRow title="Status Types with Initials (bottom-right)">
            {statuses.map(status => (
              <Avatar 
                key={`initials-${status}`}
                name="WS"
                alt={`User WS is ${status}`} 
                status={status} 
                size="large" 
              />
            ))}
          </CompositionRow>

          <CompositionRow title="Status Positions (online status)">
            {positions.map(position => (
              <Avatar 
                key={position} 
                src={IMAGE_URL_ROKO} 
                name="Roko"
                alt={`Roko online, indicator ${position}`} 
                status="online" 
                statusPosition={position} 
                size="large" 
              />
            ))}
          </CompositionRow>
          
          <CompositionRow title="Status on Different Shapes">
             <Avatar src={IMAGE_URL_SUNGLASSES} name="S G" alt="S G online circle" status="online" size="large" shape="circle" />
             <Avatar src={IMAGE_URL_SUNGLASSES} name="S G" alt="S G busy rounded" status="busy" size="large" shape="rounded" />
             <Avatar src={IMAGE_URL_SUNGLASSES} name="S G" alt="S G away square" status="away" size="large" shape="square" />
          </CompositionRow>
        </CenteredContainer>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const ClickableAvatar = () => (
  <MemoryRouter>
    <AuraTheme>
      <CenteredContainer>
        <CompositionRow title="Clickable Avatars">
          <Avatar 
            src={IMAGE_URL_ROKO} 
            name="Roko" 
            alt="Clickable Roko" 
            size="large" 
            onClick={() => alert('Roko (image) clicked!')} 
          />
          <Avatar 
            name="Click Me" 
            alt="Clickable initials CM" 
            size="large" 
            onClick={() => alert('CM (initials) clicked!')} 
          />
           <Avatar 
            src={IMAGE_URL_WINTER_COAT}
            name="Winter Interaction"
            alt="Clickable avatar with online status"
            size="large"
            status="online"
            shape="rounded"
            onClick={() => alert('Winter avatar with status clicked!')}
          />
        </CompositionRow>
      </CenteredContainer>
    </AuraTheme>
  </MemoryRouter>
);