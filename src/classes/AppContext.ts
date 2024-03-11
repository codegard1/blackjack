import React from 'react';
import { PlayingCardDeck } from './';
import { IAppContextProps } from '../interfaces';

const AppContext = React.createContext<IAppContextProps>({
  deck: new PlayingCardDeck(),
  isCardDescVisible: false,
  isDealerHandVisible: false,
  isHandValueVisible: false,
  isDeckVisible: false,
  isDrawnVisible: false,
  isOptionsPanelVisible: false,
  isSelectedVisible: false,
  isCardTitleVisible: false,
  isActivityLogVisible: false,
});

export default AppContext;
