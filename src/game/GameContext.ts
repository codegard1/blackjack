import { Dispatch, createContext, useContext } from 'react';
import { GameStatus } from '../../shared';
import { createDeck } from './deck';
import { createPlayerStore } from './playerStore';
import { defaultBotAccounts } from './work';
import { GameReducerAction } from '../../shared/GameReducerAction';
import { GameState, defaultTableRules } from '../../shared';

export const createGameState = (): GameState => ({
  activeHandIndex: 0,
  activityLog: [],
  botAccounts: defaultBotAccounts(),
  gameStatus: GameStatus.Init,
  deck: createDeck(),
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
  playerStore: createPlayerStore(),
});

export const gameDefaults: GameState = createGameState();


export const GameContext = createContext<GameState>(gameDefaults);
export const GameStatusContext = createContext<GameStatus>(gameDefaults.gameStatus);
export const GameDispatchContext = createContext<Dispatch<GameReducerAction>>(() => { });

export const useGameStatus = (): GameStatus => useContext(GameStatusContext);

export const useGameDispatch = (): Dispatch<GameReducerAction> => useContext(GameDispatchContext);

// Custom hook to consume context
export const useGameContext = () => {
  const gameState = useContext(GameContext);
  const gameDispatch = useContext(GameDispatchContext);

  if (!gameState || !gameDispatch) {
    throw new Error('useGameContext must be used within a GameContext provider');
  }

  return { gameState, gameDispatch };
}
