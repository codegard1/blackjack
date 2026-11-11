// React
import React from 'react';

import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

// Local Resources
import { getCharacter } from '../characters';
import { diffAnnouncements, snapshotGame } from '../functions/announcements';
import { CharacterPortrait } from './CharacterPortrait';
import { ITableToastsProps } from '../interfaces';
import { ActivityLogEntry, GameState, GameSnapshot, ToastItem, VisibleToast } from '../types';

/** how long a card takes to settle onto the stack */
export const TOAST_ENTER_MS = 450;
/**
 * How long every card stays in focus before it starts to leave. The next card arrives
 * at that moment, so each event gets the same time on screen however many are waiting.
 */
export const TOAST_HOLD_MS = 1800;
/** how long a card takes to fade out; the next card is already in place by then */
export const TOAST_EXIT_MS = 600;

const enterKeyframes = {
  from: { opacity: 0, transform: 'translateY(24px) scale(0.92)' },
  to: { opacity: 1, transform: 'translateY(0) scale(1)' },
};

const exitKeyframes = {
  from: { opacity: 1, transform: 'translateY(0) scale(1)' },
  to: { opacity: 0, transform: 'translateY(-14px) scale(0.94)' },
};

const fadeInKeyframes = { from: { opacity: 0 }, to: { opacity: 1 } };
const fadeOutKeyframes = { from: { opacity: 1 }, to: { opacity: 0 } };

