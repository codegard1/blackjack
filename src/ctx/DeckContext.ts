import { createContext } from 'react';
import { IDeckReducerAction } from '../interfaces';
import { DeckState } from '../types';
import { deckDefaults } from './deckDefaults';

export const DeckContext = createContext<DeckState>(deckDefaults);
export const DeckDispatchContext = createContext<React.Dispatch<IDeckReducerAction>>(() => { });
