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
  deck: new PlayingCardDeck(),
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
    isSpinnerVisible: true,
    lastWriteTime: '',
    loser: undefined,
    messageBarDefinition: { type: MessageBarType.info, text: "", isMultiLine: false },
    minimumBet: 25,
    newActivityLogItem: (name, description, iconName) => { },
    newGame: (keys: PlayerKey[]) => { },
    newRound: () => { },
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
    setSpinnerVisible: () => console.log('setSpinnerVisible'),
    setTurnCount: () => console.log('setTurnCount'),
    setWinner: () => console.log('setWinner'),
    showMessageBar: () => console.log('showMessageBar'),
    stay: () => console.log('stay'),
    turnCount: 0,
    winner: undefined,
  }
});

export default AppContext;
