// React
import React from 'react';

// FluentUI
import { FluentProvider, MessageBar, MessageBarBody, webLightTheme } from '@fluentui/react-components';

// Local Resources
import './App.css';
import { ActivityLog, OptionsPanel, SplashScreen, Table, DebugWindow } from './components';
import { GameContext, GameDispatchContext, SettingContext, SettingDispatchContext, createGameState, settingDefaults } from './context';
import { GameAction, GameStatus, StoreName } from './enums';
import { gameReducer, settingReducer } from './functions';
import { SettingsState } from './types';

// Main Component
const App = () => {

  // State from context
  const [settings, toggleSetting] = React.useReducer(settingReducer, settingDefaults);
  const [gameState, gameDispatch] = React.useReducer(gameReducer, undefined, createGameState);
  const deckState = gameState.deck.state;
  const playerState = gameState.playerStore.state;
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

  // Initialization effect 
  React.useEffect(() => {
    // console.log('Initialization effect');

    const _settingStore = localStorage.getItem(StoreName.SETTINGSTORE);
    if (null !== _settingStore) {
      const _ss: SettingsState = JSON.parse(_settingStore);
      for (let key in _ss) {
        // toggleSetting({ key, value: _ss[key] });
      }
    }

    const _deckStore = localStorage.getItem(StoreName.DECKSTORE);
    if (null !== _deckStore) {
      // gameDispatch({ type: GameAction.SetDeckState, deckState: JSON.parse(_deckStore) })
    }

    const _playerStore = localStorage.getItem(StoreName.PLAYERSTORE);
    if (null !== _playerStore) {
      // gameDispatch({ type: GameAction.SetPlayerState, playerState: JSON.parse(_playerStore) })
    } else {
      // toggleSetting({ key: 'isSplashScreenVisible', value: true });
    }
  }, []);

  // Save settings state to localStorage
  React.useEffect(() => {
    if (!!settings)
      localStorage.setItem(StoreName.SETTINGSTORE, JSON.stringify(settings));
  }, [settings]);

  // Save deck state to localStorage
  React.useEffect(() => {
    if (!!deckState)
      localStorage.setItem(StoreName.DECKSTORE, JSON.stringify(deckState));
  }, [deckState]);

  // Save player state to localStorage
  React.useEffect(() => {
    if (!!playerState)
      localStorage.setItem(StoreName.PLAYERSTORE, JSON.stringify(playerState));
  }, [playerState]);

  // Evaluate game whenever state changes
  React.useEffect(() => {
    // console.log('Evaluate Game effect');
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
