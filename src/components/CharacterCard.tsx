import React from 'react';

import {
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Text,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';

import { Character, CharacterStatKey, NAME_CREDIT, STAT_LABELS } from '../characters';
import { historyRounds, withHistory } from '../functions/history';
import { summarizeStats } from '../functions/profiles';
import { PlayerStats } from '../types';
import { CharacterPortrait } from './CharacterPortrait';

const STAT_MAX = 10;

/** whole numbers with thousands separators, e.g. 6,390 */
const count = (value: number): string => value.toLocaleString('en-US');

const useStyles = makeStyles({
  surface: {
    maxWidth: 'min(560px, 94vw)',
    width: 'min(560px, 94vw)',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalL,
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusXLarge,
    '@media (max-width: 480px)': {
      flexDirection: 'column',
      textAlign: 'center',
    },
  },
  identity: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: tokens.spacingVerticalXS,
    minWidth: 0,
    '@media (max-width: 480px)': { alignItems: 'center' },
  },
  tagline: {
    fontStyle: 'italic',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'minmax(84px, auto) 1fr',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalXXS,
    margin: 0,
  },
  statHelp: {
    gridColumn: '2',
    marginBottom: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForeground3,
  },
  // ten square segments, in the spirit of the pixel portraits
  meter: {
    display: 'grid',
    gridTemplateColumns: `repeat(${STAT_MAX}, 1fr)`,
    gap: '3px',
    maxWidth: '240px',
  },
  segment: {
    height: '12px',
    borderRadius: '2px',
    backgroundColor: tokens.colorNeutralBackground5,
  },
  filled: {
    backgroundColor: tokens.colorBrandBackground,
  },
  record: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalL}`,
    margin: 0,
    fontVariantNumeric: 'tabular-nums',
  },
  credit: {
    color: tokens.colorNeutralForeground3,
  },
});

const StatMeter: React.FC<{ idPrefix: string; stat: CharacterStatKey; value: number }> = ({ idPrefix, stat, value }) => {
  const styles = useStyles();
  const { label, description } = STAT_LABELS[stat];
  const labelId = `${idPrefix}-stat-${stat}`;
  return (
    <>
      <Text id={labelId} weight="semibold">{label}</Text>
      <div
        role="meter"
        aria-labelledby={labelId}
        aria-valuemin={1}
        aria-valuemax={STAT_MAX}
        aria-valuenow={value}
        aria-valuetext={`${value} of ${STAT_MAX}`}
        className={styles.meter}
      >
        {Array.from({ length: STAT_MAX }, (_, index) => (
          <span key={index} className={mergeClasses(styles.segment, index < value && styles.filled)} />
        ))}
      </div>
      <Text size={200} className={styles.statHelp}>{description}</Text>
    </>
  );
};

interface ICharacterCardProps {
  character: Character;
  /** lifetime stats from the character's profile, or the live seat */
  stats?: PlayerStats;
}

/**
 * A character's card: portrait, nickname, type, tagline, backstory, how they play, and their record
 */
export const CharacterCard: React.FC<ICharacterCardProps> = ({ character, stats }) => {
  const styles = useStyles();
  // the record includes the character's simulated history from before this table
  const summary = stats ? summarizeStats(withHistory(character.id, stats)) : undefined;
  const earlierRounds = historyRounds(character.id);

  return (
    <article className={styles.card} aria-label={`${character.name}, ${character.nickname}`}>
      <header className={styles.header} style={{ backgroundColor: `${character.accent}33` }}>
        <CharacterPortrait id={character.id} name={character.name} size="lg" />
        <div className={styles.identity}>
          <Text as="h3" size={600} weight="semibold">{character.name}</Text>
          <Text size={400}>{character.nickname}</Text>
          <Badge appearance="tint" color="brand">{character.archetype}</Badge>
          <Text className={styles.tagline}>&ldquo;{character.tagline}&rdquo;</Text>
        </div>
      </header>

      <section className={styles.section} aria-label="Backstory">
        {character.backstory.map((paragraph) => <Text as="p" key={paragraph.slice(0, 24)}>{paragraph}</Text>)}
      </section>

      <section className={styles.section} aria-labelledby={`${character.id}-play`}>
        <Text as="h4" id={`${character.id}-play`} weight="semibold">How {character.name} plays</Text>
        {character.stats ? (
          <div className={styles.stats}>
            {(Object.keys(STAT_LABELS) as CharacterStatKey[]).map((stat) => (
              <StatMeter key={stat} idPrefix={character.id} stat={stat} value={character.stats![stat]} />
            ))}
          </div>
        ) : (
          <Text>Plays by house rules: draws below 17 and stands on 17 or more.</Text>
        )}
      </section>

      {summary && (
        <section className={styles.section} aria-labelledby={`${character.id}-record`}>
          <Text as="h4" id={`${character.id}-record`} weight="semibold">Record</Text>
          <dl className={styles.record}>
            {([
              ['Rounds', count(summary.rounds)],
              ['Won', count(summary.won)],
              ['Lost', count(summary.lost)],
              ['Pushed', count(summary.pushed)],
              ['Win rate', summary.winRate === undefined ? '—' : `${Math.round(summary.winRate * 100)}%`],
              ['Blackjacks', count(summary.blackjacks)],
              ['Winnings', `$${count(summary.winnings)}`],
            ] as const).map(([label, value]) => (
              <div key={label}><dt style={{ display: 'inline' }}>{label}: </dt><dd style={{ display: 'inline', margin: 0 }}>{value}</dd></div>
            ))}
          </dl>
          {earlierRounds > 0 && (
            <Text size={200} className={styles.credit}>{`Includes ${count(earlierRounds)} rounds played before you joined the table.`}</Text>
          )}
        </section>
      )}

      <Text size={200} className={styles.credit}>{NAME_CREDIT}</Text>
    </article>
  );
};

interface ICharacterDialogProps {
  character: Character | undefined;
  stats?: PlayerStats;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** A character's card in a dialog */
export const CharacterDialog: React.FC<ICharacterDialogProps> = ({ character, stats, open, onOpenChange }) => {
  const styles = useStyles();
  if (!character) return null;
  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>{`${character.name}, ${character.nickname}`}</DialogTitle>
          <DialogContent>
            <CharacterCard character={character} stats={stats} />
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
