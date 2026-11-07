import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SettingContext, settingDefaults } from '../context';
import { ActivityLogEntry, SettingsState } from '../types';
import { ACTIVITY_DRAWER_MS, ACTIVITY_ROW_ENTER_MS, ActivityLog, ActivityLogToggle, formatChange, groupByHand, useActivityDrawer } from './ActivityLog';

const entries: ActivityLogEntry[] = [
  { id: 1, sessionId: 1, round: 1, event: 'game', timestamp: 1000, name: '', description: 'Game started' },
  { id: 2, sessionId: 1, round: 1, event: 'deal', timestamp: 2000, name: 'Dealer', description: 'was dealt two cards' },
  { id: 3, sessionId: 1, round: 1, event: 'bet', timestamp: 3000, name: 'Chris', description: 'wagered $25', amount: -25 },
  { id: 4, sessionId: 1, round: 2, event: 'win', timestamp: 4000, name: 'Chris', description: 'won the pot', amount: 50 },
  { id: 5, sessionId: 1, round: 2, event: 'loss', timestamp: 5000, name: 'Dealer', description: 'lost the round' },
];

// The drawer with its toggle button, as the Table lays them out. The setting decides whether
// it starts open; it is on here so the contents are in the accessibility tree.
const Drawer: React.FC<{ entries: ActivityLogEntry[] }> = ({ entries: activityLog }) => {
  const drawer = useActivityDrawer();
  return (
    <>
      <ActivityLogToggle isOpen={drawer.isOpen} onToggle={drawer.toggle} />
      <ActivityLog entries={activityLog} isOpen={drawer.isOpen} />
    </>
  );
};

const logElement = (activityLog: ActivityLogEntry[], settings: Partial<SettingsState>) => (
  <SettingContext.Provider value={{ ...settingDefaults, isActivityLogVisible: true, ...settings }}>
    <Drawer entries={activityLog} />
  </SettingContext.Provider>
);

const renderLog = (activityLog = entries, settings: Partial<SettingsState> = {}) => render(logElement(activityLog, settings));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  // jsdom has no scrollIntoView; drop the stand-in a test may have set
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
});

const rowsOf = (name: string) => within(screen.getByRole('table', { name })).getAllByRole('row').slice(1);
const cellText = (row: HTMLElement, column: number) => within(row).getAllByRole('cell')[column].textContent;

