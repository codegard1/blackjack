// React
import React from 'react';

// Fluent UI
import { MessageBarType } from '@fluentui/react';

// Local Resources
import { PlayerStore, PlayingCardDeck } from './';
import { IAppContextProps } from '../interfaces';
import { PlayerKey } from '../types';
import { GameStatus } from '../enums/GameStatus';

// Create the default Context object with mostly dummy values
const AppContext = React.createContext<IAppContextProps>({
  initializeStores: () => { },
  clearStores: () => { },
  playerStore: new PlayerStore(),
  deckStore: {
    deck: new PlayingCardDeck(),
    newDeck: () => new PlayingCardDeck,
    draw: () => console.log('draw'),
    drawRandom: () => console.log('drawRandom'),
    drawFromBottomOfDeck: () => console.log('drawFromBottomOfDeck'),
    shuffle: () => console.log('shuffle'),
    putOnTopOfDeck: () => console.log('putOnTopOfDeck'),
    putOnBottomOfDeck: () => console.log('putOnBottomOfDeck'),
    removeSelectedFromPlayerHand: () => console.log('removeSelectedFromPlayerHand'),
    removeSelectedFromDrawn: () => console.log('removeSelectedFromDrawn'),
    select: () => console.log('select'),
    deselect: () => console.log('deselect'),
  },
  settingStore: {
    isActivityLogVisible: false,
    isCardDescVisible: false,
    isCardTitleVisible: false,
    isDealerHandVisible: false,
    isDeckVisible: false,
    isDrawnVisible: false,
    isHandValueVisible: false,
    isMessageBarVisible: false,
    isOptionsPanelVisible: false,
    isSelectedVisible: false,
    isSplashScreenVisible: true,
    setActivityLogVisible: () => console.log('setActivityLogVisible'),
    setCardDescVisible: () => console.log('setCardDescVisible'),
    setCardTitleVisible: () => console.log('setCardTitleVisible'),
    setDealerHandVisible: () => console.log('setDealerHandVisible'),
    setDeckVisible: () => console.log('setDeckVisible'),
    setDrawnVisible: () => console.log('setDrawnVisible'),
    setHandValueVisible: () => console.log('setHandValueVisible'),
    setMessageBarVisible: () => console.log('setMessageBarVisible'),
    setOptionsPanelVisible: () => console.log('setOptionsPanelVisible'),
    setSelectedVisible: () => console.log('setSelectedVisible'),
    setSplashScreenVisible: () => console.log('setSplashScreenVisible'),
  },
  gameStore: {
    bet: (key: PlayerKey) => console.log('bet'),
    deal: (key: PlayerKey) => console.log('deal'),
    dealerHasControl: false,
    endGame: () => { },
    endGameTrap: () => true,
    evaluateGame: () => { },
    gameStatus: GameStatus.Init,
    gameStatusFlag: false,
    hideMessageBar: () => console.log('hideMessageBar'),
    hit: (key: PlayerKey) => console.log('hit'),
    lastWriteTime: '',
    loser: undefined,
    messageBarDefinition: { type: MessageBarType.info, text: "", isMultiLine: false },
    minimumBet: 25,
    newGame: (keys: PlayerKey[]) => { },
    newRound: () => { },
    newActivityLogItem: (name, description, iconName) => { },
    pot: 0,
    resetGame: () => console.log('resetGame'),
    round: 0,
    setDealerHasControl: () => console.log('setDealerHasControl'),
    setLastWriteTime: () => console.log('setLastWriteTime'),
    setLoser: () => console.log('setLoser'),
    setMessageBarDefinition: () => console.log('setMessageBarDefinition'),
    setMinimumBet: () => console.log('setMinimumBet'),
    setPot: () => console.log('setPot'),
    setRound: () => console.log('setRound'),
    setTurnCount: () => console.log('setTurnCount'),
    setWinner: () => console.log('setWinner'),
    showMessageBar: () => console.log('showMessageBar'),
    stay: () => console.log('stay'),
    turnCount: 0,
    winner: undefined,
  }
});

export default AppContext;
