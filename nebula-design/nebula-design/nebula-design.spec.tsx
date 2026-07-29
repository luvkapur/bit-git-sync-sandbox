import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NebulaDesign } from './nebula-design.js';
// styles import is removed as it's no longer used after refactoring queries

describe('NebulaDesign Component', () => {
  it('renders the landing page with the "Explore the Demo" button', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <NebulaDesign />
      </MemoryRouter>
    );

    const exploreButton = screen.getByRole('button', { name: /Explore the Demo/i });
    expect(exploreButton).toBeInTheDocument();
  });

  it('navigates to the gallery page when the "Explore the Demo" button is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <NebulaDesign />
      </MemoryRouter>
    );

    const exploreButton = screen.getByRole('button', { name: /Explore the Demo/i });
    fireEvent.click(exploreButton);

    // Check for content unique to the gallery page.
    // ComponentGalleryPage's SectionLayout has a title="Component Gallery"
    expect(await screen.findByText('Component Gallery')).toBeInTheDocument();
  });
  
  it('renders the ThemeToggler component', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <NebulaDesign />
      </MemoryRouter>
    );
    // Check for elements within ThemeToggler using aria-labels provided to it
    // Assumes the default theme is 'light', so "Switch to dark theme" label is active.
    expect(screen.getByLabelText("Switch to dark theme")).toBeInTheDocument();
    expect(screen.getByLabelText("Select brand theme")).toBeInTheDocument();
  });
});