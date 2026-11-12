// React
import React from 'react';

import { Badge, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

// Local Resources
import { CardStack } from '.';
import { getCharacter } from '../characters';
import { CharacterPortrait } from './CharacterPortrait';
import { ISeatChipProps } from '../interfaces';
import { AnnouncementTone } from '../types';

const floatKeyframes = {
  '0%': { transform: 'translateY(0) rotate(-1.5deg)' },
  '50%': { transform: 'translateY(-8px) rotate(1.5deg)' },
  '100%': { transform: 'translateY(0) rotate(-1.5deg)' },
};

// A seat in focus swells, brightens and rings in its result's color, twice over, then settles
const focusKeyframes = {
  '0%': { transform: 'scale(1)', filter: 'brightness(1)', boxShadow: `${tokens.shadow4}, 0 0 0 0 var(--seat-chip-focus)` },
  '50%': { transform: 'scale(1.04)', filter: 'brightness(1.18)', boxShadow: `${tokens.shadow16}, 0 0 0 3px var(--seat-chip-focus)` },
  '100%': { transform: 'scale(1)', filter: 'brightness(1)', boxShadow: `${tokens.shadow4}, 0 0 0 0 var(--seat-chip-focus)` },
};

/** the ring around a seat in focus, by how its result went */
const focusColors: Record<AnnouncementTone, string> = {
  success: tokens.colorPaletteGreenBorder2,
  danger: tokens.colorPaletteRedBorder2,
  brand: tokens.colorBrandStroke1,
  neutral: tokens.colorNeutralForeground3,
  info: tokens.colorNeutralForeground3,
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
  focused: {
    animationName: focusKeyframes,
    animationDuration: '600ms',
    animationIterationCount: 2,
    animationTimingFunction: tokens.curveEasyEase,
    // with reduced motion the chip does not swell; it holds its brightness and ring while in focus
    '@media (prefers-reduced-motion: reduce)': {
      animationName: 'none',
      filter: 'brightness(1.12)',
      boxShadow: `${tokens.shadow8}, 0 0 0 3px var(--seat-chip-focus)`,
    },
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
  // portrait beside the name, tagline, status and total
  identity: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalS,
    minWidth: 0,
  },
  text: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: tokens.spacingVerticalXXS,
    minWidth: 0,
  },
  tagline: {
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontStyle: 'italic',
  },
});

/**
 * A collapsed seat: the player's name and bank, an optional status and hand total,
 * and the player's cards when given
 */
export const SeatChip: React.FC<ISeatChipProps> = (props) => {
  const { player, status, total, cards, floating, index, focus, onSelect } = props;
  const styles = useStyles();

  const className = mergeClasses(
    'seat-chip',
    styles.chip,
    onSelect && styles.interactive,
    floating && styles.floating,
    focus && styles.focused,
  );
  const style = {
    ...(floating ? { animationDelay: `${(index ?? 0) * 450}ms` } : undefined),
    ...(focus ? { '--seat-chip-focus': focusColors[focus] } : undefined),
  } as React.CSSProperties;

  const character = getCharacter(player.key);
  const infoContent = (
    <span className={styles.identity}>
      <CharacterPortrait id={player.key} name={player.title} size="md" decorative />
      <span className={styles.text}>
        <span className={styles.name}>{`${player.title} ($${player.bank || 0})`}</span>
        {character && <span className={mergeClasses('seat-chip-tagline', styles.tagline)}>{character.tagline}</span>}
        {status && <Badge size="small" appearance={status.appearance} color={status.color}>{status.text}</Badge>}
        {total !== undefined && <span className={styles.total}>{`Total ${total}`}</span>}
      </span>
    </span>
  );

  const info = onSelect
    ? <button type="button" className={mergeClasses(styles.info, styles.selectable)} onClick={onSelect}>{infoContent}</button>
    : <div className={styles.info}>{infoContent}</div>;

  return (
    <div className={className} style={style} data-focus={focus}>
      {info}
      {cards && cards.length > 0 && <CardStack cards={cards} hidden={false} isSelectable={false} player={player} title={player.title} variant="mini" />}
    </div>
  );
}
