import React, { useState } from 'react';
import { AuraTheme } from '@luvktest/test.aura-theme';
import { TextInput } from './text-input.js';

export const BasicTextInput = () => {
  const [value, setValue] = useState('');

  return (
    <AuraTheme>
      <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-background)', width: '300px' }}>
        <label htmlFor="basic-input" style={{ display: 'block', marginBottom: 'var(--spacing-small)', color: 'var(--colors-text-primary)'}}>
          Basic Input:
        </label>
        <TextInput
          id="basic-input"
          value={value}
          onChange={setValue}
          placeholder="Enter text here"
        />
        <p style={{ marginTop: 'var(--spacing-default)', color: 'var(--colors-text-secondary)' }}>Current value: {value}</p>
      </div>
    </AuraTheme>
  );
};

export const PasswordInput = () => {
  const [password, setPassword] = useState('');

  return (
    <AuraTheme>
      <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-background)', width: '300px' }}>
        <label htmlFor="password-input" style={{ display: 'block', marginBottom: 'var(--spacing-small)', color: 'var(--colors-text-primary)'}}>
          Password Input:
        </label>
        <TextInput
          id="password-input"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Enter your password"
          name="password"
        />
      </div>
    </AuraTheme>
  );
};

export const TextInputWithInitialValue = () => {
  const [value, setValue] = useState('Initial Value');

  return (
    <AuraTheme>
      <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-background)', width: '300px' }}>
        <label htmlFor="initial-value-input" style={{ display: 'block', marginBottom: 'var(--spacing-small)', color: 'var(--colors-text-primary)'}}>
          Input with Initial Value:
        </label>
        <TextInput
          id="initial-value-input"
          value={value}
          onChange={setValue}
          placeholder="Edit the text"
        />
        <p style={{ marginTop: 'var(--spacing-default)', color: 'var(--colors-text-secondary)' }}>Current value: {value}</p>
      </div>
    </AuraTheme>
  );
};

export const DisabledTextInput = () => {
  return (
    <AuraTheme>
      <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-background)', width: '300px' }}>
        <label htmlFor="disabled-input" style={{ display: 'block', marginBottom: 'var(--spacing-small)', color: 'var(--colors-text-primary)'}}>
          Disabled Input:
        </label>
        <TextInput
          id="disabled-input"
          value="You can't change me"
          onChange={() => {}}
          placeholder="Disabled"
          disabled={true}
        />
         <p style={{ marginTop: 'var(--spacing-default)', color: 'var(--colors-text-secondary)' }}>This input is disabled and cannot be interacted with.</p>
      </div>
    </AuraTheme>
  );
};