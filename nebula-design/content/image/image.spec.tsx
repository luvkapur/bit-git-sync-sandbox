import React from 'react';
import { render } from '@testing-library/react';
import { Image } from './image.js';
import styles from './image.module.scss';

describe('Image Component', () => {
  it('should render with default props', () => {
    const { container } = render(<Image />);
    const imageElement = container.querySelector('img');
    expect(imageElement).toBeInTheDocument();
    expect(imageElement).toHaveClass(styles.image);
    expect(imageElement).toHaveAttribute('src', 'https://images.unsplash.com/photo-1646394828039-0802101e1053?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGJsdWUlMjBnZW9tZXRyaWN8ZW58MXwwfHxibHVlfDE3NDk3NzYzNzR8MA&ixlib=rb-4.1.0');
    expect(imageElement).toHaveAttribute('alt', 'Abstract blue geometric background');
  });

  it('should render with custom src and alt', () => {
    const customSrc = 'https://example.com/image.jpg';
    const customAlt = 'Custom alt text';
    const { container } = render(<Image src={customSrc} alt={customAlt} />);
    const imageElement = container.querySelector('img');
    expect(imageElement).toHaveAttribute('src', customSrc);
    expect(imageElement).toHaveAttribute('alt', customAlt);
  });

  it('should render with custom class name', () => {
    const customClassName = 'custom-image-class';
    const { container } = render(<Image className={customClassName} />);
    const imageElement = container.querySelector('img');
    expect(imageElement).toHaveClass(customClassName);
  });
});