describe('activity log', () => {
  it('groups entries by hand, newest hand first', () => {
    renderLog();

    const headings = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
    expect(headings).toEqual(['Hand 2', 'Hand 1']);
    expect(rowsOf('Hand 1 activity')).toHaveLength(3);
    expect(rowsOf('Hand 2 activity')).toHaveLength(2);
    expect(screen.getByLabelText('Cards dealt')).toBeInTheDocument();
    expect(screen.getByLabelText('Round won')).toBeInTheDocument();
  });

  it('shows the newest entries first by default', () => {
    renderLog();

    expect(rowsOf('Hand 1 activity').map((row) => cellText(row, 2))).toEqual(['wagered $25', 'was dealt two cards', 'Game started']);
    expect(within(screen.getByRole('table', { name: 'Hand 1 activity' })).getByRole('columnheader', { name: 'Time' })).toHaveAttribute('aria-sort', 'descending');
  });

  it('highlights gains and losses and shows the change to each bank', () => {
    renderLog();

    const won = rowsOf('Hand 2 activity')[1];
    expect(won).toHaveClass('activity-row-gain');
    expect(cellText(won, 3)).toBe('+$50');

    const lost = rowsOf('Hand 2 activity')[0];
    expect(lost).toHaveClass('activity-row-loss');
    expect(cellText(lost, 3)).toBe('—');

    const wagered = rowsOf('Hand 1 activity')[0];
    expect(wagered).toHaveClass('activity-row-loss');
    expect(cellText(wagered, 3)).toBe('-$25');

    const dealt = rowsOf('Hand 1 activity')[1];
    expect(dealt).not.toHaveClass('activity-row-gain');
    expect(dealt).not.toHaveClass('activity-row-loss');
  });

  it('sorts each column in both directions', () => {
    renderLog();
    const table = screen.getByRole('table', { name: 'Hand 1 activity' });
    const rows = () => within(table).getAllByRole('row').slice(1);
    const values = (column: number) => rows().map((row) => cellText(row, column));

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
  });

  it('shows an empty state', () => {
    renderLog([]);
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });

  it('is a drawer that starts open or closed as the setting says', () => {
    const { unmount } = renderLog(entries, { isActivityLogVisible: false });
    const toggle = screen.getByRole('button', { name: 'Activity log' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // closed, the drawer is out of the accessibility tree and cannot be tabbed into
    expect(screen.queryByRole('heading', { name: 'Activity Log' })).not.toBeInTheDocument();
    expect(document.getElementById('ActivityLogRoot')).toHaveAttribute('inert');
    expect(document.querySelector('.activity-drawer')).not.toHaveClass('is-open');
    unmount();

    renderLog(entries, { isActivityLogVisible: true });
    expect(screen.getByRole('button', { name: 'Activity log' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('heading', { name: 'Activity Log' })).toBeInTheDocument();
    expect(document.querySelector('.activity-drawer')).toHaveClass('is-open');
    expect(document.getElementById('ActivityLogRoot')).not.toHaveAttribute('inert');
  });

  it('opens and closes from the icon button', () => {
    renderLog(entries, { isActivityLogVisible: false });
    const toggle = screen.getByRole('button', { name: 'Activity log' });
    expect(toggle).toHaveAttribute('aria-controls', 'ActivityLogRoot');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('heading', { name: 'Activity Log' })).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('heading', { name: 'Activity Log' })).not.toBeInTheDocument();
  });

  it('follows the setting when it changes, and the button after that', () => {
    const { rerender } = renderLog(entries, { isActivityLogVisible: false });
    const toggle = screen.getByRole('button', { name: 'Activity log' });

    rerender(logElement(entries, { isActivityLogVisible: true }));
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    // closing it by hand does not change the setting, and a re-render keeps it closed
    fireEvent.click(toggle);
    rerender(logElement(entries, { isActivityLogVisible: true }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    rerender(logElement(entries, { isActivityLogVisible: false }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('scrolls itself into view once it has opened from the button, but not when it starts open', () => {
    vi.useFakeTimers();
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const { unmount } = renderLog(entries, { isActivityLogVisible: true });
    act(() => vi.advanceTimersByTime(2 * ACTIVITY_DRAWER_MS));
    expect(scrollIntoView).not.toHaveBeenCalled();
    unmount();

    renderLog(entries, { isActivityLogVisible: false });
    fireEvent.click(screen.getByRole('button', { name: 'Activity log' }));
    // it waits for the drawer to finish opening, so it scrolls to the full height
    act(() => vi.advanceTimersByTime(ACTIVITY_DRAWER_MS - 1));
    expect(scrollIntoView).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    // closing it does not scroll
    fireEvent.click(screen.getByRole('button', { name: 'Activity log' }));
    act(() => vi.advanceTimersByTime(2 * ACTIVITY_DRAWER_MS));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('slides in only the rows that arrive after it is shown, then lets the mark go', () => {
    vi.useFakeTimers();
    const { rerender } = renderLog();
    const rows = () => within(screen.getByRole('table', { name: 'Hand 2 activity' })).getAllByRole('row').slice(1);
    expect(rows()).toHaveLength(2);
    expect(rows().some((row) => row.classList.contains('activity-row-new'))).toBe(false);

    const arrived: ActivityLogEntry = { id: 6, sessionId: 1, round: 2, event: 'draw', timestamp: 6000, name: 'Chris', description: 'drew 1 card from the top of the deck' };
    rerender(logElement([...entries, arrived], {}));
    expect(rows()).toHaveLength(3);
    // newest first: the arrival is the top row, and the rows already there stay still
    expect(rows().map((row) => row.classList.contains('activity-row-new'))).toEqual([true, false, false]);

    act(() => vi.advanceTimersByTime(ACTIVITY_ROW_ENTER_MS));
    expect(rows().some((row) => row.classList.contains('activity-row-new'))).toBe(false);

    // sorting afterwards does not slide anything in again
    fireEvent.click(within(screen.getByRole('table', { name: 'Hand 2 activity' })).getByRole('columnheader', { name: 'Player' }));
    expect(rows().some((row) => row.classList.contains('activity-row-new'))).toBe(false);
  });

  it('treats a cleared log as a fresh start', () => {
    const { rerender } = renderLog();
    rerender(logElement([], {}));
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
    expect(document.querySelector('.activity-row-new')).not.toBeInTheDocument();

    // the first entry after the clear is new, even though its id is lower than before
    rerender(logElement([entries[0]], {}));
    expect(document.querySelectorAll('.activity-row-new')).toHaveLength(1);
  });

  it('falls back to session groups for entries saved before hands were tracked', () => {
    renderLog([{ id: 1, sessionId: 3, timestamp: 1000, name: 'Chris', description: 'stayed' }]);
    expect(screen.getByRole('table', { name: 'Session 3 activity' })).toBeInTheDocument();
    expect(screen.getByLabelText('Activity')).toBeInTheDocument();
  });
});

describe('groupByHand', () => {
  it('keeps the entries of each hand together and orders hands by their newest entry', () => {
    const hands = groupByHand(entries);
    expect(hands.map((hand) => hand.label)).toEqual(['Hand 2', 'Hand 1']);
    expect(hands[1].entries.map((entry) => entry.id)).toEqual([1, 2, 3]);
  });
});

describe('formatChange', () => {
  it('signs gains and decreases and shows a dash when money does not move', () => {
    expect(formatChange(50)).toBe('+$50');
    expect(formatChange(-25)).toBe('-$25');
    expect(formatChange(0)).toBe('—');
    expect(formatChange(undefined)).toBe('—');
  });
});
