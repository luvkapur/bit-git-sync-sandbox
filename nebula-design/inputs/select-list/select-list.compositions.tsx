import React, { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';
import { SelectList } from '@luvktest/test.inputs.select-list';
import type { SelectListItemType } from '@luvktest/test.inputs.select-list';

// Helper component to wrap each composition for consistent styling and titling under NebulaTheme
const CompositionWrapper: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{
    margin: '20px',
    padding: '20px',
    border: 'var(--borders-default-width) var(--borders-default-style) var(--colors-border-default)',
    borderRadius: 'var(--borders-radius-container)',
    backgroundColor: 'var(--colors-surface-secondary)',
    fontFamily: 'var(--typography-font-family)',
  }}>
    <h3 style={{
      marginTop: 0,
      marginBottom: '15px',
      color: 'var(--colors-text-default)',
      fontSize: '1.2em', // Static value as specific typography size token is not in the list
    }}>
      {title}
    </h3>
    <div style={{ maxWidth: '350px' }}> {/* Constrain width for better display of select list */}
      {children}
    </div>
  </div>
);

// Common options for the select list examples, themed for "Nebula"
const commonOptions: SelectListItemType[] = [
  { value: 'sirius', label: 'Sirius Star System' },
  { value: 'andromeda', label: 'Andromeda Galaxy' },
  { value: 'orion', label: 'Orion Nebula Complex', disabled: true },
  { value: 'kepler186f', label: 'Kepler-186f (Exoplanet)' },
  { value: 'cygnusx1', label: 'Cygnus X-1 (Black Hole)' },
];

const longOption: SelectListItemType = {
  value: 'long_nebula_option',
  label: 'This is an exceptionally long label for a select list item within the Nebula theme, designed to test how the component handles text overflow, truncation, and overall display within the dropdown menu and the selected item display area.'
};

/**
 * Basic SelectList demonstrating uncontrolled mode, placeholder, and Nebula styling.
 */
export const BasicSelectListWithNebulaTheme = () => {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(undefined);
  return (
    <MemoryRouter>
      <NebulaTheme>
        <CompositionWrapper title="Basic Select List (Uncontrolled)">
          <SelectList
            options={[...commonOptions.slice(0, 3), longOption]}
            value={selectedValue}
            onChange={setSelectedValue}
            placeholder="Select celestial object..."
            ariaLabel="Select your favorite celestial object"
          />
          <p style={{ marginTop: '15px', color: 'var(--colors-text-secondary)', fontSize: '0.9em' }}>
            Selected Value: {selectedValue || 'None'}
          </p>
        </CompositionWrapper>
      </NebulaTheme>
    </MemoryRouter>
  );
};

/**
 * SelectList in a controlled mode with a pre-selected value, styled by Nebula.
 */
export const ControlledSelectListWithNebulaTheme = () => {
  const [selectedValue, setSelectedValue] = useState<string>('andromeda'); // Pre-select 'Andromeda Galaxy'

  return (
    <MemoryRouter>
      <NebulaTheme>
        <CompositionWrapper title="Controlled Select List (Nebula Themed)">
          <SelectList
            options={commonOptions}
            value={selectedValue}
            onChange={setSelectedValue}
            placeholder="Select an option..."
          />
          <p style={{ marginTop: '15px', color: 'var(--colors-text-secondary)', fontSize: '0.9em' }}>
            Current Value: {selectedValue}
          </p>
        </CompositionWrapper>
      </NebulaTheme>
    </MemoryRouter>
  );
};

/**
 * SelectList in its disabled state, demonstrating Nebula theme's disabled styling.
 */
export const DisabledSelectListWithNebulaTheme = () => {
  return (
    <MemoryRouter>
      <NebulaTheme>
        <CompositionWrapper title="Disabled Select List (Nebula Themed)">
          <SelectList
            options={commonOptions}
            value="sirius" // Show a value to see how it looks when disabled
            disabled={true}
            placeholder="Cannot select..."
          />
           <p style={{ marginTop: '15px', color: 'var(--colors-text-secondary)', fontSize: '0.9em' }}>
            This select list is disabled.
          </p>
        </CompositionWrapper>
      </NebulaTheme>
    </MemoryRouter>
  );
};

/**
 * SelectList with no options provided, showing the "No options available" message under Nebula theme.
 */
export const SelectListWithNoOptionsNebulaTheme = () => {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(undefined);
  return (
    <MemoryRouter>
      <NebulaTheme>
        <CompositionWrapper title="Select List with No Options (Nebula Themed)">
          <SelectList
            options={[]}
            value={selectedValue}
            onChange={setSelectedValue}
            placeholder="No cosmic wonders to choose from"
          />
           <p style={{ marginTop: '15px', color: 'var(--colors-text-secondary)', fontSize: '0.9em' }}>
            Selected Value: {selectedValue || 'None'}
          </p>
        </CompositionWrapper>
      </NebulaTheme>
    </MemoryRouter>
  );
};