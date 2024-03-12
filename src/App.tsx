// React
import React from 'react';

// FluentUI
import {
  Stack,
  Layer,
  initializeIcons
} from '@fluentui/react';

// Local Resources
import './App.css';
import { ActivityLog, CardStack, OptionsPanel } from './components';
import { IndexedDB, Player, PlayingCard, PlayingCardDeck, } from './classes';
import AppContext from './classes/AppContext';
import { SplashScreen } from './components/SplashScreen';
import { defaultPlayers } from './definitions';
import { Table } from './components/Table';
import { PlayerStore } from './classes/PlayerStore';

// Necessary in order for Fluent Icons to render on the page
initializeIcons();

// Main Component
const App = () => {

  // IDB  
  const db = new IndexedDB('BlackJackDB', 1, (db, oldVersion, newVersion) => {
    // upgrade database
    switch (oldVersion) {
      case 0: {
        db.createObjectStore('App');
      }
    }
  });

  // PlayerStore
  const players = new PlayerStore();


  // State
  // TODO: determine if State and "Actions" should all be defined here in App
  const [deck, setDeck] = React.useState<PlayingCardDeck>(new PlayingCardDeck());
  const [gameStatus, setGameStatus] = React.useState<number>(0);
  const [isActivityLogVisible, setActivityLogVisible] = React.useState<boolean>(false);
  const [isCardDescVisible, setCardDescVisible] = React.useState<boolean>(false);
  const [isCardTitleVisible, setCardTitleVisible] = React.useState<boolean>(false);
  const [isDealerHandVisible, setDealerHandVisible] = React.useState<boolean>(false);
  const [isDeckVisible, setDeckVisible] = React.useState<boolean>(true);
  const [isDrawnVisible, setDrawnVisible] = React.useState<boolean>(false);
  const [isHandValueVisible, setHandValueVisible] = React.useState<boolean>(false);
  const [isOptionsPanelVisible, setOptionsPanelVisible] = React.useState<boolean>(false);
  const [isSelectedVisible, setSelectedVisible] = React.useState<boolean>(false);
  const [isSplashScreenVisible, setSplashScreenVisible] = React.useState<boolean>(false);

  /**
   * All state variables related to App settings
   */
  const settingStore = {
    isActivityLogVisible,
    isCardDescVisible,
    isCardTitleVisible,
    isDealerHandVisible,
    isDeckVisible,
    isDrawnVisible,
    isHandValueVisible,
    isOptionsPanelVisible,
    isSelectedVisible,
    isSplashScreenVisible,
    setActivityLogVisible,
    setCardDescVisible,
    setCardTitleVisible,
    setDealerHandVisible,
    setDeckVisible,
    setDrawnVisible,
    setHandValueVisible,
    setOptionsPanelVisible,
    setSelectedVisible,
    setSplashScreenVisible,
  };


  /**
   *  DECK ACTIONS
   */
  const newDeck = (): PlayingCardDeck => { setDeck(new PlayingCardDeck()); return deck; }
  const draw = (num: number) => deck.draw(num);
  const drawRandom = (num: number) => deck.drawRandom(num);
  const drawFromBottomOfDeck = (num: number) => deck.drawFromBottomOfDeck(num);
  const shuffle = () => deck.shuffle();
  const putOnTopOfDeck = (cards: PlayingCard[]) => deck.putOnTopOfDeck(cards);
  const putOnBottomOfDeck = (cards: PlayingCard[]) => deck.putOnBottomOfDeck(cards);
  const removeSelectedFromPlayerHand = (playerKey: string, cards: PlayingCard[]) => { };
  const removeSelectedFromDrawn = (cards: PlayingCard[]) => { };
  const select = (cardAttributes: any) => { };
  const deselect = (cardAttributes: any) => { };

  /**
   *  GAME ACTIONS
   */
  const deal = () => deck.deal(2, []);
  const hit = (playerKey: string) => { }
  const stay = (playerKey: string) => { };
  const bet = (playerKey: string, amount: number) => { };
  const newGame = (players: any) => { };
  const showMessageBar = (text: string, type: any) => [];
  const hideMessageBar = () => { };
  const reset = () => { };
  const newRound = () => { };

  /**
 * STORE ACTIONS
 */
  // Add a new entry to the Activity Log Store
  const newActivityLogItem = (name: string, description: string, iconName: string) => { };
  // Initialize Stores
  const initializeStores = () => { };
  /**
   * delete all entries from stores
   */
  const clearStores = () => { };
  const evaluateGame = (statusCode: number) => { };
  const endGame = () => { };
  const endGameTrap = (players: any) => { };


  React.useEffect(() => {
    if (null !== deck) {
      console.log('Deck effect');
    }
  }, [deck]);

  React.useEffect(() => {
    if (null !== settingStore) {
      console.log('settingStore effect', JSON.stringify(settingStore));
      db.set('settingStore', 'settingStore', JSON.stringify(settingStore));
    }
  }, [settingStore]);

  return (
    <AppContext.Provider value={{
      deck,
      players: defaultPlayers,
      gameStatus,
      settingStore,
      deckActions: {
        newDeck,
        draw,
        drawRandom,
        drawFromBottomOfDeck,
        shuffle,
        putOnTopOfDeck,
        putOnBottomOfDeck,
        removeSelectedFromPlayerHand,
        removeSelectedFromDrawn,
        select,
        deselect,
      },
      gamePlayActions: {
        deal,
        hit,
        stay,
        bet,
        newGame,
        showMessageBar,
        hideMessageBar,
        reset,
        newRound,
      },
      storeActions: {
        newActivityLogItem,
        initializeStores,
        clearStores,
        evaluateGame,
        endGame,
        endGameTrap,
      }
    }}>
      <Layer>
        <SplashScreen />
        <OptionsPanel />
      </Layer>
      <Stack tokens={{ childrenGap: 15 }} horizontalAlign='space-between' verticalAlign='space-evenly'>
        <Table />
        <ActivityLog hidden={!settingStore.isActivityLogVisible} />
      </Stack>
    </AppContext.Provider>
  );
}

export default App;
