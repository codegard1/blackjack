import type { IPlayerStoreState } from './IPlayerStore';
import type { DeckState } from './DeckState';
import type { GameState } from './GameState';

/** Scalar game fields saved alongside the deck and player stores */
export type SavedGame = Pick<GameState,
  'activityLog' | 'activeHandIndex' | 'controllingPlayer' | 'dealerHasControl' | 'gameStatus' | 'gameStatusFlag' |
  'isInsuranceOpen' | 'loser' | 'minimumBet' | 'pot' | 'round' | 'session' | 'tableRules' | 'turnCount' | 'winner'
> & { version: number; botAccounts?: GameState['botAccounts'] };

/**
 * Everything needed to resume a game: the deck, the players at the table, and the
 * round in progress. Saved in the browser and, in the same shape, on the server.
 */
export type SavedGameSnapshot = {
  deck: DeckState;
  players: IPlayerStoreState;
  game: SavedGame;
};
