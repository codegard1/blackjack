// React
import React from 'react';

// FluentUI
import { FluentProvider, MessageBar, MessageBarBody, webLightTheme } from '@fluentui/react-components';

// Local Resources
import './App.css';
import { ActivityLog, AppHeader, OptionsPanel, Table, DebugWindow } from './components';
import { GameContext, GameDispatchContext, ProfileContext, ProfileDispatchContext, SettingContext, SettingDispatchContext } from './context';
import { GameAction, GameStatus } from './enums';
import { collectStats, gameReducer, loadGameState, loadProfiles, loadSettings, profileReducer, saveGameState, saveProfiles, saveSettings, settingReducer } from './functions';

// Main Component
const App = () => {

  // State from context
  const [gameState, gameDispatch] = React.useReducer(gameReducer, undefined, loadGameState);
  const [settings, toggleSetting] = React.useReducer(settingReducer, undefined, loadSettings);
  const [profiles, profileDispatch] = React.useReducer(profileReducer, undefined, loadProfiles);
  const human = gameState.playerStore.all.find((player) => !player.isNPC);
  const dealer = gameState.playerStore.all.find((player) => player.isNPC);
  const roundWinner = gameState.gameStatus === GameStatus.HumanWins ? human
    : gameState.gameStatus === GameStatus.DealerWins ? dealer : undefined;
  const roundLoser = gameState.gameStatus === GameStatus.HumanWins ? dealer : human;
  const resultText = roundWinner
    ? roundLoser?.isBusted
      ? `${roundLoser.title} busted. ${roundWinner.title} wins the round.`
      : `${roundWinner.title} wins the round${roundWinner.isBlackjack ? ' with blackjack' : ''}.`
    : gameState.gameStatus === GameStatus.Push ? 'Push. Stakes are returned.'
    : gameState.gameStatus === GameStatus.GameOver ? 'Game over.' : '';

  // Persist game, settings and player profiles so a reload resumes where the player left off
  React.useEffect(() => saveSettings(settings), [settings]);
  React.useEffect(() => saveGameState(gameState), [gameState]);
  React.useEffect(() => saveProfiles(profiles), [profiles]);

  // Evaluate game whenever the status changes. Start from the loaded status
  // so a restored round that already ended is not paid out a second time.
  const lastEvaluatedStatus = React.useRef(gameState.gameStatus);
  React.useEffect(() => {
    if (lastEvaluatedStatus.current === gameState.gameStatus) return;
    lastEvaluatedStatus.current = gameState.gameStatus;
    gameDispatch({ type: GameAction.EvaluateGame, gameStatus: gameState.gameStatus });
  }, [gameState.gameStatus])

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

  return (
    <FluentProvider theme={webLightTheme}>
      <SettingContext.Provider value={settings}>
        <SettingDispatchContext.Provider value={toggleSetting}>
          <ProfileContext.Provider value={profiles}>
            <ProfileDispatchContext.Provider value={profileDispatch}>
              <GameContext.Provider value={gameState}>
                <GameDispatchContext.Provider value={gameDispatch}>

                  <AppHeader />

                  {resultText !== '' ? (
                    <MessageBar intent={gameState.gameStatus === GameStatus.HumanWins ? 'success' : gameState.gameStatus === GameStatus.Push ? 'info' : 'warning'}>
                      <MessageBarBody>{resultText}</MessageBarBody>
                    </MessageBar>
                  ) : settings.isMessageBarVisible && gameState.messageBarDefinition.text !== '' && (
                    <MessageBar intent={gameState.messageBarDefinition.type}>
                      <MessageBarBody>{gameState.messageBarDefinition.text}</MessageBarBody>
                    </MessageBar>
                  )}

                  <OptionsPanel />
                  <div className="app-content">
                    <Table />
                    <ActivityLog />
                    <DebugWindow />
                  </div>

                </GameDispatchContext.Provider>
              </GameContext.Provider>
            </ProfileDispatchContext.Provider>
          </ProfileContext.Provider>
        </SettingDispatchContext.Provider>
      </SettingContext.Provider>
    </FluentProvider>
  );
}

export default App;
