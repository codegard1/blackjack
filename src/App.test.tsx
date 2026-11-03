import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

it('renders the initial table before players are selected', () => {
  render(<App />);

  expect(screen.getByText('No players')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Settings' })).toBeInTheDocument();
});
