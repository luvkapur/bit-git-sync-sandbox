import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';
import { Dropdown } from './dropdown.js';
import type { DropdownPosition } from './dropdown-position-type.js';
import styles from './dropdown.compositions.module.scss';

// Helper: Placeholder Button
const Placeholder = ({ text = "Open Menu", icon = true }: { text?: string, icon?: boolean }) => (
  <button type="button" className={styles.placeholderButton}>
    {text}
    {icon && (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: 'var(--spacing-s)' }}>
        <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )}
  </button>
);

// Helper: Dropdown Menu Items
const MenuItems = ({ onItemClick }: { onItemClick?: (item: string) => void }) => (
  <div className={styles.dropdownContentList}>
    <button type="button" onClick={() => onItemClick?.('Profile')}>User Profile</button>
    <button type="button" onClick={() => onItemClick?.('Settings')}>Account Settings</button>
    <button type="button" onClick={() => onItemClick?.('Help')}>Help Center</button>
    <hr style={{ margin: 'var(--spacing-xs) 0', borderColor: 'var(--colors-border-subtle)' }} />
    <button type="button" onClick={() => onItemClick?.('Logout')} style={{ color: 'var(--colors-text-error)' }}>Logout</button>
  </div>
);
// Note: The <button> elements above will be styled by dropdown.module.scss
// when rendered inside the Dropdown's content panel.

export const BasicNebulaDropdown = () => {
  const handleItemClick = (item: string) => {
    console.log(`${item} clicked`);
    // In a real app, you might navigate or perform an action
  };

  return (
    <MemoryRouter>
      <NebulaTheme>
        <div className={styles.compositionHost}>
          <Dropdown placeholder={<Placeholder text="Actions" />}>
            <MenuItems onItemClick={handleItemClick} />
          </Dropdown>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};

export const DropdownWithAllPositions = () => {
  const positions: DropdownPosition[] = ['bottom-left', 'bottom-right', 'top-left', 'top-right'];
  return (
    <MemoryRouter>
      <NebulaTheme>
        <div className={styles.compositionHost}>
          <div className={styles.positionsGrid}>
            {positions.map(pos => (
              <div key={pos} className={styles.positionItem}>
                <span className={styles.positionLabel}>{pos}</span>
                <Dropdown placeholder={<Placeholder text={`Open ${pos.split('-')[0]}`} />} openPosition={pos}>
                  <div className={styles.simpleContent}>
                    <p>Content for <strong>{pos}</strong> position.</p>
                    <button type="button">Option 1</button>
                    <button type="button">Option 2</button>
                  </div>
                </Dropdown>
              </div>
            ))}
          </div>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};

export const InitiallyOpenNebulaDropdown = () => {
  return (
    <MemoryRouter>
      <NebulaTheme>
        <div className={styles.compositionHost}>
          <Dropdown
            placeholder={<Placeholder text="Settings (Starts Open)" />}
            initialOpen={true}
            onOpenChange={(isOpen) => console.log('Dropdown open state:', isOpen)}
          >
            <div className={styles.simpleContent}>
              <p>This dropdown is initially open.</p>
              <p>Useful for tutorials or highlighting features.</p>
              <button type="button">Confirm</button>
            </div>
          </Dropdown>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};

export const DropdownWithCustomStyledTrigger = () => {
  const CustomTrigger = () => (
    <button type="button" className={styles.customStyledPlaceholder}>
      <span>🚀 Launch Options</span>
    </button>
  );

  return (
    <MemoryRouter>
      <NebulaTheme>
        <div className={styles.compositionHost}>
          <Dropdown
            placeholder={<CustomTrigger />}
            openPosition="bottom-right"
            contentClassName={styles.customContent} // Example of custom class for content panel itself
          >
            <div className={styles.customDropdownContentWrapper}>
              <h4>Advanced Settings</h4>
              <p>Configure your launch preferences here. These settings are powerful.</p>
              <button type="button" className={styles.actionButton}>Activate Sequence</button>
              <button type="button">Learn More</button>
            </div>
          </Dropdown>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};