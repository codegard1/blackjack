// React
import React from 'react';

import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

// Local Resources
import { getCharacter } from '../characters';
import { diffAnnouncements, snapshotGame } from '../functions/announcements';
import { CharacterPortrait } from './CharacterPortrait';
import { ITableToastsProps } from '../interfaces';
import { ActivityLogEntry, GameState, GameSnapshot, ToastFocus, ToastItem, VisibleToast } from '../types';

/** how long a line takes to open up in the feed; keep in step with the enter animation below */
export const TOAST_ENTER_MS = 300;
/**
 * The least time between one line arriving and the next. Lines wait their turn in order, so
 * a quick run of events reads as a sequence rather than a flash, but each is shown beside the
 * lines before it instead of replacing them.
 */
export const TOAST_GAP_MS = 900;
/** how long a line stays when nothing pushes it out; it then fades */
export const TOAST_LIFE_MS = 6000;
/** how long a line takes to fade out and close up */
export const TOAST_EXIT_MS = 400;
/** the lines the feed holds; a fourth arriving makes the oldest fade */
export const TOAST_MAX_LINES = 3;
/** the lines the feed over the pot holds; a new contribution takes the place of the last */
export const TOAST_POT_MAX_LINES = 1;
/** how long after a line arrives the activity log entries recorded by the same change appear */
export const TOAST_REVEAL_MS = 2000;
/**
 * How long a seat's result holds the newest place before the next may arrive, longer than
 * other notices so each seat's chip has time to pulse as its result is told. It is also how
 * long that chip keeps focus.
 */
export const TOAST_RESULT_MS = 1200;

// a line opens up from nothing and closes back to nothing, so the lines around it slide rather than jump
const enterKeyframes = {
  from: { opacity: 0, gridTemplateRows: '0fr' },
  to: { opacity: 1, gridTemplateRows: '1fr' },
};

const exitKeyframes = {
  from: { opacity: 1, gridTemplateRows: '1fr' },
  to: { opacity: 0, gridTemplateRows: '0fr' },
};

const fadeInKeyframes = { from: { opacity: 0 }, to: { opacity: 1 } };
const fadeOutKeyframes = { from: { opacity: 1 }, to: { opacity: 0 } };

