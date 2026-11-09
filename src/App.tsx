// React
import React from 'react';

// FluentUI
import { FluentProvider, makeStyles, tokens } from '@fluentui/react-components';

// Local Resources
import './App.css';
import { AppHeader, OptionsPanel, PlayersDialog, Table } from './components';
import { GameContext, GameDispatchContext, PlayersDialogContext, ProfileContext, ProfileDispatchContext, SettingContext, SettingDispatchContext } from './context';
import { GameAction, GameStatus } from './enums';
import { collectStats, gameReducer, isBetweenHands, loadGameState, loadProfiles, loadSettings, profileReducer, rosterSignature, saveGameState, saveProfiles, saveSettings, seatsFor, settingReducer, useGameSync, useProfileSync } from './functions';
import { isDarkMode, resolveThemeMode, createAppTheme, usePrefersDark, PAGE_GUTTER } from './theme';

// The page behind the table: a striped felt drawn from the brand color, so it follows
// the accent and the light or dark mode. Fluent's tokens resolve inside the provider.
// It is a column at least as tall as the window, so the table can fill what the header
// leaves; the table sits PAGE_GUTTER from the header and from the other three edges.
const useStyles = makeStyles({
  shell: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: ['100vh', '100dvh'],
    padding: `0 ${PAGE_GUTTER} ${PAGE_GUTTER}`,
    boxSizing: 'border-box',
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground3,
    backgroundImage: `linear-gradient(63deg, ${tokens.colorBrandStroke2} 23%, transparent 23%), linear-gradient(63deg, transparent 74%, ${tokens.colorBrandStroke2} 78%), linear-gradient(63deg, transparent 34%, ${tokens.colorBrandStroke2} 38%, ${tokens.colorBrandStroke2} 58%, transparent 62%)`,
    backgroundPosition: '7px 0, 0 0, 0 0',
    backgroundSize: '16px 48px',
  },
});

// Main Component
const App = () => {
  const styles = useStyles();

  // State from context
  const [gameState, gameDispatch] = React.useReducer(gameReducer, undefined, loadGameState);
  const [settings, toggleSetting] = React.useReducer(settingReducer, undefined, loadSettings);
  const [profiles, profileDispatch] = React.useReducer(profileReducer, undefined, loadProfiles);
  // The Players dialog opens from the header and from the end-of-hand controls
  const [isPlayersOpen, setPlayersOpen] = React.useState(false);
  const openPlayers = React.useCallback(() => setPlayersOpen(true), []);

  // Fluent theme from the appearance settings; 'system' follows the OS preference
  const prefersDark = usePrefersDark();
  const themeMode = resolveThemeMode(settings.themeMode, prefersDark);
  const theme = createAppTheme(themeMode, settings.accent);

  // Persist game, settings and player profiles so a reload resumes where the player left off
  React.useEffect(() => saveSettings(settings), [settings]);
  React.useEffect(() => saveGameState(gameState), [gameState]);
  React.useEffect(() => saveProfiles(profiles), [profiles]);
  // and keep the profiles and the game in step with the server, when there is one
  useProfileSync(profiles, profileDispatch);
  useGameSync(gameState, gameDispatch);

  // Evaluate game whenever the status changes, or a new round reaches the same
  // status (a natural can end a round in the same action that starts it).
  // Start from the loaded status so a restored round that already ended is not
  // paid out a second time; settlement is also guarded by gameStatusFlag.
  const statusKey = `${gameState.round}:${gameState.gameStatus}`;
  const lastEvaluatedStatus = React.useRef(statusKey);
  React.useEffect(() => {
    if (lastEvaluatedStatus.current === statusKey) return;
    lastEvaluatedStatus.current = statusKey;
    gameDispatch({ type: GameAction.EvaluateGame, gameStatus: gameState.gameStatus });
  }, [statusKey, gameState.gameStatus])

  // When a round settles, carry each player's updated stats back to their profile.
  // Only the transition counts, so a restored settled round is not added twice.
  const wasSettled = React.useRef(gameState.gameStatusFlag);
  React.useEffect(() => {
    const wasSettledBefore = wasSettled.current;
    wasSettled.current = gameState.gameStatusFlag;
    if (!wasSettledBefore && gameState.gameStatusFlag) {
      profileDispatch({ type: 'syncStats', stats: collectStats(gameState.playerStore.all) });
    }
  }, [gameState]);

  // A roster change between hands seats the new players at once. During a hand it is
  // ignored here, and the Next hand button applies it when the hand is over.
  const rosterKey = rosterSignature(seatsFor(profiles));
  const lastRosterKey = React.useRef(rosterKey);
  const betweenHands = isBetweenHands(gameState);
  React.useEffect(() => {
    if (lastRosterKey.current === rosterKey) return;
    lastRosterKey.current = rosterKey;
    if (betweenHands) gameDispatch({ type: GameAction.SetRoster, players: seatsFor(profiles) });
  }, [rosterKey, betweenHands, profiles]);

  return (
    <FluentProvider theme={theme} style={{ colorScheme: isDarkMode(themeMode) ? 'dark' : 'light' }}>
      {/* The shell is a child, not the provider itself: Fluent copies the provider's
          classes onto its portal layer, which would paint the felt over every popup */}
      <div className={styles.shell} data-theme-mode={themeMode} data-accent={settings.accent}>
      <SettingContext.Provider value={settings}>
        <SettingDispatchContext.Provider value={toggleSetting}>
          <ProfileContext.Provider value={profiles}>
            <ProfileDispatchContext.Provider value={profileDispatch}>
              <GameContext.Provider value={gameState}>
                <GameDispatchContext.Provider value={gameDispatch}>

                  <PlayersDialogContext.Provider value={openPlayers}>
                  <AppHeader />

                  <OptionsPanel />
                  <div className="app-content">
                    <Table />
                  </div>
                  <PlayersDialog open={isPlayersOpen} onOpenChange={setPlayersOpen} />
                  </PlayersDialogContext.Provider>

                </GameDispatchContext.Provider>
              </GameContext.Provider>
            </ProfileDispatchContext.Provider>
          </ProfileContext.Provider>
        </SettingDispatchContext.Provider>
      </SettingContext.Provider>
      </div>
    </FluentProvider>
  );
}

export default App;
