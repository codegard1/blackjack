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
  Select,
  Switch,
  Tab,
  TabList,
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
import { BOTS, CHARACTERS, MAX_OPPONENTS, getCharacter, isBotId } from '../characters';
import { useGameContext, useProfileContext } from '../context';
import { GameAction, GameStatus } from '../enums';
import { formatCount, formatNet } from '../functions/format';
import { characterRecord, useCommunityStats } from '../functions/community';
import { DEALER_PROFILE_ID, botAccountsFor, humanProfiles, summarizeStats, validateProfileName } from '../functions/profiles';
import { WORK_TASKS, chooseTask, describeCharacterWork, returnThreshold } from '../functions/work';
import { IPlayersDialogProps } from '../interfaces/IPlayersDialogProps';
import { isWorkTaskId } from '../types';
import { BalanceChart } from './BalanceChart';
import { CharacterDialog } from './CharacterCard';
import { CharacterPortrait } from './CharacterPortrait';
import { GoogleAccountSection } from './GoogleAccountSection';

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
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    minWidth: 0,
    padding: tokens.spacingVerticalS,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
  },
  rosterItemSeated: {
    border: `1px solid ${tokens.colorBrandStroke1}`,
    backgroundColor: tokens.colorBrandBackground2,
  },
  rosterHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minWidth: 0,
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
  rosterWork: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    minWidth: 0,
    paddingInlineStart: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalXXS,
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  rosterStatus: {
    color: tokens.colorNeutralForeground2,
  },
  rosterControls: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minWidth: 0,
  },
  taskSelect: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },
  taskSelectInput: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

const count = formatCount;

const STAT_HEADINGS = ['Player', 'Hands', 'Won', 'Lost', 'Pushed', 'Win rate', 'Blackjacks', 'Busts', 'Net'];

/**
 * Choose who plays the next game and which computer players join, add player names, and see everyone's statistics
 */
