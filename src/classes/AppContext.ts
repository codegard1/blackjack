// React
import React from 'react';

// Fluent UI
import { MessageBarType } from '@fluentui/react';

// Local Resources
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
    hideMessageBar: () => console.log('hideMessageBar'),
    hit: (key: PlayerKey) => console.log('hit'),
    lastWriteTime: '',
    loser: undefined,
    newActivityLogItem: (name, description, iconName) => { },
    newGame: (keys: PlayerKey[]) => { },
    newRound: () => { },
    pot: 0,
    resetGame: () => console.log('resetGame'),
    round: 0,
    setLastWriteTime: () => console.log('setLastWriteTime'),
    setLoser: () => console.log('setLoser'),
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
