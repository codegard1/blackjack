import { Dispatch, createContext, useContext } from 'react';
import { IGameReducerAction } from '../interfaces';
import { GameState } from '../types';
import { gameDefaults } from './gameDefaults';

export const GameContext = createContext<GameState>(gameDefaults);
export const GameDispatchContext = createContext<Dispatch<IGameReducerAction>>(() => { });

// Custom hook to consume context
export const useGameContext = () => {
  const gameState = useContext(GameContext);
  const gameDispatch = useContext(GameDispatchContext);

  if (!gameState || !gameDispatch) {
    throw new Error('useSettingContext must be used within a SettingProvider');
  }

  return { gameState, gameDispatch };
}
