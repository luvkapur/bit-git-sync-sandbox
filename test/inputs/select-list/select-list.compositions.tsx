import React, { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuraTheme } from '@luvktest/test.aura-theme';
import { SelectList } from './select-list.js';
import type { SelectListItemType } from './select-list-item-type.js';

// Helper component to wrap each composition for consistent styling and titling
const CompositionWrapper: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ 
    margin: '20px', 
    padding: '20px', 
    border: 'var(--borders-default-width) var(--borders-default-style) var(--colors-border-default)', 
    borderRadius: 'var(--borders-radius-container)', 
    backgroundColor: 'var(--colors-surface-secondary)', 
    fontFamily: 'var(--typography-font-family)' 
  }}>
    <h3 style={{ 
      marginTop: 0, 
      marginBottom: '15px', 
      color: 'var(--colors-text-primary)', 
      fontSize: 'var(--typography-sizes-heading-h5)' 
    }}>
      {title}
    </h3>
    <div style={{ maxWidth: '350px' }}> {/* Constrain width for better display of select list */}
      {children}
    </div>
  </div>
);

// Common options for the select list examples
const commonOptions: SelectListItemType[] = [
  { value: 'option1', label: 'Voyager 1 Probe' },
  { value: 'option2', label: 'Hubble Telescope' },
  { value: 'option3', label: 'James Webb Telescope (JWST)', disabled: true },
  { value: 'option4', label: 'International Space Station (ISS)' },
  { value: 'option5', label: 'Perseverance Rover on Mars' },
];

const longOption: SelectListItemType = {
  value: 'long_option',
  label: 'This is a particularly long label for an option to demonstrate how the select list handles text overflow and truncation effectively within the dropdown and the display area.'
};

/**
 * Basic SelectList demonstrating uncontrolled mode, placeholder, and custom aria-label.
 */
export const BasicSelectList = () => {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(undefined);
  return (
    <MemoryRouter>
      <AuraTheme>
        <CompositionWrapper title="Basic Select List (Uncontrolled)">
          <SelectList
            options={[...commonOptions.slice(0, 3), longOption]}
            value={selectedValue}
            onChange={setSelectedValue}
            placeholder="Select a mission or instrument..."
            ariaLabel="Select your favorite space mission or instrument"
          />
          <p style={{ marginTop: '15px', color: 'var(--colors-text-secondary)', fontSize: 'var(--typography-sizes-body-small)'}}>
            Selected Value: {selectedValue || 'None'}
          </p>
        </CompositionWrapper>
      </AuraTheme>
    </MemoryRouter>
  );
};

/**
 * SelectList in a controlled mode with a pre-selected value.
 */
export const ControlledSelectList = () => {
  const [selectedValue, setSelectedValue] = useState<string>('option2'); // Pre-select 'Hubble Telescope'

  return (
    <MemoryRouter>
      <AuraTheme>
        <CompositionWrapper title="Controlled Select List with Pre-selected Value">
          <SelectList
            options={commonOptions}
            value={selectedValue}
            onChange={setSelectedValue}
            placeholder="Select an option..."
          />
          <p style={{ marginTop: '15px', color: 'var(--colors-text-secondary)', fontSize: 'var(--typography-sizes-body-small)'}}>
            Current Value: {selectedValue}
          </p>
        </CompositionWrapper>
      </AuraTheme>
    </MemoryRouter>
  );
};

/**
 * SelectList in its disabled state.
 */
export const DisabledSelectList = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <CompositionWrapper title="Disabled Select List">
          <SelectList
            options={commonOptions}
            value="option1" // Show a value to see how it looks when disabled
            disabled={true}
            placeholder="Cannot select..."
          />
           <p style={{ marginTop: '15px', color: 'var(--colors-text-secondary)', fontSize: 'var(--typography-sizes-body-small)'}}>
            This select list is disabled.
          </p>
        </CompositionWrapper>
      </AuraTheme>
    </MemoryRouter>
  );
};

/**
 * SelectList with no options provided, demonstrating the "No options available" message.
 */
export const SelectListWithNoOptions = () => {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(undefined);
  return (
    <MemoryRouter>
      <AuraTheme>
        <CompositionWrapper title="Select List with No Options">
          <SelectList
            options={[]}
            value={selectedValue}
            onChange={setSelectedValue}
            placeholder="No items to choose from"
          />
           <p style={{ marginTop: '15px', color: 'var(--colors-text-secondary)', fontSize: 'var(--typography-sizes-body-small)'}}>
            Selected Value: {selectedValue || 'None'}
          </p>
        </CompositionWrapper>
      </AuraTheme>
    </MemoryRouter>
  );
};