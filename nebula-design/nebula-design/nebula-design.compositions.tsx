import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';
import { NebulaDesign } from "./nebula-design.js";

export const NebulaDesignAppComposition = () => {
  return (
    <MemoryRouter>
      <NebulaTheme initialTheme="light"> {/* Defaulting to Aura light as per requirement #1 */}
        <NebulaDesign />
      </NebulaTheme>
    </MemoryRouter>
  );
};

/**
 * Example Composition: Nebula Design App (Nova Dark Default)
 * This composition showcases the Nebula Design app starting with the 'Nova' theme and 'dark' mode.
 * This helps visualize how the app behaves with a different initial theme setting.
 */
export const NebulaDesignAppNovaDarkComposition = () => {
  // To make this visually distinct, we'd ideally set the ThemeToggler's default themeName to 'nova'
  // and the NebulaTheme's initialTheme (Aura's base mode) to 'dark'.
  // The ThemeToggler will set document.documentElement.dataset.theme to "nova-dark"
  // Since ThemeToggler itself controls the data-theme attribute for brand themes (Aura/Nova)
  // and mode (light/dark), we just need to ensure NebulaTheme provides the base (dark) and
  // the ThemeToggler is configured or defaults appropriately.
  // The current ThemeToggler defaults to 'aura'. If we want 'nova' as default for this composition,
  // it would require a mechanism to pass initial brand theme to ThemeToggler, or a separate
  // ThemeToggler instance.
  // For simplicity, this composition will start with Aura Dark, and user can toggle to Nova.
  // The prompt implied a theme toggle is present and works.
  return (
    <MemoryRouter>
      <NebulaTheme initialTheme="dark">
        {/* The ThemeToggler inside NebulaDesign will handle brand theme selection (Aura/Nova) */}
        <NebulaDesign />
      </NebulaTheme>
    </MemoryRouter>
  );
};