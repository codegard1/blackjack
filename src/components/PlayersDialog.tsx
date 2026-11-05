// React
import React from "react";

import {
  Button,
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
  tokens,
} from '@fluentui/react-components';

// Local Resources
import { useGameContext, useProfileContext } from '../context';
import { GameStatus } from '../enums';
import { DEALER_PROFILE_ID, humanProfiles, summarizeStats, validateProfileName } from '../functions/profiles';
import { IPlayersDialogProps } from '../interfaces/IPlayersDialogProps';

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
});

const STAT_HEADINGS = ['Player', 'Rounds', 'Won', 'Lost', 'Pushed', 'Win rate', 'Blackjacks', 'Busts', 'Pots won'];

/**
 * Choose the player who plays the next game, add player names, and see each player's statistics
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

  const humans = humanProfiles(profiles.profiles);
  const dealer = profiles.profiles.find((profile) => profile.id === DEALER_PROFILE_ID);
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
                    {[...humans, ...(dealer ? [dealer] : [])].map((profile) => {
                      const summary = summarizeStats(profile.stats);
                      return (
                        <TableRow key={profile.id}>
                          <TableCell>
                            <Text weight="semibold">{profile.name}</Text>
                            {profile.id === profiles.selectedId && <Text size={200}>{' (playing)'}</Text>}
                          </TableCell>
                          <TableCell className={styles.numeric}>{summary.rounds}</TableCell>
                          <TableCell className={styles.numeric}>{summary.won}</TableCell>
                          <TableCell className={styles.numeric}>{summary.lost}</TableCell>
                          <TableCell className={styles.numeric}>{summary.pushed}</TableCell>
                          <TableCell className={styles.numeric}>{summary.winRate === undefined ? '—' : `${Math.round(summary.winRate * 100)}%`}</TableCell>
                          <TableCell className={styles.numeric}>{summary.blackjacks}</TableCell>
                          <TableCell className={styles.numeric}>{summary.busts}</TableCell>
                          <TableCell className={styles.numeric}>{`$${summary.potsWon}`}</TableCell>
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
      </DialogSurface>
    </Dialog>
  );
}
