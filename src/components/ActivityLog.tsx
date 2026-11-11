// React
import React from "react";

import { Button, Table, TableBody, TableCell, TableCellLayout, TableHeader, TableHeaderCell, TableRow, Text, Tooltip } from '@fluentui/react-components';
import { Add20Regular, ArrowDown20Regular, ArrowForward20Regular, ArrowSwap20Regular, ArrowShuffle20Regular, ArrowUp20Regular, Flag20Regular, History20Regular, Info20Regular, Money20Regular, Play20Regular, Stack20Regular, Trophy20Regular } from '@fluentui/react-icons';

import { useSettingContext } from '../context';
import { ActivityLogEntry } from '../types';

/** how long a new row takes to slide in; keep in step with App.css */
export const ACTIVITY_ROW_ENTER_MS = 520;
/** how long the drawer takes to open or close; keep in step with App.css */
export const ACTIVITY_DRAWER_MS = 360;

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
  split: { icon: <ArrowSwap20Regular />, label: 'Split' },
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

interface IActivityLogProps {
  /** the entries to list; the Table passes them in once their toasts have faded out */
  entries: ActivityLogEntry[];
  isOpen: boolean;
}

/**
 * Whether the drawer is open. It starts as the Open Activity Log by default setting says and
 * follows the setting when that changes; the toggle button decides in between.
 */
export function useActivityDrawer(): { isOpen: boolean; toggle: () => void } {
  const { settings } = useSettingContext();
  const [isOpen, setOpen] = React.useState(settings.isActivityLogVisible);
  const [defaultOpen, setDefaultOpen] = React.useState(settings.isActivityLogVisible);
  if (defaultOpen !== settings.isActivityLogVisible) {
    setDefaultOpen(settings.isActivityLogVisible);
    setOpen(settings.isActivityLogVisible);
  }
  const toggle = React.useCallback(() => setOpen((open) => !open), []);
  return { isOpen, toggle };
}

/** The icon button at the end of the Table's dock that opens and closes the drawer */
export const ActivityLogToggle: React.FC<{ isOpen: boolean; onToggle: () => void }> = ({ isOpen, onToggle }) => (
  <Tooltip content="Activity log" relationship="label">
    <Button
      className="activity-log-toggle"
      appearance={isOpen ? 'primary' : 'secondary'}
      shape="circular"
      icon={<History20Regular />}
      aria-expanded={isOpen}
      aria-controls="ActivityLogRoot"
      onClick={onToggle}
    />
  </Tooltip>
);

/** The ids of the entries not seen before; none when the log was cleared or replaced */
function newEntryIds(entries: ActivityLogEntry[], seenThrough: number): Set<number> {
  return new Set(entries.filter((entry) => entry.id > seenThrough).map((entry) => entry.id));
}

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

/**
 * A drawer that extends from the bottom edge of the Table, up to a fixed height, and scrolls
 * its entries beneath the heading. Entries are grouped by hand; each new row slides down in
 * from above. The Table owns whether it is open (see useActivityDrawer).
 */
export const ActivityLog = React.memo(function ActivityLog({ entries, isOpen }: IActivityLogProps) {

  const [sort, setSort] = React.useState<SortState>(DEFAULT_SORT);
  const [announcement, setAnnouncement] = React.useState('');
  const announcedThrough = React.useRef(entries[entries.length - 1]?.id ?? 0);
  const hands = groupByHand(entries);
  const latestId = entries[entries.length - 1]?.id ?? 0;

  React.useEffect(() => {
    if (latestId < announcedThrough.current) {
      announcedThrough.current = latestId;
      setAnnouncement('');
      return;
    }
    const newEntries = entries.filter((entry) => entry.id > announcedThrough.current);
    announcedThrough.current = latestId;
    if (newEntries.length > 0) {
      setAnnouncement(newEntries.map((entry) => `${entry.name || 'Game'}: ${entry.description}`).join('. '));
    } else if (latestId === 0) {
      setAnnouncement('');
    }
  }, [entries, latestId]);

  // Rows that arrive while the log is mounted slide in; the ones already there do not.
  // The mark is dropped once the slide is over, so sorting does not replay it.
  const [seen, setSeen] = React.useState({ latestId, fresh: new Set<number>() });
  if (seen.latestId !== latestId) {
    setSeen({ latestId, fresh: newEntryIds(entries, seen.latestId) });
  }
  React.useEffect(() => {
    if (seen.fresh.size === 0) return;
    const timeoutId = window.setTimeout(() => setSeen((current) => ({ ...current, fresh: new Set() })), ACTIVITY_ROW_ENTER_MS);
    return () => window.clearTimeout(timeoutId);
  }, [seen]);

  // The drawer opens below the Table, which may be off screen: once it has opened, scroll it into view.
  // It is left alone when the page loads with it open.
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const wasOpen = React.useRef(isOpen);
  React.useEffect(() => {
    const justOpened = isOpen && !wasOpen.current;
    wasOpen.current = isOpen;
    if (!justOpened) return;
    const timeoutId = window.setTimeout(() => {
      drawerRef.current?.scrollIntoView?.({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }, ACTIVITY_DRAWER_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

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

  return (
    <>
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
      <div ref={drawerRef} className={isOpen ? 'activity-drawer is-open' : 'activity-drawer'}>
        <div className="activity-drawer-clip">
          <section
            id="ActivityLogRoot"
            className="activity-log"
            aria-labelledby="activity-log-heading"
            aria-hidden={!isOpen}
            inert={!isOpen}
          >
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
                            const rowClass = [tone && `activity-row-${tone}`, seen.fresh.has(item.id) && 'activity-row-new'].filter(Boolean).join(' ');
                            return (
                              <TableRow key={item.id} className={rowClass || undefined}>
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
        </div>
      </div>
    </>
  );
});
