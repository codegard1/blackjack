import React from 'react';
import { PlayingCardDeck } from './';

export interface AppContextProps {
  deck: PlayingCardDeck;
  isCardDescVisible?: boolean; // ControlPanelStore
  isDealerHandVisible?: boolean; // ControlPanelStore 
  isHandValueVisible?: boolean; // ControlPanelStore
  player?: any; // GameStore
  gameStatusFlag?: boolean; // props
  gameStatus?: number; // GameStore
}

const AppContext = React.createContext<AppContextProps>({ deck: new PlayingCardDeck() });

export default AppContext;
