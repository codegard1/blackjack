// React
import React from 'react';

// FluentUI
import { Stack, Text, Link, FontWeights, IStackTokens, IStackStyles, ITextStyles, PrimaryButton } from '@fluentui/react';
import { initializeIcons } from '@fluentui/react';


// Local Resources
import './App.css';
import { DeckContainer, OptionsPanel } from './components';
import { IndexedDB, PlayingCard, PlayingCardDeck, } from './classes';
import AppContext from './classes/AppContext';
// import { PlayerStore } from './stores/PlayerStore';

const boldStyle: Partial<ITextStyles> = { root: { fontWeight: FontWeights.semibold } };
const stackTokens: IStackTokens = { childrenGap: 15 };
const stackStyles: Partial<IStackStyles> = {
  root: {
    width: '960px',
    margin: '0 auto',
    textAlign: 'center',
    color: '#605e5c',
  },
};

// Necessary in order for Fluent Icons to render on the page
initializeIcons();

// Main Component
const App = () => {

  // IDB  
  const db = new IndexedDB(
    'BlackJackDB',
    1,
    (db, oldVersion, newVersion) => {
      // upgrade database
      switch (oldVersion) {
        case 0: {
          db.createObjectStore('App');
        }
      }
    });

  // Stores
  // const playerStore = new PlayerStore();


  // State
  const [deck, setDeck] = React.useState<PlayingCardDeck>(new PlayingCardDeck());
  const [isCardDescVisible, setCardDescVisible] = React.useState<boolean>(false);
  const [gameStatus, setGameStatus] = React.useState<number>(0);


  /**
   *  CONTROL PANEL ACTIONS
  */
  const [isDealerHandVisible, setDealerHandVisible] = React.useState<boolean>(false);
  const [isHandValueVisible, setHandValueVisible] = React.useState<boolean>(false);
  const [isDeckVisible, setDeckVisible] = React.useState<boolean>(true);
  const [isDrawnVisible, setDrawnVisible] = React.useState<boolean>(false);
  const [isSelectedVisible, setSelectedVisible] = React.useState<boolean>(false);
  const [isCardTitleVisible, setCardTitleVisible] = React.useState<boolean>(false);
  const [isActivityLogVisible, setActivityLogVisible] = React.useState<boolean>(false);
  const [isOptionsPanelVisible, setOptionsPanelVisible] = React.useState<boolean>(false);


  /**
   *  DECK ACTIONS
   */
  const newDeck = () => new PlayingCardDeck();
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

  return (
    <AppContext.Provider value={{
      deck,
      isCardDescVisible,
      isDealerHandVisible,
      isHandValueVisible,
      gameStatus,
      isDeckVisible,
      isDrawnVisible,
      isSelectedVisible,
      isCardTitleVisible,
      isActivityLogVisible,
      isOptionsPanelVisible,
      settingActions: {
        setDealerHandVisible,
        setHandValueVisible,
        setDeckVisible,
        setDrawnVisible,
        setSelectedVisible,
        setCardTitleVisible,
        setActivityLogVisible,
        setOptionsPanelVisible,
      },
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
      <Stack tokens={stackTokens} styles={stackStyles} horizontal wrap horizontalAlign='space-between' verticalAlign='space-evenly' verticalFill>

        <PrimaryButton
          label='Options'
          onClick={() => setOptionsPanelVisible(true)}
        />

        <OptionsPanel />

        <DeckContainer
          hidden={false}
          handValue={''}
          isNPC={false}
          isPlayerDeck={false}
          isSelectable
          player={''}
          title={'Deck 1'}
          turnCount={0}
        />
      </Stack>
    </AppContext.Provider>
  );
}

export default App;