const useStyles = makeStyles({
  // a feed sits just above the dock, so the notices are beside the buttons wherever the board scrolls to
  region: {
    position: 'absolute',
    bottom: `calc(100% + ${tokens.spacingVerticalXS})`,
    display: 'flex',
    flexDirection: 'column',
    pointerEvents: 'none',
  },
  // the table's notices run above the middle of the dock
  tableRegion: {
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(96%, 560px)',
  },
  // the pot's notices sit over the pot, at the start of the dock; Table.css lines them up with it
  potRegion: {
    width: 'max-content',
    maxWidth: '96%',
  },
  // each line is a grid row that can collapse to nothing
  line: {
    display: 'grid',
    gridTemplateRows: '1fr',
    transitionProperty: 'opacity',
    transitionDuration: tokens.durationGentle,
    transitionTimingFunction: tokens.curveEasyEase,
    animationName: enterKeyframes,
    animationDuration: `${TOAST_ENTER_MS}ms`,
    animationTimingFunction: tokens.curveDecelerateMax,
    animationFillMode: 'backwards',
    '@media (prefers-reduced-motion: reduce)': { animationName: fadeInKeyframes },
  },
  leaving: {
    animationName: exitKeyframes,
    animationDuration: `${TOAST_EXIT_MS}ms`,
    animationTimingFunction: tokens.curveEasyEase,
    animationFillMode: 'both',
    '@media (prefers-reduced-motion: reduce)': { animationName: fadeOutKeyframes },
  },
  // older lines are dimmer, the newest is at full strength; the dimmest stays legible
  older: { opacity: 0.85 },
  oldest: { opacity: 0.65 },
  // the room for the pill's shadow, inside the box that clips the collapsing line
  lineInner: {
    minHeight: 0,
    overflow: 'hidden',
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalS}`,
  },
  pill: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    width: 'fit-content',
    maxWidth: '100%',
    boxSizing: 'border-box',
    margin: '0 auto',
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow4,
    color: tokens.colorNeutralForegroundOnBrand,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
  },
  // over the pot a line starts where the pot does, rather than in the middle of its feed
  potPill: { margin: 0 },
  brand: { backgroundColor: tokens.colorBrandBackground },
  neutral: { backgroundColor: tokens.colorNeutralBackground3, color: tokens.colorNeutralForeground1 },
  danger: { backgroundColor: tokens.colorPaletteRedBackground3 },
  success: { backgroundColor: tokens.colorPaletteGreenBackground3 },
  info: { backgroundColor: tokens.colorPaletteBlueBackground2, color: tokens.colorPaletteBlueForeground2 },
  // a ring keeps the picture from blending into the line, whose brand color matches a player's initials
  portrait: {
    boxShadow: `0 0 0 1px ${tokens.colorNeutralForegroundOnBrand}`,
  },
  // the title and its detail run on as one line of text, and wrap together when the room is short
  text: {
    minWidth: 0,
    overflowWrap: 'anywhere',
  },
  title: {
    fontWeight: tokens.fontWeightBold,
  },
  subtitle: {
    marginLeft: tokens.spacingHorizontalS,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightRegular,
    opacity: 0.9,
  },
  // the pot's own badge shows the amount, so over the pot it is left for assistive technology
  hiddenSubtitle: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
  },
});

/** True for a toast about money going into the pot; it is shown over the pot, apart from the table's notices */
export const isPotToast = (toast: { kind?: ToastItem['kind'] }): boolean => toast.kind === 'pot-contribution';

const TableToast: React.FC<{ toast: VisibleToast; age: number; overPot: boolean }> = ({ toast, age, overPot }) => {
  const styles = useStyles();
  return (
    <div className={mergeClasses(styles.line, age === 1 && styles.older, age >= 2 && styles.oldest, toast.isLeaving && styles.leaving)}>
      <div className={styles.lineInner}>
        <div className={mergeClasses(styles.pill, styles[toast.tone], overPot && styles.potPill)}>
          {toast.playerKey && (getCharacter(toast.playerKey) || toast.playerName) && (
            <CharacterPortrait id={toast.playerKey} name={toast.playerName ?? toast.title} size="sm" decorative className={styles.portrait} />
          )}
          <span className={styles.text}>
            <span className={styles.title}>{toast.title}</span>
            {toast.subtitle && <span className={overPot ? styles.hiddenSubtitle : styles.subtitle}>{toast.subtitle}</span>}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * A short running feed of notices, anchored just above the dock. New lines arrive at the
 * bottom, beside the buttons, and push the older ones up and dim them; a line fades once
 * its time is up or when more lines than the feed holds are showing. Render it inside the
 * dock, which positions it. The table's notices run above the middle of the dock; with
 * `placement="pot"` the feed sits over the pot instead, for the money going into it.
 * `isFlat` shows every line at full strength, for the pot's breakdown, which is a list
 * rather than a sequence.
 */
export const TableToasts: React.FC<ITableToastsProps> = ({ toasts, placement = 'table', isFlat = false }) => {
  const styles = useStyles();
  const overPot = placement === 'pot';
  // how many lines newer than this one are still showing
  const liveIds = toasts.filter((toast) => !toast.isLeaving).map((toast) => toast.id);
  return (
    <div className={mergeClasses(styles.region, overPot ? styles.potRegion : styles.tableRegion, `table-toasts-${placement}`)} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <TableToast key={toast.id} toast={toast} overPot={overPot} age={isFlat ? 0 : Math.max(0, liveIds.length - 1 - liveIds.indexOf(toast.id))} />
      ))}
    </div>
  );
};

/** The scheduled life of one toast */
type ToastPlan = {
  /** the log entries up to this id appear once the toast has had its moment on screen */
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
 * Toasts show in order, no sooner than TOAST_GAP_MS after the one before, and each stays
 * beside the ones already showing. A toast leaves after TOAST_LIFE_MS, or sooner when more
 * than its feed holds are showing and it is the oldest: TOAST_MAX_LINES of the table's
 * notices, TOAST_POT_MAX_LINES of the pot's (see `isPotToast`). Both kinds share the one
 * queue, so they still arrive in order; the Table shows them in separate places. The log entries recorded by the
 * same change are held back until the last of its toasts has been on screen for
 * TOAST_REVEAL_MS, and are returned from this hook only then, in order. Entries with no
 * toast of their own wait behind whichever toast is still due, so they never overtake
 * earlier ones.
 *
 * Computer players move faster than the toasts show. While a toast is waiting for its turn
 * the hook reports `isBacklogged`, and the Table holds computer play until the toast has
 * appeared; the moves then keep pace with the notices.
 *
 * At the end of a round each seat's result is a toast of its own, each holding the newest
 * place for TOAST_RESULT_MS. While one is shown its seat has `focus`, so its chip can pulse,
 * and `isAnnouncingResults` stays true from the moment the results are queued until the last
 * seat has had its turn. The results wait out `holdResultsMs` first, the time the Table is
 * still showing the dealer's hole card turning over.
 * @param gameState current game state
 * @param revealDealerTotal true when the dealer's total may be shown
 * @param holdResultsMs how long the results of a round that has just ended must wait before they start
 * @returns the toasts on screen, the activity log entries that may be shown, whether a toast is waiting,
 * the seat in focus, and whether results are being announced
 */
export function useTableToasts(
  gameState: GameState,
  revealDealerTotal: boolean,
  holdResultsMs = 0,
): { toasts: VisibleToast[]; activityLog: ActivityLogEntry[]; isBacklogged: boolean; focus?: ToastFocus; isAnnouncingResults: boolean } {
  const [shown, setShown] = React.useState<VisibleToast[]>([]);
  /** toasts scheduled but not yet on screen */
  const [waiting, setWaiting] = React.useState(0);
  /** result toasts queued or in focus */
  const [announcing, setAnnouncing] = React.useState(0);
  const [focus, setFocus] = React.useState<ToastFocus>();
  // the latest wait, read when a round's results are queued so a change to it does not rerun the diff
  const holdResults = React.useRef(holdResultsMs);
  holdResults.current = holdResultsMs;
  const [revealedId, setRevealedId] = React.useState(() => latestEntryId(gameState.activityLog));
  const previous = React.useRef<GameSnapshot | null>(null);
  const nextId = React.useRef(1);
  /** earliest time the next toast may appear */
  const nextShowAt = React.useRef(0);
  /** the newest entry id handed to the pacing so far */
  const loggedId = React.useRef(revealedId);
  /** the last toast to be shown whose log entries have not been revealed */
  const tail = React.useRef<ToastPlan | null>(null);
  const generation = React.useRef(0);
  /** scheduled steps, cancelled on unmount */
  const pending = React.useRef<Set<number>>(new Set());
  /** the toasts on screen: false while showing, true once they have been told to leave */
  const leaving = React.useRef<Map<number, boolean>>(new Map());

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

  /** fade a toast out and take it away; a toast already leaving, or gone, is left alone */
  const dismiss = React.useCallback((id: number) => {
    if (leaving.current.get(id) !== false) return;
    leaving.current.set(id, true);
    setShown((list) => list.map((item) => item.id === id ? { ...item, isLeaving: true } : item));
    later(TOAST_EXIT_MS, () => {
      leaving.current.delete(id);
      setShown((list) => list.filter((item) => item.id !== id));
    });
  }, [later]);

  /** show a toast, schedule its leaving, and hand over its log entries once it has had its moment */
  const present = React.useCallback((toast: ToastItem, plan: ToastPlan, delayMs: number) => {
    const isResult = toast.kind === 'result';
    if (delayMs > 0) setWaiting((count) => count + 1);
    if (isResult) setAnnouncing((count) => count + 1);
    later(delayMs, () => {
      if (delayMs > 0) setWaiting((count) => count - 1);
      leaving.current.set(toast.id, false);
      setShown((list) => [...list, { ...toast, isLeaving: false }]);
      if (isResult) {
        // the seat is in focus while its result is the newest notice
        if (toast.playerKey) setFocus({ id: toast.id, key: toast.playerKey, tone: toast.tone });
        later(TOAST_RESULT_MS, () => {
          setFocus((current) => current?.id === toast.id ? undefined : current);
          setAnnouncing((count) => count - 1);
        });
      }
      later(TOAST_REVEAL_MS, () => {
        if (tail.current === plan) tail.current = null;
        if (plan.generation === generation.current) {
          setRevealedId((current) => Math.max(current, plan.revealId));
        }
      });
      later(TOAST_LIFE_MS, () => dismiss(toast.id));
    });
  }, [later, dismiss]);

  // the oldest lines make way when more are showing than their feed holds
  React.useEffect(() => {
    const showing = shown.filter((item) => !item.isLeaving);
    const makeWay = (lines: VisibleToast[], held: number) => lines.slice(0, Math.max(0, lines.length - held)).forEach((item) => dismiss(item.id));
    makeWay(showing.filter((item) => !isPotToast(item)), TOAST_MAX_LINES);
    makeWay(showing.filter(isPotToast), TOAST_POT_MAX_LINES);
  }, [shown, dismiss]);

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

    // a seat left in focus from the last round has no claim on the next
    if (current.round !== prior.round) setFocus(undefined);

    const items = diffAnnouncements(prior, current, revealDealerTotal);

    // Each toast appears no sooner than TOAST_GAP_MS after the previous one, a result TOAST_RESULT_MS;
    // the first result also waits for the dealer's hole card to finish turning over
    let last: ToastPlan | undefined;
    let isHeld = false;
    for (const item of items) {
      // a seat's name lets a player without a portrait show their initials
      const playerName = current.players.find((player) => player.key === item.playerKey)?.title;
      const toast: ToastItem = { ...item, ...(playerName ? { playerName } : {}), id: nextId.current++ };
      if (item.kind === 'result' && !isHeld) {
        isHeld = true;
        nextShowAt.current = Math.max(nextShowAt.current, Date.now() + holdResults.current);
      }
      const showAt = Math.max(Date.now(), nextShowAt.current);
      nextShowAt.current = showAt + (item.kind === 'result' ? TOAST_RESULT_MS : TOAST_GAP_MS);
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

  return { toasts: shown, activityLog, isBacklogged: waiting > 0, focus, isAnnouncingResults: announcing > 0 };
}
