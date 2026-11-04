// React
import React from "react";

import { Table, TableBody, TableCell, TableCellLayout, TableHeader, TableHeaderCell, TableRow, Text, Tooltip } from '@fluentui/react-components';
import { Add20Regular, ArrowForward20Regular, ArrowSwap20Regular, ArrowShuffle20Regular, ArrowUp20Regular, Flag20Regular, Info20Regular, Play20Regular, Stack20Regular, Trophy20Regular } from '@fluentui/react-icons';

import { useGameContext, useSettingContext } from '../context';
import { ActivityLogEntry } from '../types';

type SortColumn = 'timestamp' | 'name' | 'description';

const eventIcons = {
  game: { icon: <Play20Regular />, label: 'Game started' },
  round: { icon: <Flag20Regular />, label: 'New round' },
  deal: { icon: <Stack20Regular />, label: 'Cards dealt' },
  draw: { icon: <Add20Regular />, label: 'Card drawn' },
  bet: { icon: <ArrowUp20Regular />, label: 'Wager' },
  double: { icon: <ArrowUp20Regular />, label: 'Double down' },
  stay: { icon: <ArrowForward20Regular />, label: 'Stay' },
  win: { icon: <Trophy20Regular />, label: 'Round won' },
  push: { icon: <ArrowSwap20Regular />, label: 'Push' },
  shuffle: { icon: <ArrowShuffle20Regular />, label: 'Deck shuffled' },
};

const columns: { key: SortColumn; label: string }[] = [
  { key: 'timestamp', label: 'Time' },
  { key: 'name', label: 'Player' },
  { key: 'description', label: 'Event' },
];

export const ActivityLog: React.FC = () => {

  // Context
  const { settings } = useSettingContext();
  const { gameState } = useGameContext();
  const [sort, setSort] = React.useState<{ column: SortColumn; direction: 'ascending' | 'descending' }>({ column: 'timestamp', direction: 'ascending' });
  const sessions = new Map<number, ActivityLogEntry[]>();
  gameState.activityLog.forEach((entry) => {
    const sessionId = entry.sessionId ?? 1;
    const entries = sessions.get(sessionId) ?? [];
    entries.push(entry);
    sessions.set(sessionId, entries);
  });

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
        {gameState.activityLog.length === 0
          ? <Text size={300}>No activity yet</Text>
          : Array.from(sessions, ([sessionId, entries]) => (
            <section key={sessionId} className="activity-session" aria-labelledby={`activity-session-${sessionId}`}>
              <header className="activity-session-header">
                <Text as="h3" id={`activity-session-${sessionId}`} weight="semibold">Session {sessionId}</Text>
                <time dateTime={new Date(entries[0].timestamp).toISOString()}>
                  {new Date(entries[0].timestamp).toLocaleString('en-US')}
                </time>
              </header>
              <div className="activity-table-scroll">
                <Table aria-label={`Session ${sessionId} activity`} className="activity-table" size="small" sortable>
                  <TableHeader>
                    <TableRow>
                      {columns.map(({ key, label }) => (
                        <TableHeaderCell key={key} sortDirection={sort.column === key ? sort.direction : undefined} onClick={() => sortBy(key)}>
                          {label}
                        </TableHeaderCell>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.slice().sort(compareEntries).map((item) => {
                      const event = item.event ? eventIcons[item.event] : { icon: <Info20Regular />, label: 'Activity' };
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <time dateTime={new Date(item.timestamp).toISOString()}>{new Date(item.timestamp).toLocaleTimeString('en-US')}</time>
                          </TableCell>
                          <TableCell><Text weight="semibold">{item.name || 'Game'}</Text></TableCell>
                          <TableCell>
                            <TableCellLayout media={<Tooltip content={event.label} relationship="label"><span className="activity-event-icon" tabIndex={0}>{event.icon}</span></Tooltip>}>
                              {item.description}
                            </TableCellLayout>
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
