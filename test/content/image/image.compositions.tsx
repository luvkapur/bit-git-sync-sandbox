import React from 'react';
import { AuraTheme } from '@luvktest/test.aura-theme';
import { Image } from './image.js';

const commonWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  padding: '20px',
  backgroundColor: 'var(--colors-surface-background)',
  color: 'var(--colors-text-primary)',
  fontFamily: 'var(--typography-font-family)',
};

const imageContainerStyle: React.CSSProperties = {
  maxWidth: '500px', // Limiting width for better visual in compositions
  border: '1px dashed var(--colors-border-default)',
  padding: '10px',
  borderRadius: 'var(--borders-radius-large)',
  backgroundColor: 'var(--colors-surface-primary)'
};


export const BasicImage = () => {
  return (
    <AuraTheme>
      <div style={commonWrapperStyle}>
        <h2>Basic Image (Default Props)</h2>
        <div style={imageContainerStyle}>
          <Image />
        </div>
        <p>Description: Uses the default src and alt text. Responsive by default.</p>
      </div>
    </AuraTheme>
  );
};

export const ImageWithCustomSourceAndAlt = () => {
  return (
    <AuraTheme>
      <div style={commonWrapperStyle}>
        <h2>Image with Custom Source and Alt Text</h2>
        <div style={imageContainerStyle}>
          <Image
            src="https://images.unsplash.com/photo-1646315026047-c424f211e5bd?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMGJsdWUlMjBnZW9tZXRyaWN8ZW58MXwwfHxibHVlfDE3NDk3NzYzNzR8MA&ixlib=rb-4.1.0"
            alt="Hope - a blue wall with a yellow light coming from it"
          />
        </div>
         <p>Description: Displays a custom image with its descriptive alt text.</p>
      </div>
    </AuraTheme>
  );
};

export const ImageWithDefinedDimensions = () => {
  return (
    <AuraTheme>
      <div style={commonWrapperStyle}>
        <h2>Image with Defined Dimensions (Width and Height)</h2>
        <div style={{ ...imageContainerStyle, width: '300px', height: '200px', overflow: 'hidden' }}>
          <Image
            src="https://images.unsplash.com/photo-1653897221847-43eac640ddf8?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMGJsdWUlMjBnZW9tZXRyaWN8ZW58MXwwfHxibHVlfDE3NDk3NzYzNzR8MA&ixlib=rb-4.1.0"
            alt="Street light on a wire with a blue sky"
            width="100%"
            height="100%"
            objectFit="cover"
          />
        </div>
        <p>Description: Image constrained to 300x200px container using `objectFit: cover`.</p>
         <div style={{ ...imageContainerStyle, width: '300px', height: '200px', overflow: 'hidden', marginTop: '20px' }}>
          <Image
            src="https://images.unsplash.com/photo-1653897221847-43eac640ddf8?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMGJsdWUlMjBnZW9tZXRyaWN8ZW58MXwwfHxibHVlfDE3NDk3NzYzNzR8MA&ixlib=rb-4.1.0"
            alt="Street light on a wire with a blue sky"
            width="300" // number for pixels
            height="200" // number for pixels
            objectFit="contain"
          />
        </div>
        <p>Description: Image with specific pixel dimensions (300x200px) using `objectFit: contain`.</p>
      </div>
    </AuraTheme>
  );
};


export const ImageWithDifferentObjectFit = () => {
  return (
    <AuraTheme>
      <div style={commonWrapperStyle}>
        <h2>Image with `objectFit: contain`</h2>
        <div style={{ ...imageContainerStyle, width: '400px', height: '250px', backgroundColor: 'var(--colors-surface-secondary)' }}>
          <Image
            src="https://images.unsplash.com/photo-1712758602087-b0c4262eacdd?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHw0fHxhYnN0cmFjdCUyMGJsdWUlMjBnZW9tZXRyaWN8ZW58MXwwfHxibHVlfDE3NDk3NzYzNzR8MA&ixlib=rb-4.1.0"
            alt="Architectural detail of a mosque"
            width="100%"
            height="100%"
            objectFit="contain"
          />
        </div>
        <p>Description: The entire image is scaled down to fit within the container while maintaining its aspect ratio. Background color of container shows if aspect ratios differ.</p>
      </div>
    </AuraTheme>
  );
};