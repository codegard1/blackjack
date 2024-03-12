import React from 'react';
import { PlayingCardDeck } from './';
import { IAppContextProps } from '../interfaces';
import { defaultPlayers } from '../definitions';

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
});

export default AppContext;
