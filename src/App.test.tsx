import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import App from './App';

it('starts a new game with the default human and dealer', () => {
  render(<App />);

  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));

  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(screen.getByText('Chris ($1000)')).toBeInTheDocument();
  expect(screen.getByText('Dealer ($1000)')).toBeInTheDocument();
});
