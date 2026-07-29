import React, { useState } from 'react';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';
import { TextInput } from './text-input.js';
import { MemoryRouter } from 'react-router-dom';

const containerStyle: React.CSSProperties = {
  padding: 'var(--spacing-l)',
  backgroundColor: 'var(--colors-surface-background)',
  width: '350px',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-m)',
  borderRadius: 'var(--borders-radius-container)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 'var(--spacing-xs)',
  color: 'var(--colors-text-default)',
  fontFamily: 'var(--typography-font-family)',
};

const valueDisplayStyle: React.CSSProperties = {
  marginTop: 'var(--spacing-s)',
  color: 'var(--colors-text-secondary)',
  fontFamily: 'var(--typography-font-family)',
  fontSize: '0.9em',
};

export const BasicTextInput = () => {
  const [value, setValue] = useState('');

  return (
    <MemoryRouter>
      <NebulaTheme>
        <div style={containerStyle}>
          <label htmlFor="basic-nebula-input" style={labelStyle}>
            Your Name:
          </label>
          <TextInput
            id="basic-nebula-input"
            value={value}
            onChange={setValue}
            placeholder="e.g., Nova Stardust"
          />
          <p style={valueDisplayStyle}>Entered Name: {value}</p>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};

export const PasswordInput = () => {
  const [password, setPassword] = useState('');

  return (
    <MemoryRouter>
      <NebulaTheme>
        <div style={containerStyle}>
          <label htmlFor="password-nebula-input" style={labelStyle}>
            Secure Password:
          </label>
          <TextInput
            id="password-nebula-input"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Enter your secret phrase"
            name="nebula-password"
          />
          {password && <p style={valueDisplayStyle}>Password length: {password.length}</p>}
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};

export const DisabledTextInput = () => {
  return (
    <MemoryRouter>
      <NebulaTheme>
        <div style={containerStyle}>
          <label htmlFor="disabled-nebula-input" style={labelStyle}>
            System ID (Read-only):
          </label>
          <TextInput
            id="disabled-nebula-input"
            value="NBL-SYS-001-ALPHA"
            onChange={() => {}}
            disabled={true}
          />
          <p style={valueDisplayStyle}>This field is locked and cannot be edited.</p>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};

export const TextInputWithPlaceholderAndInitialValue = () => {
  const [email, setEmail] = useState('contact@nebula.galaxy');

  return (
    <MemoryRouter>
      <NebulaTheme>
        <div style={containerStyle}>
          <label htmlFor="email-nebula-input" style={labelStyle}>
            Contact Email:
          </label>
          <TextInput
            id="email-nebula-input"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="your.email@domain.com"
            name="nebula-email"
          />
          <p style={valueDisplayStyle}>Current Email: {email}</p>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};