export const PlayersDialog: React.FC<IPlayersDialogProps> = (props) => {

  // Props
  const { open, onOpenChange } = props;
  const styles = useStyles();
  const community = useCommunityStats();

  // Context
  const { profiles, profileDispatch } = useProfileContext();
  const { gameState, gameDispatch } = useGameContext();

  // State
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState<string>();

  const [characterId, setCharacterId] = React.useState<string>();
  const [tab, setTab] = React.useState<'roster' | 'session'>('roster');

  const humans = humanProfiles(profiles.profiles);
  // the computer characters in seating order, then the dealer
  const characters = CHARACTERS.flatMap((character) => profiles.profiles.filter((profile) => profile.id === character.id));
  // changes made while a hand is being played wait until it ends
  const isHandInPlay = gameState.gameStatus === GameStatus.InProgress || gameState.gameStatus === GameStatus.NextTurn;
  const profileBotAccounts = botAccountsFor(profiles);
  const activeBotAccounts = gameState.gameStatus === GameStatus.Init ? profileBotAccounts : gameState.botAccounts;

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

            <TabList selectedValue={tab} onTabSelect={(_, data) => setTab(data.value as 'roster' | 'session')}>
              <Tab value="roster">Roster &amp; stats</Tab>
              <Tab value="session">Current session</Tab>
            </TabList>

            {tab === 'session' ? (() => {
              const sessionSeats = Object.entries(gameState.session?.seats ?? {});
              const humanEntry = sessionSeats.find(([key]) => !isBotId(key));
              const humanSeat = humanEntry?.[1];
              if (sessionSeats.length === 0) {
                return <Text size={200}>Start a game to track stats for the current sitting.</Text>;
              }
              return (
                <section aria-label="Current session summary" className={styles.content}>
                  {humanSeat && (
                    <div>
                      <Text as="h3" weight="semibold" block>{`${humanSeat.title}'s bankroll`}</Text>
                      <BalanceChart
                        values={humanSeat.balanceHistory}
                        label={humanSeat.title}
                        referenceValue={humanSeat.balanceHistory[0]}
                        referenceLabel="Start"
                      />
                    </div>
                  )}
                  <div className={styles.tableScroll}>
                    <Table aria-label="Session statistics" size="small" className={styles.table}>
                      <TableHeader>
                        <TableRow>
                          <TableHeaderCell>Player</TableHeaderCell>
                          <TableHeaderCell className={styles.numeric}>Hands</TableHeaderCell>
                          <TableHeaderCell className={styles.numeric}>Won</TableHeaderCell>
                          <TableHeaderCell className={styles.numeric}>Lost</TableHeaderCell>
                          <TableHeaderCell className={styles.numeric}>Push</TableHeaderCell>
                          <TableHeaderCell className={styles.numeric}>Blackjacks</TableHeaderCell>
                          <TableHeaderCell className={styles.numeric}>Busts</TableHeaderCell>
                          <TableHeaderCell className={styles.numeric}>Net</TableHeaderCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessionSeats.map(([key, seat]) => (
                          <TableRow key={key}>
                            <TableCell>{seat.title}</TableCell>
                            <TableCell className={styles.numeric}>{formatCount(seat.hands)}</TableCell>
                            <TableCell className={styles.numeric}>{formatCount(seat.wins)}</TableCell>
                            <TableCell className={styles.numeric}>{formatCount(seat.losses)}</TableCell>
                            <TableCell className={styles.numeric}>{formatCount(seat.pushes)}</TableCell>
                            <TableCell className={styles.numeric}>{formatCount(seat.blackjacks)}</TableCell>
                            <TableCell className={styles.numeric}>{formatCount(seat.busts)}</TableCell>
                            <TableCell className={styles.numeric}>{formatNet(seat.net)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              );
            })() : (
              <>
            <GoogleAccountSection />

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
              {isHandInPlay && <Text size={200}>The selected player plays from the next hand.</Text>}
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
                {`Choose up to ${MAX_OPPONENTS} to sit at the table with you.${isHandInPlay ? ' Changes apply from the next hand.' : ''}`}
              </Text>
              <ul className={styles.roster}>
                {BOTS.map((bot) => {
                  const isSeated = profiles.opponentIds.includes(bot.id);
                  const account = activeBotAccounts[bot.id] ?? profileBotAccounts[bot.id];
                  const threshold = returnThreshold(bot.stats, gameState.minimumBet);
                  const ownPick = chooseTask(bot.stats, account.bank, threshold);
                  const selectedTask = account.taskOverride ?? account.work?.taskId ?? ownPick;
                  const statusSummary = describeCharacterWork(bot.id, account, gameState.minimumBet, isSeated);

                  return (
                    <li key={bot.id} className={mergeClasses(styles.rosterItem, isSeated && styles.rosterItemSeated)}>
                      <div className={styles.rosterHeader}>
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
                      </div>
                      <div className={styles.rosterWork}>
                        <Text size={200} className={styles.rosterStatus}>{statusSummary}</Text>
                        <div className={styles.rosterControls}>
                          <Select
                            size="small"
                            className={styles.taskSelect}
                            select={{ className: styles.taskSelectInput }}
                            aria-label={`${bot.name}'s work task`}
                            value={selectedTask}
                            onChange={(_, data) => {
                              if (!isWorkTaskId(data.value)) return;
                              const nextOverride = data.value === ownPick ? null : data.value;
                              profileDispatch({ type: 'configureWork', id: bot.id, taskOverride: nextOverride });
                              if (gameState.gameStatus !== GameStatus.Init) {
                                gameDispatch({ type: GameAction.ConfigureWork, playerKey: bot.id, taskOverride: nextOverride });
                              }
                            }}
                          >
                            {WORK_TASKS.map((task) => (
                              <option key={task.id} value={task.id}>
                                {`${task.label} ($${task.pay}, ${task.days === 1 ? '1 day' : `${task.days} days`})${task.id === ownPick ? " (character's pick)" : ''}`}
                              </option>
                            ))}
                          </Select>
                          <Switch
                            label="Let back when ready"
                            checked={!!account.allowReturn}
                            onChange={(_, data) => {
                              profileDispatch({ type: 'configureWork', id: bot.id, allowReturn: data.checked });
                              if (gameState.gameStatus !== GameStatus.Init) {
                                gameDispatch({ type: GameAction.ConfigureWork, playerKey: bot.id, allowReturn: data.checked });
                              }
                            }}
                          />
                        </div>
                      </div>
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
                      // characters' records include their simulated history and other tables' play; humans' are their own
                      const summary = summarizeStats(characterRecord(profile.id, profile.stats, community));
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
              </>
            )}

          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogActions>
        </DialogBody>
        {/* nested inside the surface: a Dialog's own children are read as its trigger and surface */}
        <CharacterDialog
          character={getCharacter(characterId)}
          stats={profiles.profiles.find((profile) => profile.id === characterId)?.stats}
          account={characterId ? (activeBotAccounts[characterId] ?? profileBotAccounts[characterId]) : undefined}
          minimumBet={gameState.minimumBet}
          isSeated={characterId ? profiles.opponentIds.includes(characterId) : false}
          open={!!characterId}
          onOpenChange={(isOpen) => { if (!isOpen) setCharacterId(undefined); }}
        />
      </DialogSurface>
    </Dialog>
  );
}

