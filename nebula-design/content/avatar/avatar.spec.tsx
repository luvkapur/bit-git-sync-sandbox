import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Avatar } from './avatar.js';
import styles from './avatar.module.scss';

describe('Avatar', () => {
  it('should render initials when name is provided and src is not', () => {
    const { container } = render(
      <MemoryRouter>
        <Avatar name="John Doe" />
      </MemoryRouter>
    );
    const initialsElement = container.querySelector(`.${styles.initials}`);
    expect(initialsElement).toBeInTheDocument();
    expect((initialsElement as HTMLElement).textContent).toBe('JD');
  });

  it('should render an image when src is provided', () => {
    const imageUrl = 'https://example.com/image.jpg';
    const { container } = render(
      <MemoryRouter>
        <Avatar src={imageUrl} alt="Test Avatar" />
      </MemoryRouter>
    );
    const imageElement = container.querySelector(`.${styles.image}`) as HTMLImageElement;
    expect(imageElement).toBeInTheDocument();
    expect(imageElement.src).toBe(imageUrl);
    expect(imageElement.alt).toBe('Test Avatar');
  });

  it('should apply the correct size class', () => {
    const { container } = render(
      <MemoryRouter>
        <Avatar name="Test User" size="large" />
      </MemoryRouter>
    );
    const avatarContainer = container.querySelector(`.${styles.avatarContainer}`);
    expect(avatarContainer).toBeInTheDocument();
    expect(avatarContainer).toHaveClass(styles.large);
  });
});