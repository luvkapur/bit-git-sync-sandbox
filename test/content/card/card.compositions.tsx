import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuraTheme } from '@luvktest/test.aura-theme';
import { Card } from './card.js';

const commonCardStyle: React.CSSProperties = {
  width: '300px', // Fixed width for better layout in compositions
  minHeight: '200px', // Ensure cards have some height even with minimal content
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: 'var(--colors-primary-default)',
  color: 'var(--colors-text-inverse)',
  border: 'none',
  padding: 'var(--spacing-small) var(--spacing-default)',
  borderRadius: 'var(--borders-radius-medium)',
  cursor: 'var(--interactions-cursor-pointer)',
  fontFamily: 'var(--typography-font-family)',
  fontSize: 'var(--typography-sizes-body-small)',
  fontWeight: 'var(--typography-font-weight-medium)',
};

const containerStyle: React.CSSProperties = {
  padding: 'var(--spacing-large)',
  display: 'flex',
  gap: 'var(--spacing-large)',
  flexWrap: 'wrap',
  backgroundColor: 'var(--colors-surface-background)', // To see cards against a themed background
};

export const BasicCards = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <div style={containerStyle}>
          <Card title="Simple Card" style={commonCardStyle}>
            <p>This is the content of a basic card. It's simple and clean.</p>
          </Card>
          <Card
            title="Card with Image"
            image="https://images.unsplash.com/photo-1650034704435-a5a3914d74be?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGdlb21ldHJpYyUyMHB1cnBsZXxlbnwxfDJ8fHB1cnBsZXwxNzQ5Nzc2MzcxfDA&ixlib=rb-4.1.0"
            imageAlt="Abstract purple background with wavy lines"
            style={commonCardStyle}
          >
            <p>This card includes an image at the top, making it more visually appealing.</p>
          </Card>
          <Card
            title="Interactive Card"
            interactive
            style={commonCardStyle}
          >
            <p>Hover over or focus on this card to see the interactive effect. Clickable!</p>
          </Card>
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const CardsWithHeaderAndFooter = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <div style={containerStyle}>
          <Card
            header={<h4>Featured Article</h4>}
            title="Article Title"
            footer={<button style={buttonStyle}>Read More</button>}
            style={commonCardStyle}
          >
            <p>This card demonstrates the header and footer sections, perfect for previews or summaries.</p>
          </Card>
          <Card
            image="https://images.unsplash.com/photo-1650406262076-c3444b5be6f6?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMGdlb21ldHJpYyUyMHB1cnBsZXxlbnwxfDJ8fHB1cnBsZXwxNzQ5Nzc2MzcxfDA&ixlib=rb-4.1.0"
            imageAlt="Purple fabric texture"
            header={<h5>Product Spotlight</h5>}
            title="Amazing Product"
            footer={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>$99.99</span>
                <button style={buttonStyle}>Add to Cart</button>
              </div>
            }
            interactive
            style={commonCardStyle}
          >
            <p>A full-featured card with image, header, footer, and interactive state.</p>
          </Card>
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const CardVariants = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <div style={containerStyle}>
          <Card
            variant="default"
            title="Default Card"
            style={commonCardStyle}
            image="https://images.unsplash.com/photo-1641797508847-146a742dbb88?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMGdlb21ldHJpYyUyMHB1cnBsZXxlbnwxfDJ8fHB1cnBsZXwxNzQ5Nzc2MzcxfDA&ixlib=rb-4.1.0"
            imageAlt="Purple bubbles"
          >
            <p>This is the standard card with a subtle shadow.</p>
          </Card>
          <Card
            variant="elevated"
            title="Elevated Card"
            style={commonCardStyle}
            image="https://images.unsplash.com/photo-1586137734035-c2526240c202?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHw0fHxhYnN0cmFjdCUyMGdlb21ldHJpYyUyMHB1cnBsZXxlbnwxfDJ8fHB1cnBsZXwxNzQ5Nzc2MzcxfDA&ixlib=rb-4.1.0"
            imageAlt="Green leaf tree under blue sky"
            interactive
          >
            <p>This card has a more prominent shadow, appearing raised. It's also interactive.</p>
          </Card>
          <Card
            variant="outlined"
            title="Outlined Card"
            style={commonCardStyle}
            image="https://images.unsplash.com/photo-1716783180490-baa23cc73f97?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHw1fHxhYnN0cmFjdCUyMGdlb21ldHJpYyUyMHB1cnBsZXxlbnwxfDJ8fHB1cnBsZXwxNzQ5Nzc2MzcxfDA&ixlib=rb-4.1.0"
            imageAlt="Purple and blue background with stars"
          >
            <p>This card uses a border instead of a shadow for a flatter design.</p>
          </Card>
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};