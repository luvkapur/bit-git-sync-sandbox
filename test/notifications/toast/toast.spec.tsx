import React from 'react';
import { render } from '@testing-library/react';
import { BasicToast } from './toast.compositions.js';

it('should render the correct text', () => {
  const { getByText } = render(<BasicToast />);
  const rendered = getByText('hello world!');
  expect(rendered).toBeTruthy();
});
