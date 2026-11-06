import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { playerDefaults } from '../definitions';
import { StatusDisplay } from './StatusDisplay';

describe('StatusDisplay', () => {
  it('shows only the gameplay statistics used in the Players menu', () => {
    const player = {
      ...playerDefaults,
      title: 'Chris',
      stats: {
        ...playerDefaults.stats,
        numberOfGamesPlayed: 10,
        numberOfGamesWon: 6,
        numberOfGamesLost: 3,
        numberOfTimesBlackjack: 2,
        numberOfTimesBusted: 1,
        totalWinnings: 250,
      },
    };
    render(<StatusDisplay player={player} />);

    fireEvent.click(screen.getByRole('button', { name: 'Chris stats' }));
    const table = screen.getByRole('table', { name: 'Chris gameplay statistics' });
    const rows = within(table).getAllByRole('row');
    expect(rows.map((row) => row.textContent)).toEqual([
      'Rounds10',
      'Won6',
      'Lost3',
      'Pushed1',
      'Win rate60%',
      'Blackjacks2',
      'Busts1',
      'Winnings$250',
    ]);
    expect(screen.queryByText('Stats & Variables')).not.toBeInTheDocument();
    expect(within(table).queryByText(/bank:|isNPC:|lastAction:/)).not.toBeInTheDocument();
  });
});
