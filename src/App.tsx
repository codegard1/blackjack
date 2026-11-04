// React
import React from 'react';

// FluentUI
import { FluentProvider, MessageBar, MessageBarBody, webLightTheme } from '@fluentui/react-components';

// Local Resources
import './App.css';
import { ActivityLog, OptionsPanel, SplashScreen, Table, DebugWindow } from './components';
import { GameContext, GameDispatchContext, SettingContext, SettingDispatchContext } from './context';
import { GameAction, GameStatus } from './enums';
import { gameReducer, loadGameState, loadSettings, saveGameState, saveSettings, settingReducer } from './functions';

// Main Component
const App = () => {

  // State from context
  const [gameState, gameDispatch] = React.useReducer(gameReducer, undefined, loadGameState);
  const [settings, toggleSetting] = React.useReducer(settingReducer, gameState.playerStore.length > 0, loadSettings);
  const human = gameState.playerStore.all.find((player) => !player.isNPC);
  const dealer = gameState.playerStore.all.find((player) => player.isNPC);
  const roundWinner = gameState.gameStatus === GameStatus.HumanWins ? human
    : gameState.gameStatus === GameStatus.DealerWins ? dealer : undefined;
  const roundLoser = gameState.gameStatus === GameStatus.HumanWins ? dealer : human;
  const resultText = roundWinner
    ? roundLoser?.isBusted
      ? `${roundLoser.title} busted. ${roundWinner.title} wins the round.`
      : `${roundWinner.title} wins the round${roundWinner.isBlackjack ? ' with blackjack' : ''}.`
    : gameState.gameStatus === GameStatus.GameOver ? 'Game over.' : '';

  // Persist game and settings so a reload resumes where the player left off
  React.useEffect(() => saveSettings(settings), [settings]);
  React.useEffect(() => saveGameState(gameState), [gameState]);

  // Evaluate game whenever the status changes. Start from the loaded status
  // so a restored round that already ended is not paid out a second time.
  const lastEvaluatedStatus = React.useRef(gameState.gameStatus);
  React.useEffect(() => {
    if (lastEvaluatedStatus.current === gameState.gameStatus) return;
    lastEvaluatedStatus.current = gameState.gameStatus;
    gameDispatch({ type: GameAction.EvaluateGame, gameStatus: gameState.gameStatus });
  }, [gameState.gameStatus])

  return (
    <FluentProvider theme={webLightTheme}>
      <SettingContext.Provider value={settings}>
        <SettingDispatchContext.Provider value={toggleSetting}>
          <GameContext.Provider value={gameState}>
            <GameDispatchContext.Provider value={gameDispatch}>

              {resultText !== '' ? (
                <MessageBar intent={gameState.gameStatus === GameStatus.HumanWins ? 'success' : 'warning'}>
                  <MessageBarBody>{resultText}</MessageBarBody>
                </MessageBar>
              ) : settings.isMessageBarVisible && gameState.messageBarDefinition.text !== '' && (
                <MessageBar intent={gameState.messageBarDefinition.type}>
                  <MessageBarBody>{gameState.messageBarDefinition.text}</MessageBarBody>
                </MessageBar>
              )}

              <SplashScreen />
              <OptionsPanel />
              <div className="app-content">
                <Table />
                <ActivityLog />
                <DebugWindow />
              </div>

            </GameDispatchContext.Provider>
          </GameContext.Provider>
        </SettingDispatchContext.Provider>
      </SettingContext.Provider>
    </FluentProvider>
  );
}

export default App;
