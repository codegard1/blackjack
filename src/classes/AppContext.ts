import React from 'react';
import { PlayingCardDeck } from './';
import { IAppContextProps } from '../interfaces';

const AppContext = React.createContext<IAppContextProps>({ deck: new PlayingCardDeck() });

export default AppContext;
