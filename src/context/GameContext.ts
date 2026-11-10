import { Dispatch, createContext, useContext } from 'react';
import { PlayerStore, PlayingCardDeck } from '../classes';
import { GameStatus } from '../enums';
import { IGameReducerAction } from '../interfaces';
import { GameState, defaultTableRules } from '../types';

export const createGameState = (): GameState => ({
  activeHandIndex: 0,
  activityLog: [],
  gameStatus: GameStatus.Init,
  deck: new PlayingCardDeck(),
  gameStatusFlag: false,
  isSpinnerVisible: false,
  loser: undefined,
  winner: undefined,
  dealerHasControl: false,
  minimumBet: 25,
  pot: 0,
  round: 0,
  tableRules: { ...defaultTableRules },
  turnCount: 0,
  lastWriteTime: new Date().toISOString(),
  controllingPlayer: undefined,
  playerStore: new PlayerStore(),
});

export const gameDefaults: GameState = createGameState();


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
