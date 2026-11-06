// React
import React from "react";

import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Radio,
  RadioGroup,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';

// Local Resources
import { BOTS, CHARACTERS, MAX_OPPONENTS, getCharacter } from '../characters';
import { useGameContext, useProfileContext } from '../context';
import { GameStatus } from '../enums';
import { formatCount, formatNet } from '../functions/format';
import { withHistory } from '../functions/history';
import { DEALER_PROFILE_ID, humanProfiles, summarizeStats, validateProfileName } from '../functions/profiles';
import { IPlayersDialogProps } from '../interfaces/IPlayersDialogProps';
import { CharacterDialog } from './CharacterCard';
import { CharacterPortrait } from './CharacterPortrait';

const useStyles = makeStyles({
  surface: {
    maxWidth: 'min(880px, 94vw)',
    width: 'min(880px, 94vw)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  form: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalS,
  },
  tableScroll: {
    overflowX: 'auto',
  },
  table: {
    minWidth: '680px',
  },
  numeric: {
    fontVariantNumeric: 'tabular-nums',
  },
  roster: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))',
    gap: tokens.spacingVerticalS,
    margin: `${tokens.spacingVerticalS} 0 0`,
    padding: 0,
    listStyle: 'none',
  },
  rosterItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: tokens.spacingVerticalS,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
  },
  rosterItemSeated: {
    border: `1px solid ${tokens.colorBrandStroke1}`,
    backgroundColor: tokens.colorBrandBackground2,
  },
  rosterText: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minWidth: 0,
  },
  rosterTagline: {
    paddingInlineStart: tokens.spacingHorizontalS,
    fontStyle: 'italic',
    color: tokens.colorNeutralForeground3,
  },
});

const count = formatCount;

const STAT_HEADINGS = ['Player', 'Rounds', 'Won', 'Lost', 'Pushed', 'Win rate', 'Blackjacks', 'Busts', 'Net'];

/**
 * Choose who plays the next game and which computer players join, add player names, and see everyone's statistics
 */
export const PlayersDialog: React.FC<IPlayersDialogProps> = (props) => {

  // Props
  const { open, onOpenChange } = props;
  const styles = useStyles();

  // Context
  const { profiles, profileDispatch } = useProfileContext();
  const { gameState } = useGameContext();

  // State
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState<string>();

  const [characterId, setCharacterId] = React.useState<string>();

  const humans = humanProfiles(profiles.profiles);
  // the computer characters in seating order, then the dealer
  const characters = CHARACTERS.flatMap((character) => profiles.profiles.filter((profile) => profile.id === character.id));
  const isGameInProgress = gameState.gameStatus !== GameStatus.Init;

  const createPlayer = (event: React.FormEvent) => {
    event.preventDefault();
    const message = validateProfileName(name, profiles.profiles);
    if (message) {
      setError(message);
      return;
    }
    profileDispatch({ type: 'create', name });
    setName('');
    setError(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>Players</DialogTitle>
          <DialogContent className={styles.content}>

            <section aria-labelledby="players-select-heading">
              <Text as="h3" id="players-select-heading" weight="semibold">Playing as</Text>
              <RadioGroup
                aria-labelledby="players-select-heading"
                value={profiles.selectedId}
                onChange={(_, data) => profileDispatch({ type: 'select', id: data.value })}
              >
                {humans.map((profile) => (
                  <Radio key={profile.id} value={profile.id} label={profile.name} />
                ))}
              </RadioGroup>
              {isGameInProgress && <Text size={200}>The selected player plays the next game.</Text>}
            </section>

            <form className={styles.form} onSubmit={createPlayer} noValidate>
              <Field
                label="New player name"
                validationMessage={error}
                validationState={error ? 'error' : undefined}
              >
                <Input
                  value={name}
                  placeholder="Name"
                  onChange={(_, data) => {
                    setName(data.value);
                    setError(undefined);
                  }}
                />
              </Field>
              <Button type="submit" appearance="secondary">Add player</Button>
            </form>

            <section aria-labelledby="players-opponents-heading">
              <Text as="h3" id="players-opponents-heading" weight="semibold" block>Computer players</Text>
              <Text as="p" size={200} block>
                {`Choose up to ${MAX_OPPONENTS} to sit at the table with you.${isGameInProgress ? ' Changes apply to the next game.' : ''}`}
              </Text>
              <ul className={styles.roster}>
                {BOTS.map((bot) => {
                  const isSeated = profiles.opponentIds.includes(bot.id);
                  return (
                    <li key={bot.id} className={mergeClasses(styles.rosterItem, isSeated && styles.rosterItemSeated)}>
                      <CharacterPortrait id={bot.id} name={bot.name} size="md" decorative />
                      <div className={styles.rosterText}>
                        <Checkbox
                          checked={isSeated}
                          disabled={!isSeated && profiles.opponentIds.length >= MAX_OPPONENTS}
                          label={`${bot.name}, ${bot.nickname}`}
                          onChange={() => profileDispatch({ type: 'toggleOpponent', id: bot.id })}
                        />
                        <Text size={200} className={styles.rosterTagline}>&ldquo;{bot.tagline}&rdquo;</Text>
                      </div>
                      <Button appearance="subtle" size="small" onClick={() => setCharacterId(bot.id)}>{`About ${bot.name}`}</Button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section aria-labelledby="players-stats-heading">
              <Text as="h3" id="players-stats-heading" weight="semibold">Statistics</Text>
              <div className={styles.tableScroll}>
                <Table aria-label="Player statistics" size="small" className={styles.table}>
                  <TableHeader>
                    <TableRow>
                      {STAT_HEADINGS.map((heading) => <TableHeaderCell key={heading}>{heading}</TableHeaderCell>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...humans, ...characters].map((profile) => {
                      // characters' records include their simulated history; humans' are their own
                      const summary = summarizeStats(withHistory(profile.id, profile.stats));
                      return (
                        <TableRow key={profile.id}>
                          <TableCell>
                            <Text weight="semibold">{profile.name}</Text>
                            {profile.id === profiles.selectedId && <Text size={200}>{' (playing)'}</Text>}
                            {profile.id === DEALER_PROFILE_ID && <Text size={200}>{' (dealer)'}</Text>}
                          </TableCell>
                          <TableCell className={styles.numeric}>{count(summary.rounds)}</TableCell>
                          <TableCell className={styles.numeric}>{count(summary.won)}</TableCell>
                          <TableCell className={styles.numeric}>{count(summary.lost)}</TableCell>
                          <TableCell className={styles.numeric}>{count(summary.pushed)}</TableCell>
                          <TableCell className={styles.numeric}>{summary.winRate === undefined ? '—' : `${Math.round(summary.winRate * 100)}%`}</TableCell>
                          <TableCell className={styles.numeric}>{count(summary.blackjacks)}</TableCell>
                          <TableCell className={styles.numeric}>{count(summary.busts)}</TableCell>
                          <TableCell className={styles.numeric}>{formatNet(summary.net)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </section>

          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogActions>
        </DialogBody>
        {/* nested inside the surface: a Dialog's own children are read as its trigger and surface */}
        <CharacterDialog
          character={getCharacter(characterId)}
          stats={profiles.profiles.find((profile) => profile.id === characterId)?.stats}
          open={!!characterId}
          onOpenChange={(isOpen) => { if (!isOpen) setCharacterId(undefined); }}
        />
      </DialogSurface>
    </Dialog>
  );
}
