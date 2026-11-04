// React
import React from 'react';

import { Badge, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

// Local Resources
import { CardStack } from '.';
import { ISeatChipProps } from '../interfaces';

const floatKeyframes = {
  '0%': { transform: 'translateY(0) rotate(-1.5deg)' },
  '50%': { transform: 'translateY(-8px) rotate(1.5deg)' },
  '100%': { transform: 'translateY(0) rotate(-1.5deg)' },
};

const useStyles = makeStyles({
  chip: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: tokens.spacingVerticalS,
    width: 'fit-content',
    minWidth: '180px',
    maxWidth: '100%',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    margin: 0,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow4,
    color: tokens.colorNeutralForeground1,
    textAlign: 'left',
    transitionProperty: 'box-shadow, transform',
    transitionDuration: tokens.durationGentle,
    transitionTimingFunction: tokens.curveEasyEase,
    '@media (prefers-reduced-motion: reduce)': { transitionDuration: '0.01ms' },
  },
  interactive: {
    ':hover': { boxShadow: tokens.shadow8 },
  },
  floating: {
    animationName: floatKeyframes,
    animationDuration: '3600ms',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
  },
  // the name, bank, status and total; a button when the chip can be selected
  info: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: tokens.spacingVerticalXXS,
    margin: 0,
    padding: 0,
    border: 'none',
    background: 'none',
    color: 'inherit',
    font: 'inherit',
    textAlign: 'left',
    cursor: 'default',
  },
  selectable: {
    cursor: 'pointer',
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' },
  },
  name: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightBase400,
  },
  total: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

/**
 * A collapsed seat: the player's name and bank, an optional status and hand total,
 * and the player's cards when given
 */
export const SeatChip: React.FC<ISeatChipProps> = (props) => {
  const { player, status, total, cards, floating, index, onSelect } = props;
  const styles = useStyles();

  const className = mergeClasses(
    styles.chip,
    onSelect && styles.interactive,
    floating && styles.floating,
  );
  const style: React.CSSProperties | undefined = floating ? { animationDelay: `${(index ?? 0) * 450}ms` } : undefined;

  const infoContent = (
    <>
      <span className={styles.name}>{`${player.title} ($${player.bank || 0})`}</span>
      {status && <Badge size="small" appearance={status.appearance} color={status.color}>{status.text}</Badge>}
      {total !== undefined && <span className={styles.total}>{`Total ${total}`}</span>}
    </>
  );

  const info = onSelect
    ? <button type="button" className={mergeClasses(styles.info, styles.selectable)} onClick={onSelect}>{infoContent}</button>
    : <div className={styles.info}>{infoContent}</div>;

  return (
    <div className={className} style={style}>
      {info}
      {cards && cards.length > 0 && <CardStack cards={cards} hidden={false} isSelectable={false} player={player} title={player.title} variant="mini" />}
    </div>
  );
}
