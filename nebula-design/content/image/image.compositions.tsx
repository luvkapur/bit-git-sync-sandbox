import React from 'react';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';
import { Image } from './image.js';

const commonWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-l)',
  padding: 'var(--spacing-l)',
  backgroundColor: 'var(--colors-surface-background)',
  color: 'var(--colors-text-default)',
  fontFamily: 'var(--typography-font-family)',
  minHeight: 'calc(100vh - 2 * var(--spacing-l))', // Account for padding
};

const imageSectionStyle: React.CSSProperties = {
  padding: 'var(--spacing-m)',
  borderRadius: 'var(--borders-radius-container)',
  backgroundColor: 'var(--colors-surface-primary)',
  boxShadow: 'var(--shadows-medium)',
};

const imageContainerStyle: React.CSSProperties = {
  border: '1px dashed var(--colors-border-subtle)',
  padding: 'var(--spacing-s)',
  borderRadius: 'var(--borders-radius-large)',
  backgroundColor: 'var(--colors-surface-secondary)', // To highlight image transparency or object-fit effects
  display: 'inline-flex', // To wrap the image tightly
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden', // Important for object-fit demonstrations
};

const imageTitleStyle: React.CSSProperties = {
  color: 'var(--colors-text-default)',
  marginBlockStart: '0',
  marginBlockEnd: 'var(--spacing-m)',
  fontSize: '1.5rem', // Using a static value as specific typography tokens for this level might not be available
};

const imageDescriptionStyle: React.CSSProperties = {
  color: 'var(--colors-text-secondary)',
  marginTop: 'var(--spacing-s)',
  fontSize: '0.9rem', // Using a static value
};

export const BasicImageWithNebulaTheme = () => {
  return (
    <NebulaTheme>
      <div style={commonWrapperStyle}>
        <div style={imageSectionStyle}>
          <h2 style={imageTitleStyle}>Basic Image (Default Props)</h2>
          <div style={imageContainerStyle}>
            <Image />
          </div>
          <p style={imageDescriptionStyle}>
            Displays the default image with default alt text.
            Styled with Nebula theme tokens for border radius and shadow.
            The background color of the image element itself (surface-secondary) is visible if the image is transparent or during load.
          </p>
        </div>
      </div>
    </NebulaTheme>
  );
};

export const ImageWithCustomSourceAndNebulaTheme = () => {
  return (
    <NebulaTheme>
      <div style={commonWrapperStyle}>
        <div style={imageSectionStyle}>
          <h2 style={imageTitleStyle}>Image with Custom Source and Alt Text</h2>
          <div style={imageContainerStyle}>
            <Image
              src="https://images.unsplash.com/photo-1646315026047-c424f211e5bd?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMGJsdWUlMjBnZW9tZXRyaWN8ZW58MXwwfHxibHVlfDE3NDk3NzYzNzR8MA&ixlib=rb-4.1.0"
              alt="Futuristic blue and purple abstract design"
            />
          </div>
          <p style={imageDescriptionStyle}>
            Displays a custom image with specific alternative text.
            This demonstrates using different visual assets.
          </p>
        </div>
      </div>
    </NebulaTheme>
  );
};

export const ImageWithSizingAndObjectFitNebula = () => {
  const customImageSrc = "https://images.unsplash.com/photo-1653897221847-43eac640ddf8?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMGJsdWUlMjBnZW9tZXRyaWN8ZW58MXwwfHxibHVlfDE3NDk3NzYzNzR8MA&ixlib=rb-4.1.0";
  const customAltText = "Geometric structure with blue and yellow tones";

  return (
    <NebulaTheme>
      <div style={commonWrapperStyle}>
        <div style={imageSectionStyle}>
          <h2 style={imageTitleStyle}>Image Sizing and Object Fit</h2>

          <h3 style={{ ...imageTitleStyle, fontSize: '1.2rem', marginTop: 'var(--spacing-l)' }}>Object Fit: Cover (Default)</h3>
          <div style={{ ...imageContainerStyle, width: '300px', height: '200px' }}>
            <Image
              src={customImageSrc}
              alt={`${customAltText} - Cover`}
              width="100%"
              height="100%"
              objectFit="cover"
            />
          </div>
          <p style={imageDescriptionStyle}>
            <code>objectFit: "cover"</code> (default). The image fills the dimensions, maintaining aspect ratio and cropping if necessary.
            Container: 300x200px. Image: 100% width/height of container.
          </p>

          <h3 style={{ ...imageTitleStyle, fontSize: '1.2rem', marginTop: 'var(--spacing-l)' }}>Object Fit: Contain</h3>
          <div style={{ ...imageContainerStyle, width: '300px', height: '200px' }}>
            <Image
              src={customImageSrc}
              alt={`${customAltText} - Contain`}
              width="100%"
              height="100%"
              objectFit="contain"
            />
          </div>
          <p style={imageDescriptionStyle}>
            <code>objectFit: "contain"</code>. The image is scaled down to fit within the container while maintaining its aspect ratio.
            The container's background (surface-secondary) shows if aspect ratios differ.
          </p>

          <h3 style={{ ...imageTitleStyle, fontSize: '1.2rem', marginTop: 'var(--spacing-l)' }}>Object Fit: Fill</h3>
          <div style={{ ...imageContainerStyle, width: '300px', height: '200px' }}>
            <Image
              src={customImageSrc}
              alt={`${customAltText} - Fill`}
              width="100%"
              height="100%"
              objectFit="fill"
            />
          </div>
          <p style={imageDescriptionStyle}>
            <code>objectFit: "fill"</code>. The image is stretched to fill the container, ignoring its aspect ratio.
          </p>

          <h3 style={{ ...imageTitleStyle, fontSize: '1.2rem', marginTop: 'var(--spacing-l)' }}>Fixed Pixel Dimensions</h3>
           <div style={{ ...imageContainerStyle, width: 'auto', height: 'auto' }}> {/* Container adjusts to image */}
            <Image
              src="https://images.unsplash.com/photo-1712758602087-b0c4262eacdd?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHw0fHxhYnN0cmFjdCUyMGJsdWUlMjBnZW9tZXRyaWN8ZW58MXwwfHxibHVlfDE3NDk3NzYzNzR8MA&ixlib=rb-4.1.0"
              alt="Architectural detail - Fixed Dimensions"
              width={150} // pixels
              height={100} // pixels
              objectFit="cover" // cover is good for fixed dimensions too
            />
          </div>
          <p style={imageDescriptionStyle}>
            Image with explicit pixel dimensions (150x100px).
            The <code>objectFit</code> property still applies within these dimensions if the image's aspect ratio differs.
          </p>
        </div>
      </div>
    </NebulaTheme>
  );
};