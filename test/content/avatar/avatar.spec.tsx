import React from 'react';
import { render } from '@testing-library/react';
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
    expect(initialsElement?.textContent).toBe('JD');
  });

  it('should render an image when src is provided', () => {
    const { container } = render(
      <MemoryRouter>
        <Avatar src="https://example.com/image.png" alt="Avatar" />
      </MemoryRouter>
    );
    const imageElement = container.querySelector(`.${styles.image}`) as HTMLImageElement;
    expect(imageElement).toBeInTheDocument();
    expect(imageElement?.src).toBe('https://example.com/image.png');
    expect(imageElement?.alt).toBe('Avatar');
  });

  it('should apply the correct size class', () => {
    const { container } = render(
      <MemoryRouter>
        <Avatar name="Test" size="large" />
      </MemoryRouter>
    );
    expect(container.querySelector(`.${styles.avatarContainer}.${styles.large}`)).toBeInTheDocument();
  });

  it('should apply custom styles for background-color', () => {
    const customStyle = { backgroundColor: 'red' };
    const { container } = render(
      <MemoryRouter>
        <Avatar name="Test" style={customStyle} />
      </MemoryRouter>
    );
    const avatarElement = container.querySelector(`.${styles.avatarContainer}`);
    expect(avatarElement).toBeInTheDocument();
    // Addresses the error: Expected 'background-color: red;' but received 'background-color: rgb(255, 0, 0);'
    expect(avatarElement).toHaveStyle('background-color: rgb(255, 0, 0);');
  });
});