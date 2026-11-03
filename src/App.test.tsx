import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import App from './App';

it('starts a new game with the default human and dealer', () => {
  render(<App />);

  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));

  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(screen.getByText('Chris ($975)')).toBeInTheDocument();
  expect(screen.getByText('Dealer ($975)')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Wager $25' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByText('Reset Game'));

  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
});

it('applies card-title and activity-log settings to rendered content', () => {
  const { container } = render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));

  const cards = () => Array.from(container.querySelector('.PlayerContainer')?.querySelectorAll('button[aria-pressed]') ?? []);
  expect(cards()).toHaveLength(2);
  expect(cards().every((card) => card.textContent?.trim().length === 1)).toBe(true);

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByRole('switch', { name: 'Show Card Titles' }));
  fireEvent.click(screen.getByRole('switch', { name: 'Show Activity Log' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close options' }));

  expect(cards().some((card) => (card.textContent?.trim().length ?? 0) > 1)).toBe(true);
  expect(screen.getByText('Activity Log')).toBeInTheDocument();
  expect(screen.getAllByText('was dealt two cards')).toHaveLength(2);
});

it('clears in-memory game state and returns to player selection', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByRole('button', { name: 'Clear application data stored locally in the browser' }));

  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  expect(screen.getByText('No players')).toBeInTheDocument();
});
