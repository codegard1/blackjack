import React, { createContext } from 'react';
import { GameState } from '../types';
import { gameDefaults } from './gameDefaults';
import { IGameReducerAction } from '../interfaces';

export const GameContext = createContext<GameState>(gameDefaults);
export const GameDispatchContext = createContext<React.Dispatch<IGameReducerAction>>(() => { });
