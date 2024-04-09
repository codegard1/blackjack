// React
import React from 'react';

// FluentUI
import {
  Layer,
  Stack,
  initializeIcons
} from '@fluentui/react';

// Local Resources
import './App.css';
import { ActivityLog, OptionsPanel, SplashScreen, Table } from './components';
import { DebugWindow } from './components/DebugWindow';
import { GameContext, GameDispatchContext, SettingContext, SettingDispatchContext, gameDefaults, settingDefaults } from './context';
import { GameAction, StoreName } from './enums';
import { gameReducer, settingReducer } from './functions';
import { SettingsState } from './types';

// Necessary in order for Fluent Icons to render on the page
initializeIcons();

// Main Component
const App = () => {

  // State from context
  const [settings, toggleSetting] = React.useReducer(settingReducer, settingDefaults);
  const [gameState, gameDispatch] = React.useReducer(gameReducer, gameDefaults);
  const deckState = gameState.deck.state;
  const playerState = gameState.playerStore.state;

  // Initialization effect 
  React.useEffect(() => {
    console.log('Initialization effect');

    const _settingStore = localStorage.getItem(StoreName.SETTINGSTORE);
    if (null !== _settingStore) {
      const _ss: SettingsState = JSON.parse(_settingStore);
      for (let key in _ss) {
        toggleSetting({ key, value: _ss[key] });
      }
    }

    const _deckStore = localStorage.getItem(StoreName.DECKSTORE);
    if (null !== _deckStore) {
      gameDispatch({ type: GameAction.SetDeckState, deckState: JSON.parse(_deckStore) })
    }

    const _playerStore = localStorage.getItem(StoreName.PLAYERSTORE);
    if (null !== _playerStore) {
      gameDispatch({ type: GameAction.SetPlayerState, playerState: JSON.parse(_playerStore) })
    } else {
      toggleSetting({ key: 'isSplashScreenVisible', value: true });
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

  return (
    <SettingContext.Provider value={settings}>
      <SettingDispatchContext.Provider value={toggleSetting}>
        <GameContext.Provider value={gameState}>
          <GameDispatchContext.Provider value={gameDispatch}>

            <Layer>
              <SplashScreen />
              <OptionsPanel />
            </Layer>
            <Stack tokens={{ childrenGap: 15 }} horizontalAlign='space-between' verticalAlign='space-evenly'>
              <Table />
              <ActivityLog />
              <DebugWindow />
            </Stack>

          </GameDispatchContext.Provider>
        </GameContext.Provider>
      </SettingDispatchContext.Provider>
    </SettingContext.Provider>
  );
}

export default App;
