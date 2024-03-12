import React from 'react';
import { PlayingCardDeck } from './';
import { IAppContextProps } from '../interfaces';
import { defaultPlayers } from '../definitions';
import { MessageBarType } from '@fluentui/react';
import { PlayerKey } from '../types';

const AppContext = React.createContext<IAppContextProps>({
  deck: new PlayingCardDeck(),
  players: defaultPlayers,
  settingStore: {
    isActivityLogVisible: false,
    isCardDescVisible: false,
    isCardTitleVisible: false,
    isDealerHandVisible: false,
    isDeckVisible: false,
    isDrawnVisible: false,
    isHandValueVisible: false,
    isOptionsPanelVisible: false,
    isSelectedVisible: false,
    isSplashScreenVisible: true,
    setActivityLogVisible: () => console.log('setActivityLogVisible'),
    setCardTitleVisible: () => console.log('setCardTitleVisible'),
    setDealerHandVisible: () => console.log('setDealerHandVisible'),
    setDeckVisible: () => console.log('setDeckVisible'),
    setDrawnVisible: () => console.log('setDrawnVisible'),
    setHandValueVisible: () => console.log('setHandValueVisible'),
    setOptionsPanelVisible: () => console.log('setOptionsPanelVisible'),
    setSelectedVisible: () => console.log('setSelectedVisible'),
    setSplashScreenVisible: () => console.log('setSplashScreenVisible'),
  },
  gameStore: {
    bet: (key: PlayerKey) => console.log('bet'),
    deal: (key: PlayerKey) => console.log('deal'),
    dealerHasControl: false,
    hideMessageBar: () => console.log('hideMessageBar'),
    hit: (key: PlayerKey) => console.log('hit'),
    lastWriteTime: '',
    loser: undefined,
    messageBarDefinition: {
      type: MessageBarType.info,
      text: "",
      isMultiLine: false
    },
    minimumBet: 25,
    newGame: (keys: PlayerKey[]) => console.log('newGame'),
    newRound: () => console.log('newRound'),
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
