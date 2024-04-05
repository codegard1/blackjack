import { createContext, useContext, Dispatch } from 'react';
import { IDeckReducerAction } from '../interfaces';
import { DeckState } from '../types';
import { deckDefaults } from './deckDefaults';

export const DeckContext = createContext<DeckState>(deckDefaults);
export const DeckDispatchContext = createContext<Dispatch<IDeckReducerAction>>(() => { });

// Custom hook to consume context
export const useDeckContext = () => {
  const deckState = useContext(DeckContext);
  const deckDispatch = useContext(DeckDispatchContext);

  if (!deckState || !deckDispatch) {
    throw new Error('useSettingContext must be used within a SettingProvider');
  }

  return { deckState, deckDispatch };
}
