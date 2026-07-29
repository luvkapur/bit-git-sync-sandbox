import React from 'react';
import { AuraTheme } from '@luvktest/test.aura-theme';
import { Dropdown, DropdownPosition } from './dropdown.js';
import styles from './dropdown-composition.module.scss';

const PlaceholderButton = ({ text = "Open Dropdown" }: { text?: string }) => (
  <button className={styles.placeholderButton}>
    {text}
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '8px' }}>
      <path d="M3.5 6L8 10.5L12.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </button>
);

const DropdownContent = () => (
  <ul className={styles.dropdownMenuList}>
    <li className={styles.dropdownMenuItem} tabIndex={0} onClick={() => alert('Profile clicked')}>Profile</li>
    <li className={styles.dropdownMenuItem} tabIndex={0} onClick={() => alert('Settings clicked')}>Settings</li>
    <li className={styles.dropdownMenuItem} tabIndex={0} onClick={() => alert('Logout clicked')}>Logout</li>
    <li className={styles.dropdownMenuItem} tabIndex={0}>A longer item to test width</li>
  </ul>
);

export const BasicDropdown = () => {
  return (
    <AuraTheme>
      <div className={styles.compositionContainer}>
        <Dropdown placeholder={<PlaceholderButton text="Open (Bottom Left)" />}>
          <DropdownContent />
        </Dropdown>
      </div>
    </AuraTheme>
  );
};

export const DropdownTopRightPosition = () => {
  return (
    <AuraTheme>
      <div className={styles.compositionContainer} style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', height: '200px' }}>
        <Dropdown placeholder={<PlaceholderButton text="Open (Top Right)" />} openPosition="top-right">
          <DropdownContent />
        </Dropdown>
      </div>
    </AuraTheme>
  );
};

export const DropdownWithDifferentPositions = () => {
  const positions: DropdownPosition[] = ['bottom-left', 'bottom-right', 'top-left', 'top-right'];
  return (
    <AuraTheme>
      <div className={styles.compositionGrid}>
        {positions.map(pos => (
          <div key={pos} className={styles.gridItem}>
            <span className={styles.positionLabel}>{pos}</span>
            <Dropdown placeholder={<PlaceholderButton text={`Open`} />} openPosition={pos}>
              <div className={styles.simpleContent}>
                <p>This is content for {pos} position.</p>
                <button className={styles.contentButton}>Click me</button>
              </div>
            </Dropdown>
          </div>
        ))}
      </div>
    </AuraTheme>
  );
};


export const InitiallyOpenDropdown = () => {
  return (
    <AuraTheme>
      <div className={styles.compositionContainer}>
        <Dropdown
          placeholder={<PlaceholderButton text="Initially Open" />}
          initialOpen={true}
          onOpenChange={(isOpen) => console.log('Dropdown open state:', isOpen)}
        >
          <div className={styles.simpleContent}>
            <p>This dropdown starts in an open state.</p>
            <p>Check the console for <code>onOpenChange</code> logs.</p>
          </div>
        </Dropdown>
      </div>
    </AuraTheme>
  );
};

export const DropdownWithCustomStyling = () => {
  return (
    <AuraTheme>
      <div className={styles.compositionContainer}>
        <Dropdown
          placeholder={<button className={styles.customPlaceholder}>Custom Trigger ✨</button>}
          className={styles.customDropdownContainer}
          contentClassName={styles.customDropdownContent}
          openPosition="bottom-right"
        >
          <div className={styles.simpleContent}>
            <h4>Styled Dropdown</h4>
            <p>This dropdown has custom classes applied to its container and content area.</p>
            <a href="#link" className={styles.contentLink}>Learn more</a>
          </div>
        </Dropdown>
      </div>
    </AuraTheme>
  );
};