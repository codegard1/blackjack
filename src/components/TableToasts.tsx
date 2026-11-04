// React
import React from 'react';

import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

// Local Resources
import { diffAnnouncements, snapshotGame } from '../functions/announcements';
import { ITableToastsProps } from '../interfaces';
import { GameState, GameSnapshot, ToastItem } from '../types';

/** how long a toast stays fully visible */
const HOLD_MS = 950;
/** how long a toast takes to animate out */
const EXIT_MS = 220;
/** toasts shown at once; older ones animate out to make room */
const VISIBLE_LIMIT = 2;
/** toasts kept while the dealer is busy, so a burst cannot grow without bound */
const QUEUE_LIMIT = 6;

const enterKeyframes = {
  from: { opacity: 0, transform: 'translateY(28px) scale(0.6)' },
  to: { opacity: 1, transform: 'translateY(0) scale(1)' },
};

const exitKeyframes = {
  from: { opacity: 1, transform: 'scale(1)' },
  to: { opacity: 0, transform: 'translateY(-12px) scale(0.92)' },
};

const useStyles = makeStyles({
  region: {
    position: 'absolute',
    top: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 5,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalS,
    width: 'min(92%, 520px)',
    pointerEvents: 'none',
  },
  toast: {
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
    animationDuration: '260ms',
    animationTimingFunction: 'cubic-bezier(0.2, 0.9, 0.3, 1.2)',
    animationFillMode: 'both',
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
  },
  leaving: {
    animationName: exitKeyframes,
    animationDuration: `${EXIT_MS}ms`,
    animationTimingFunction: tokens.curveAccelerateMid,
    animationFillMode: 'both',
  },
  brand: { backgroundColor: tokens.colorBrandBackground },
  neutral: { backgroundColor: tokens.colorNeutralBackgroundInverted, color: tokens.colorNeutralForegroundInverted },
  danger: { backgroundColor: tokens.colorPaletteRedBackground3 },
  success: { backgroundColor: tokens.colorPaletteGreenBackground3 },
  info: { backgroundColor: tokens.colorPaletteBlueBorderActive },
  subtitle: {
    fontSize: 'clamp(14px, 2.2vw, 18px)',
    fontWeight: tokens.fontWeightRegular,
    opacity: 0.9,
  },
});

interface ITableToastProps {
  toast: ToastItem;
  /** pushed out by newer toasts; animates out at once */
  isRetiring: boolean;
  onDismiss: (id: number) => void;
}

const TableToast: React.FC<ITableToastProps> = ({ toast, isRetiring, onDismiss }) => {
  const styles = useStyles();
  const [isTimedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    if (isRetiring) {
      const removeId = window.setTimeout(() => onDismiss(toast.id), EXIT_MS);
      return () => window.clearTimeout(removeId);
    }
    const leaveId = window.setTimeout(() => setTimedOut(true), HOLD_MS);
    const removeId = window.setTimeout(() => onDismiss(toast.id), HOLD_MS + EXIT_MS);
    return () => {
      window.clearTimeout(leaveId);
      window.clearTimeout(removeId);
    };
  }, [toast.id, isRetiring, onDismiss]);

  const isLeaving = isRetiring || isTimedOut;

  return (
    <div className={mergeClasses(styles.toast, styles[toast.tone], isLeaving && styles.leaving)}>
      <span>{toast.title}</span>
      {toast.subtitle && <span className={styles.subtitle}>{toast.subtitle}</span>}
    </div>
  );
};

/**
 * Large notifications that animate in over the table and disappear quickly
 */
export const TableToasts: React.FC<ITableToastsProps> = ({ toasts, onDismiss }) => {
  const styles = useStyles();
  return (
    <div className={styles.region} role="status" aria-live="polite">
      {toasts.map((toast, index) => (
        <TableToast
          key={toast.id}
          toast={toast}
          isRetiring={index < toasts.length - VISIBLE_LIMIT}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};

/**
 * Queue announcements for every meaningful change in the game. The first state seen
 * is only a baseline, so a restored game does not replay its history.
 * @param gameState current game state
 * @param revealDealerTotal true when the dealer's total may be shown
 */
export function useTableToasts(gameState: GameState, revealDealerTotal: boolean): { toasts: ToastItem[]; dismiss: (id: number) => void } {
  const [queue, setQueue] = React.useState<ToastItem[]>([]);
  const previous = React.useRef<GameSnapshot | null>(null);
  const nextId = React.useRef(1);

  React.useEffect(() => {
    const current = snapshotGame(gameState);
    const prior = previous.current;
    previous.current = current;
    if (!prior) return;

    const items = diffAnnouncements(prior, current, revealDealerTotal);
    if (items.length === 0) return;

    const withIds = items.map((item) => ({ ...item, id: nextId.current++ }));
    setQueue((list) => [...list, ...withIds].slice(-QUEUE_LIMIT));
  }, [gameState, revealDealerTotal]);

  const dismiss = React.useCallback((id: number) => {
    setQueue((list) => list.filter((toast) => toast.id !== id));
  }, []);

  return { toasts: queue, dismiss };
}
