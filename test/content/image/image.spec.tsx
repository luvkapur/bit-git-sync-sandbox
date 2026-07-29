import React from 'react';
import { render } from '@testing-library/react';
import { Image } from './image.js';
import styles from './image.module.scss';

describe('Image Component', () => {
  it('should render the image with default props', () => {
    const { container } = render(<Image />);
    const image = container.querySelector('img');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', expect.stringContaining('unsplash.com'));
    expect(image).toHaveAttribute('alt', 'Abstract blue geometric background');
  });

  it('should render the image with custom props', () => {
    const customSrc = 'https://example.com/image.jpg';
    const customAlt = 'Custom alt text';
    const { container } = render(<Image src={customSrc} alt={customAlt} width={300} height={200} />);
    const image = container.querySelector('img');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', customSrc);
    expect(image).toHaveAttribute('alt', customAlt);
    expect(image).toHaveAttribute('width', '300');
    expect(image).toHaveAttribute('height', '200');
  });

  it('should apply the correct CSS class', () => {
    const { container } = render(<Image />);
    const image = container.querySelector('img');
    expect(image).toHaveClass(styles.image);
  });

  it('should apply custom styles', () => {
    const customStyle = { backgroundColor: 'red', opacity: 0.5 };
    const { container } = render(<Image style={customStyle} />);
    const image = container.querySelector('img');
    expect(image).toHaveStyle('background-color: rgb(255, 0, 0)'); // Browsers often convert named colors to rgb
    expect(image).toHaveStyle('opacity: 0.5');
  });

  it('should apply objectFit style', () => {
    const { container } = render(<Image objectFit="contain" />);
    const image = container.querySelector('img');
    expect(image).toHaveStyle('object-fit: contain');
  });
});