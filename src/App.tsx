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
import { DeckContext, DeckDispatchContext, GameContext, GameDispatchContext, SettingContext, SettingDispatchContext, deckDefaults, gameDefaults, settingDefaults } from './ctx';
import { defaultplayersArr } from './definitions';
import { DeckAction, GameAction, GameStatus, StoreName } from './enums';
import { deckReducer, gameReducer, settingReducer } from './functions';
import { DeckState, PlayerKey, SettingsState } from './types';

// Necessary in order for Fluent Icons to render on the page
initializeIcons();

// Main Component
const App = () => {

  // NEW State using Reducers
  const [settings, toggleSetting] = React.useReducer(settingReducer, settingDefaults);
  const [deck1, deckDispatch] = React.useReducer(deckReducer, deckDefaults);
  const [gameState, gameDispatch] = React.useReducer(gameReducer, gameDefaults);
  const { playerStore, loser, winner, lastWriteTime, pot, round, turnCount } = gameState;

  //----------------------------------------------------------------//

  // DEPRECATED 
  const newActivityLogItem = (name: string, description: string, iconName: string) => { };

  /**
   * Get values from localStorage
   */
  const initializeStores = () => {
    const _playerStore = localStorage.getItem(StoreName.PLAYERSTORE);
    const _deckStore = localStorage.getItem(StoreName.DECKSTORE);
    if (null !== _deckStore) {
      const _ds: DeckState = JSON.parse(_deckStore);
      for (let key in _ds) {
        // if (key !== 'isSplashScreenVisible') toggleSetting({ key, value: _ss[key] });
      }
    }

    const _settingStore = localStorage.getItem(StoreName.SETTINGSTORE);
    if (null !== _settingStore) {
      const _ss: SettingsState = JSON.parse(_settingStore);
      for (let key in _ss) {
        if (key !== 'isSplashScreenVisible') toggleSetting({ key, value: _ss[key] });
      }
    }
  }

  /**
   *  GAME ACTIONS
   */
  const deal = (playerKey: PlayerKey) => {
    deckDispatch({ type: DeckAction.Draw, playerKey, numberOfCards: 2, deckSide: 'top' });
    gameDispatch({ type: GameAction.SetGameStatus, gameStatus: GameStatus.InProgress });
  }

  const hit = (playerKey: string) => {
    deckDispatch({ type: DeckAction.Draw, playerKey, numberOfCards: 1, deckSide: 'top' });
  }

  const newGame = (selectedPlayers: PlayerKey[]) => {
    deckDispatch({ type: DeckAction.Reset });
    selectedPlayers.forEach((pk, ix) => {
      deckDispatch({ type: DeckAction.NewPlayerHand, playerKey: pk });
      deal(pk);
      const _p = defaultplayersArr.find(v => v.key === pk);
      // if (_p) console.log(JSON.stringify(_p));
      if (_p) playerStore!.newPlayer(pk, _p?.title, _p?.isNPC, ix, _p?.bank, _p?.disabled)
    });
    gameDispatch({ type: GameAction.NewRound });
  };

  const _ante = (amount: number) => {
    playerStore._allPlayersAnte(amount);
    gameDispatch({ type: GameAction.AddToPot, potIncrement: (amount * playerStore.length) })
    newActivityLogItem('All players', `ante $${amount}`, 'Money');
  }

  React.useEffect(() => {
    // console.log('Initialization effect');
    initializeStores();
  }, [])

  React.useEffect(() => {
    if (null !== deck1) {
      //   console.log('Deck effect');

      localStorage.setItem(StoreName.DECKSTORE, JSON.stringify(deck1));
    }
  }, [deck1]);

  React.useEffect(() => {
    // if (null !== playerStore) {
    //   console.log('Players effect', playerStore.state);
    //   localStorage.setItem(StoreName.PLAYERSTORE, JSON.stringify(playerStore.state));
    // }
  }, [playerStore.state]);

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
                    <Text>{JSON.stringify(deck1)}</Text>
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
