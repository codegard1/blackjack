import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createGameState, GameContext, SettingContext, settingDefaults } from '../context';
import { ActivityLogEntry } from '../types';
import { ActivityLog } from './ActivityLog';

const entries: ActivityLogEntry[] = [
  { id: 1, sessionId: 1, event: 'game', timestamp: 1000, name: '', description: 'Game started' },
  { id: 2, sessionId: 1, event: 'deal', timestamp: 2000, name: 'Dealer', description: 'was dealt two cards' },
  { id: 3, sessionId: 1, event: 'bet', timestamp: 3000, name: 'Chris', description: 'wagered $25' },
  { id: 4, sessionId: 2, event: 'game', timestamp: 4000, name: '', description: 'Game started' },
  { id: 5, sessionId: 2, event: 'win', timestamp: 5000, name: 'Chris', description: 'won the round' },
];

const renderLog = (activityLog = entries, visible = true) => render(
  <SettingContext.Provider value={{ ...settingDefaults, isActivityLogVisible: visible }}>
    <GameContext.Provider value={{ ...createGameState(), activityLog }}>
      <ActivityLog />
    </GameContext.Provider>
  </SettingContext.Provider>,
);

describe('activity log', () => {
  it('groups entries into labeled Fluent tables with accessible event icons', () => {
    renderLog();

    expect(screen.getAllByRole('table')).toHaveLength(2);
    expect(within(screen.getByRole('table', { name: 'Session 1 activity' })).getAllByRole('row')).toHaveLength(4);
    expect(within(screen.getByRole('table', { name: 'Session 2 activity' })).getAllByRole('row')).toHaveLength(3);
    expect(screen.getByLabelText('Cards dealt')).toBeInTheDocument();
    expect(screen.getByLabelText('Wager')).toBeInTheDocument();
    expect(screen.getByLabelText('Round won')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader', { name: 'Time' })).toHaveLength(2);
  });

  it('sorts each column in both directions without mixing sessions or mutating history', () => {
    renderLog();
    const table = screen.getByRole('table', { name: 'Session 1 activity' });
    const rows = () => within(table).getAllByRole('row').slice(1);
    const values = (column: number) => rows().map((row) => within(row).getAllByRole('cell')[column].textContent);

    fireEvent.click(within(table).getByRole('columnheader', { name: 'Player' }));
    expect(values(1)).toEqual(['Chris', 'Dealer', 'Game']);
    expect(within(table).getByRole('columnheader', { name: 'Player' })).toHaveAttribute('aria-sort', 'ascending');
    fireEvent.click(within(table).getByRole('columnheader', { name: 'Player' }));
    expect(values(1)).toEqual(['Game', 'Dealer', 'Chris']);

    fireEvent.click(within(table).getByRole('columnheader', { name: 'Event' }));
    expect(values(2)).toEqual(['Game started', 'wagered $25', 'was dealt two cards']);
    fireEvent.click(within(table).getByRole('columnheader', { name: 'Event' }));
    expect(values(2)).toEqual(['was dealt two cards', 'wagered $25', 'Game started']);

    fireEvent.click(within(table).getByRole('columnheader', { name: 'Time' }));
    expect(values(1)).toEqual(['Game', 'Dealer', 'Chris']);
    fireEvent.click(within(table).getByRole('columnheader', { name: 'Time' }));
    expect(values(1)).toEqual(['Chris', 'Dealer', 'Game']);
    expect(entries.map((entry) => entry.id)).toEqual([1, 2, 3, 4, 5]);
    expect(within(screen.getByRole('table', { name: 'Session 2 activity' })).getByText('won the round')).toBeInTheDocument();
  });

  it('shows an empty state and respects the visibility setting', () => {
    const { unmount } = renderLog([]);
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
    unmount();
    renderLog(entries, false);
    expect(screen.queryByRole('heading', { name: 'Activity Log' })).not.toBeInTheDocument();
  });

  it('supports entries created before session metadata was available', () => {
    renderLog([{ id: 1, timestamp: 1000, name: 'Chris', description: 'stayed' }]);
    expect(screen.getByRole('table', { name: 'Session 1 activity' })).toBeInTheDocument();
    expect(screen.getByLabelText('Activity')).toBeInTheDocument();
  });
});