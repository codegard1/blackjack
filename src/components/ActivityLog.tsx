// React
import React from "react";

import { Table, TableBody, TableCell, TableCellLayout, TableHeader, TableHeaderCell, TableRow, Text, Tooltip } from '@fluentui/react-components';
import { Add20Regular, ArrowDown20Regular, ArrowForward20Regular, ArrowSwap20Regular, ArrowShuffle20Regular, ArrowUp20Regular, Flag20Regular, Info20Regular, Money20Regular, Play20Regular, Stack20Regular, Trophy20Regular } from '@fluentui/react-icons';

import { useGameContext, useSettingContext } from '../context';
import { ActivityLogEntry } from '../types';

type SortColumn = 'timestamp' | 'name' | 'description';
type SortState = { column: SortColumn; direction: 'ascending' | 'descending' };

/** newest entries first */
const DEFAULT_SORT: SortState = { column: 'timestamp', direction: 'descending' };

const eventIcons = {
  game: { icon: <Play20Regular />, label: 'Game started' },
  round: { icon: <Flag20Regular />, label: 'New round' },
  deal: { icon: <Stack20Regular />, label: 'Cards dealt' },
  draw: { icon: <Add20Regular />, label: 'Card drawn' },
  ante: { icon: <Money20Regular />, label: 'Ante' },
  bet: { icon: <ArrowUp20Regular />, label: 'Wager' },
  double: { icon: <ArrowUp20Regular />, label: 'Double down' },
  stay: { icon: <ArrowForward20Regular />, label: 'Stay' },
  win: { icon: <Trophy20Regular />, label: 'Round won' },
  loss: { icon: <ArrowDown20Regular />, label: 'Round lost' },
  push: { icon: <ArrowSwap20Regular />, label: 'Push' },
  shuffle: { icon: <ArrowShuffle20Regular />, label: 'Deck shuffled' },
};

const columns: { key: SortColumn; label: string }[] = [
  { key: 'timestamp', label: 'Time' },
  { key: 'name', label: 'Player' },
  { key: 'description', label: 'Event' },
];

/** One hand of play: the entries recorded while it was in progress */
export type ActivityHand = {
  key: string;
  label: string;
  entries: ActivityLogEntry[];
  newest: number;
};

/**
 * Group entries by hand. Entries saved before hands were tracked fall back to their session.
 * Hands are ordered newest first.
 */
export function groupByHand(entries: ActivityLogEntry[]): ActivityHand[] {
  const hands = new Map<string, ActivityHand>();
  for (const entry of entries) {
    const isHand = entry.round !== undefined;
    const key = isHand ? `hand-${entry.round}` : `session-${entry.sessionId ?? 1}`;
    const hand = hands.get(key) ?? {
      key,
      label: isHand ? `Hand ${entry.round}` : `Session ${entry.sessionId ?? 1}`,
      entries: [],
      newest: 0,
    };
    hand.entries.push(entry);
    hand.newest = Math.max(hand.newest, entry.timestamp);
    hands.set(key, hand);
  }
  return Array.from(hands.values()).sort((first, second) => second.newest - first.newest);
}

/** Money moved for the player: "+$50" for a gain, "-$25" for a decrease, a dash for none */
export function formatChange(amount?: number): string {
  if (!amount) return '—';
  return `${amount > 0 ? '+' : '-'}$${Math.abs(amount)}`;
}

/** Gains are highlighted green and decreases red; results with no movement are red when lost */
function changeTone(item: ActivityLogEntry): 'gain' | 'loss' | undefined {
  if ((item.amount ?? 0) > 0 || item.event === 'win') return 'gain';
  if ((item.amount ?? 0) < 0 || item.event === 'loss') return 'loss';
  return undefined;
}

export const ActivityLog: React.FC = () => {

  // Context
  const { settings } = useSettingContext();
  const { gameState } = useGameContext();
  const [sort, setSort] = React.useState<SortState>(DEFAULT_SORT);
  const hands = groupByHand(gameState.activityLog);

  const sortBy = (column: SortColumn): void => {
    setSort((previous) => ({
      column,
      direction: previous.column === column && previous.direction === 'ascending' ? 'descending' : 'ascending',
    }));
  };

  const compareEntries = (first: ActivityLogEntry, second: ActivityLogEntry): number => {
    const comparison = sort.column === 'timestamp'
      ? first.timestamp - second.timestamp
      : sort.column === 'name'
        ? (first.name || 'Game').localeCompare(second.name || 'Game')
        : first.description.localeCompare(second.description);
    return (comparison || first.id - second.id) * (sort.direction === 'ascending' ? 1 : -1);
  };

  return !settings.isActivityLogVisible ? null : (
    <section id="ActivityLogRoot" className="activity-log" aria-labelledby="activity-log-heading">
      <Text as="h2" id="activity-log-heading" size={500} weight="semibold">Activity Log</Text>
      <div className="activity-log-content">
        {hands.length === 0
          ? <Text size={300}>No activity yet</Text>
          : hands.map((hand) => (
            <section key={hand.key} className="activity-hand" aria-labelledby={`activity-${hand.key}`}>
              <header className="activity-session-header">
                <Text as="h3" id={`activity-${hand.key}`} weight="semibold">{hand.label}</Text>
                <time dateTime={new Date(hand.newest).toISOString()}>
                  {new Date(hand.newest).toLocaleString('en-US')}
                </time>
              </header>
              <div className="activity-table-scroll">
                <Table aria-label={`${hand.label} activity`} className="activity-table" size="small" sortable>
                  <TableHeader>
                    <TableRow>
                      {columns.map(({ key, label }) => (
                        <TableHeaderCell key={key} sortDirection={sort.column === key ? sort.direction : undefined} onClick={() => sortBy(key)}>
                          {label}
                        </TableHeaderCell>
                      ))}
                      <TableHeaderCell className="activity-change-header">Change</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hand.entries.slice().sort(compareEntries).map((item) => {
                      const event = item.event ? eventIcons[item.event] : { icon: <Info20Regular />, label: 'Activity' };
                      const tone = changeTone(item);
                      return (
                        <TableRow key={item.id} className={tone ? `activity-row-${tone}` : undefined}>
                          <TableCell>
                            <time dateTime={new Date(item.timestamp).toISOString()}>{new Date(item.timestamp).toLocaleTimeString('en-US')}</time>
                          </TableCell>
                          <TableCell><Text weight="semibold">{item.name || 'Game'}</Text></TableCell>
                          <TableCell>
                            <TableCellLayout media={<Tooltip content={event.label} relationship="label"><span className="activity-event-icon" tabIndex={0}>{event.icon}</span></Tooltip>}>
                              {item.description}
                            </TableCellLayout>
                          </TableCell>
                          <TableCell>
                            <span className={tone ? `activity-change activity-change-${tone}` : 'activity-change'}>{formatChange(item.amount)}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </section>
          ))}
      </div>
    </section>
  );
}