const useStyles = makeStyles({
  // every card shares one grid cell, so the stack holds its position as cards come and go
  region: {
    position: 'absolute',
    top: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 5,
    display: 'grid',
    justifyItems: 'center',
    alignItems: 'start',
    width: 'min(92%, 520px)',
    pointerEvents: 'none',
  },
  toast: {
    gridArea: '1 / 1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalXXS,
    minWidth: 'min(80%, 300px)',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalXXL}`,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow28,
    color: tokens.colorNeutralForegroundOnBrand,
    textAlign: 'center',
    fontSize: 'clamp(22px, 4vw, 34px)',
    fontWeight: tokens.fontWeightBold,
    lineHeight: 1.15,
    animationName: enterKeyframes,
    animationDuration: `${TOAST_ENTER_MS}ms`,
    animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
    animationFillMode: 'both',
    '@media (prefers-reduced-motion: reduce)': { animationName: fadeInKeyframes },
  },
  leaving: {
    animationName: exitKeyframes,
    animationDuration: `${TOAST_EXIT_MS}ms`,
    animationTimingFunction: tokens.curveEasyEase,
    animationFillMode: 'both',
    '@media (prefers-reduced-motion: reduce)': { animationName: fadeOutKeyframes },
  },
  brand: { backgroundColor: tokens.colorBrandBackground },
  neutral: { backgroundColor: tokens.colorNeutralBackground3, color: tokens.colorNeutralForeground1 },
  danger: { backgroundColor: tokens.colorPaletteRedBackground3 },
  success: { backgroundColor: tokens.colorPaletteGreenBackground3 },
  info: { backgroundColor: tokens.colorPaletteBlueBackground2, color: tokens.colorPaletteBlueForeground2 },
  // a ring keeps the picture from blending into the toast, whose brand color matches a player's initials
  portrait: {
    boxShadow: `0 0 0 2px ${tokens.colorNeutralForegroundOnBrand}`,
  },
  subtitle: {
    fontSize: 'clamp(14px, 2.2vw, 18px)',
    fontWeight: tokens.fontWeightRegular,
    opacity: 0.9,
  },
});

const TableToast: React.FC<{ toast: VisibleToast }> = ({ toast }) => {
  const styles = useStyles();
  return (
    <div className={mergeClasses(styles.toast, styles[toast.tone], toast.isLeaving && styles.leaving)}>
      {toast.playerKey && (getCharacter(toast.playerKey) || toast.playerName) && (
        <CharacterPortrait id={toast.playerKey} name={toast.playerName ?? toast.title} size="md" decorative className={styles.portrait} />
      )}
      <span>{toast.title}</span>
      {toast.subtitle && <span className={styles.subtitle}>{toast.subtitle}</span>}
    </div>
  );
};

/**
 * Large notification cards over the table. Each new card lands on top of the last one,
 * in the same place, while the last one fades out beneath it.
 */
export const TableToasts: React.FC<ITableToastsProps> = ({ toasts }) => {
  const styles = useStyles();
  return (
    <div className={styles.region} role="status" aria-live="polite">
      {toasts.map((toast) => <TableToast key={toast.id} toast={toast} />)}
    </div>
  );
};

/** The scheduled life of one toast */
type ToastPlan = {
  /** the log entries up to this id appear the moment the toast has finished fading out */
  revealId: number;
  /** the log this plan belongs to; a cleared log makes older plans obsolete */
  generation: number;
};

const latestEntryId = (entries: ActivityLogEntry[]): number => entries[entries.length - 1]?.id ?? 0;

/**
 * Queue announcements for every meaningful change in the game, and pace the activity log
 * to them. The first state seen is only a baseline, so a restored game does not replay
 * its history.
 *
 * Every toast gets the same schedule: it appears no sooner than TOAST_HOLD_MS after the
 * one before it, then fades out TOAST_HOLD_MS later. The log entries recorded by the
 * same change are held back until the last of its toasts has finished fading out, and
 * are returned from this hook only then, in order. Entries with no toast of their own
 * wait behind whichever toast is still due, so they never overtake earlier ones.
 *
 * Each toast takes longer than a computer player's move, so play would outrun them. While a
 * toast is waiting for its turn the hook reports `isBacklogged`, and the Table holds
 * computer play until the toast has appeared; the moves then keep pace with the notices.
 * @param gameState current game state
 * @param revealDealerTotal true when the dealer's total may be shown
 * @returns the toasts on screen, the activity log entries that may be shown, and whether a toast is waiting
 */
export function useTableToasts(
  gameState: GameState,
  revealDealerTotal: boolean,
): { toasts: VisibleToast[]; activityLog: ActivityLogEntry[]; isBacklogged: boolean } {
  const [shown, setShown] = React.useState<VisibleToast[]>([]);
  /** toasts scheduled but not yet on screen */
  const [waiting, setWaiting] = React.useState(0);
  const [revealedId, setRevealedId] = React.useState(() => latestEntryId(gameState.activityLog));
  const previous = React.useRef<GameSnapshot | null>(null);
  const nextId = React.useRef(1);
  /** earliest time the next toast may appear */
  const nextShowAt = React.useRef(0);
  /** the newest entry id handed to the pacing so far */
  const loggedId = React.useRef(revealedId);
  /** the last toast to be shown that has not finished fading out */
  const tail = React.useRef<ToastPlan | null>(null);
  const generation = React.useRef(0);
  /** scheduled steps, cancelled on unmount */
  const pending = React.useRef<Set<number>>(new Set());

  React.useEffect(() => {
    const scheduled = pending.current;
    return () => scheduled.forEach((timerId) => window.clearTimeout(timerId));
  }, []);

  const later = React.useCallback((delayMs: number, run: () => void) => {
    if (delayMs <= 0) {
      run();
      return;
    }
    const timerId = window.setTimeout(() => {
      pending.current.delete(timerId);
      run();
    }, delayMs);
    pending.current.add(timerId);
  }, []);

  /** show a toast for its fixed time, then fade it out and hand over its log entries */
  const present = React.useCallback((toast: ToastItem, plan: ToastPlan, delayMs: number) => {
    if (delayMs > 0) setWaiting((count) => count + 1);
    later(delayMs, () => {
      if (delayMs > 0) setWaiting((count) => count - 1);
      setShown((list) => [...list, { ...toast, isLeaving: false }]);
      later(TOAST_HOLD_MS, () => {
        setShown((list) => list.map((item) => item.id === toast.id ? { ...item, isLeaving: true } : item));
        later(TOAST_EXIT_MS, () => {
          setShown((list) => list.filter((item) => item.id !== toast.id));
          if (tail.current === plan) tail.current = null;
          if (plan.generation === generation.current) {
            setRevealedId((current) => Math.max(current, plan.revealId));
          }
        });
      });
    });
  }, [later]);

  React.useEffect(() => {
    const current = snapshotGame(gameState);
    const prior = previous.current;
    previous.current = current;

    // A cleared log starts over: nothing in it is waiting for a toast
    const latestId = latestEntryId(gameState.activityLog);
    if (latestId < loggedId.current) {
      generation.current += 1;
      tail.current = null;
      loggedId.current = latestId;
      setRevealedId(latestId);
    }
    const hasNewEntries = latestId > loggedId.current;
    loggedId.current = latestId;
    if (!prior) return;

    const items = diffAnnouncements(prior, current, revealDealerTotal);

    // Each toast appears no sooner than TOAST_HOLD_MS after the previous one
    let last: ToastPlan | undefined;
    for (const item of items) {
      // a seat's name lets a player without a portrait show their initials
      const playerName = current.players.find((player) => player.key === item.playerKey)?.title;
      const toast: ToastItem = { ...item, ...(playerName ? { playerName } : {}), id: nextId.current++ };
      const showAt = Math.max(Date.now(), nextShowAt.current);
      nextShowAt.current = showAt + TOAST_HOLD_MS;
      last = { revealId: 0, generation: generation.current };
      tail.current = last;
      present(toast, last, showAt - Date.now());
    }

    if (!hasNewEntries) return;
    if (last) {
      last.revealId = latestId;
    } else if (tail.current) {
      tail.current.revealId = latestId;
    } else {
      setRevealedId(latestId);
    }
  }, [gameState, revealDealerTotal, present]);

  const activityLog = React.useMemo(
    () => gameState.activityLog.filter((entry) => entry.id <= revealedId),
    [gameState.activityLog, revealedId],
  );

  return { toasts: shown, activityLog, isBacklogged: waiting > 0 };
}
