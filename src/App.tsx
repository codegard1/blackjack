// React
import React from 'react';

// FluentUI
import {
  Layer,
  Stack,
  Text,
  initializeIcons,
} from '@fluentui/react';

// Local Resources
import './App.css';
import { ActivityLog, OptionsPanel, SplashScreen, Table } from './components';
import { DeckContext, DeckDispatchContext, GameContext, GameDispatchContext, SettingContext, SettingDispatchContext, deckDefaults, gameDefaults, settingDefaults } from './context';
import { defaultplayersArr } from './definitions';
import { DeckAction, GameAction, StoreName } from './enums';
import { deckReducer, gameReducer, settingReducer } from './functions';
import { PlayerKey, SettingsState } from './types';
import { DebugWindow } from './components/DebugWindow';

// Necessary in order for Fluent Icons to render on the page
initializeIcons();

// Main Component
const App = () => {

  // State from context
  const [settings, toggleSetting] = React.useReducer(settingReducer, settingDefaults),
    [deckState, deckDispatch] = React.useReducer(deckReducer, deckDefaults),
    [gameState, gameDispatch] = React.useReducer(gameReducer, gameDefaults);
  const { playerStore, } = gameState;

  // Read values from localStorage
  React.useEffect(() => {
    // const _playerStore = localStorage.getItem(StoreName.PLAYERSTORE);
    // const _deckStore = localStorage.getItem(StoreName.DECKSTORE);

    const _settingStore = localStorage.getItem(StoreName.SETTINGSTORE);
    if (null !== _settingStore) {
      const _ss: SettingsState = JSON.parse(_settingStore);
      for (let key in _ss) {
        if (key !== 'isSplashScreenVisible') toggleSetting({ key, value: _ss[key] });
      }
    }
  }, []);

  // Save settings state to localStorage
  React.useEffect(() => {
    if (!!settings) {
      localStorage.setItem(StoreName.SETTINGSTORE, JSON.stringify(settings));
    }
  }, [settings]);

  // Save deck state to localStorage
  React.useEffect(() => {
    if (!!deckState) {
      localStorage.setItem(StoreName.DECKSTORE, JSON.stringify(deckState));
    }
  }, [deckState]);

  return (
    <SettingContext.Provider value={settings}>
      <SettingDispatchContext.Provider value={toggleSetting}>
        <DeckContext.Provider value={deckState}>
          <DeckDispatchContext.Provider value={deckDispatch}>
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
          </DeckDispatchContext.Provider>
        </DeckContext.Provider>
      </SettingDispatchContext.Provider>
    </SettingContext.Provider>
  );
}

export default App;
