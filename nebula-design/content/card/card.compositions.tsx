import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';
import { Card } from './card.js';

const commonCardStyle: React.CSSProperties = {
  width: '320px',
  minHeight: '200px',
  display: 'flex', // Ensure cards in a row maintain similar height if content differs
  flexDirection: 'column',
};

const containerStyle: React.CSSProperties = {
  padding: 'var(--spacing-l)',
  display: 'flex',
  gap: 'var(--spacing-l)',
  flexWrap: 'wrap',
  justifyContent: 'center', // Center cards for better visual appeal
  alignItems: 'flex-start', // Align cards to the top
  backgroundColor: 'var(--colors-surface-background)',
  fontFamily: 'var(--typography-font-family)',
  minHeight: '100vh',
  boxSizing: 'border-box',
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: 'var(--colors-primary-default)',
  color: 'var(--colors-text-inverse) !important',
  border: 'none',
  padding: 'var(--spacing-s) var(--spacing-m)',
  borderRadius: 'var(--borders-radius-medium)',
  cursor: 'var(--interactions-cursor-pointer)',
  fontFamily: 'var(--typography-font-family)',
  fontSize: '0.9rem',
  fontWeight: 500,
  textDecoration: 'none',
  display: 'inline-block',
  textAlign: 'center',
};

export const BasicNebulaCards = () => {
  return (
    <MemoryRouter>
      <NebulaTheme>
        <div style={containerStyle}>
          <Card
            title="Cosmic Journey"
            variant="default"
            image="https://images.unsplash.com/photo-1716783180490-baa23cc73f97?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwxfHxuZWJ1bGElMjBhYnN0cmFjdHxlbnwxfDJ8fHB1cnBsZXwxNzQ5Nzc2OTU2fDA&ixlib=rb-4.1.0"
            imageAlt="A purple and blue background with stars"
            style={commonCardStyle}
          >
            <p>Explore the vastness of space and celestial wonders with the Nebula theme. This is a default card style.</p>
          </Card>
          <Card
            title="Star Cluster"
            variant="elevated"
            image="https://images.unsplash.com/photo-1650034704435-a5a3914d74be?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwyfHxuZWJ1bGElMjBhYnN0cmFjdHxlbnwxfDJ8fHB1cnBsZXwxNzQ5Nzc2OTU2fDA&ixlib=rb-4.1.0"
            imageAlt="An abstract purple background with wavy lines"
            style={commonCardStyle}
          >
            <p>Witness the breathtaking beauty of distant star clusters. This card uses an elevated style for more emphasis.</p>
          </Card>
          <Card
            title="Galactic Flora"
            variant="outlined"
            image="https://images.unsplash.com/photo-1587482441612-88961f462900?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwzfHxuZWJ1bGElMjBhYnN0cmFjdHxlbnwxfDJ8fHB1cnBsZXwxNzQ5Nzc2OTU2fDA&ixlib=rb-4.1.0"
            imageAlt="Green and white floral textile, representing alien flora"
            style={commonCardStyle}
          >
            <p>Discover unique and vibrant plant life from uncharted galaxies. This card features an outlined style.</p>
          </Card>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};

export const NebulaCardsWithHeaderAndFooter = () => {
  return (
    <MemoryRouter>
      <NebulaTheme>
        <div style={containerStyle}>
          <Card
            header={<h4 style={{ margin: 0, color: 'var(--colors-text-secondary)' }}>Featured Discovery</h4>}
            title="Nebula Prime System"
            image="https://images.unsplash.com/photo-1587482401476-b50505060c39?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHw0fHxuZWJ1bGElMjBhYnN0cmFjdHxlbnwxfDJ8fHB1cnBsZXwxNzQ5Nzc2OTU2fDA&ixlib=rb-4.1.0"
            imageAlt="Green plant on green wall, symbolizing a new ecosystem"
            footer={<button style={buttonStyle}>Learn More</button>}
            style={commonCardStyle}
          >
            <p>Unveiling the secrets of the newly discovered Nebula Prime, a system teeming with potential for life.</p>
          </Card>
          <Card
            header={<h5 style={{ margin: 0, color: 'var(--colors-text-interactive-default)'}}>System Update</h5>}
            title="Aura Core Integration"
            image="https://images.unsplash.com/photo-1587482610670-78d9c2a40d10?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHw1fHxuZWJ1bGElMjBhYnN0cmFjdHxlbnwxfDJ8fHB1cnBsZXwxNzQ5Nzc2OTU2fDA&ixlib=rb-4.1.0"
            imageAlt="White and green floral textile, representing harmony"
            footer={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ color: 'var(--colors-text-success)'}}>Status: Complete</span>
                <a href="#details" style={buttonStyle}>View Details</a>
              </div>
            }
            style={commonCardStyle}
          >
            <p>Successfully integrated Aura design foundation with the Nebula theme, enhancing composability.</p>
          </Card>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};

export const InteractiveNebulaCards = () => {
  return (
    <MemoryRouter>
      <NebulaTheme>
        <div style={containerStyle}>
          <Card
            title="Quantum Leap"
            interactive
            image="https://images.unsplash.com/photo-1698732308311-98592dadedcc?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHw2fHxuZWJ1bGElMjBhYnN0cmFjdHxlbnwxfDJ8fHB1cnBsZXwxNzQ5Nzc2OTU2fDA&ixlib=rb-4.1.0"
            imageAlt="A blurry image of a hand reaching out, symbolizing interaction"
            style={commonCardStyle}
          >
            <p>Experience interactive technology from the future. Hover or focus on this card to see the effect.</p>
          </Card>
          <Card
            title="Join the Voyage"
            interactive
            variant="elevated"
            style={commonCardStyle}
            footer={<button style={{...buttonStyle, width: '100%'}}>Embark Now</button>}
          >
            <p>Click to embark on an interstellar adventure through the Nebula. This elevated card is also interactive.</p>
          </Card>
           <Card
            title="Nebula Archives"
            interactive
            variant="outlined"
            style={commonCardStyle}
          >
            <p>Access the vast archives of Nebula. An interactive outlined card for a sleek, modern feel.</p>
          </Card>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};