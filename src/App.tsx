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

// Necessary in order for Fluent Icons to render on the page
initializeIcons();

// Main Component
const App = () => {

  // State from context
  const [settings, toggleSetting] = React.useReducer(settingReducer, settingDefaults),
    [deck1, deckDispatch] = React.useReducer(deckReducer, deckDefaults),
    [gameState, gameDispatch] = React.useReducer(gameReducer, gameDefaults);
  const { playerStore, } = gameState;

  //----------------------------------------------------------------//

  // TODO: replicate this in a reducer function
  const newGame = (selectedPlayers: PlayerKey[]) => {
    deckDispatch({ type: DeckAction.Reset });
    selectedPlayers.forEach((pk, ix) => {
      deckDispatch({ type: DeckAction.NewPlayerHand, playerKey: pk });
      const _p = defaultplayersArr.find(v => v.key === pk);
      // if (_p) console.log(JSON.stringify(_p));
      if (_p) playerStore!.newPlayer(pk, _p?.title, _p?.isNPC, ix, _p?.bank, _p?.disabled)
    });
    gameDispatch({ type: GameAction.NewRound });
  };

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

  // Save deck state to localStorage
  React.useEffect(() => {
    if (!!deck1) {
      localStorage.setItem(StoreName.DECKSTORE, JSON.stringify(deck1));
    }
  }, [deck1]);

  // Save settings state to localStorage
  React.useEffect(() => {
    if (!!settings) {
      localStorage.setItem(StoreName.SETTINGSTORE, JSON.stringify(settings));
    }
  }, [settings]);

  return (
    <SettingContext.Provider value={settings}>
      <SettingDispatchContext.Provider value={toggleSetting}>
        <DeckContext.Provider value={deck1}>
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
                  <div style={{ backgroundColor: '#eee' }}>

                  </div>
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
