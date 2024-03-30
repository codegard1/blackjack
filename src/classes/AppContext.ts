// React
import React from 'react';

// Fluent UI
import { MessageBarType } from '@fluentui/react';

// Local Resources
import { GameStatus } from '../enums';
import { IAppContextProps } from '../interfaces';
import { PlayerKey } from '../types';

// Create the default Context object with mostly dummy values
const AppContext = React.createContext<IAppContextProps>({
  initializeStores: () => { },
  clearStores: () => { },
  playerStore: null,
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
