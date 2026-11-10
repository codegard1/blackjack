import React from 'react';
import { GameAction } from '../enums';
import { IGameReducerAction } from '../interfaces';
import { GameState } from '../types';
import { gameSnapshot, MAX_SYNCED_ACTIVITY, restoreGameState } from './persistence';
import { useRemoteSync } from './useRemoteSync';

/** The form of a game sent to the server: its snapshot with a bounded activity log */
export const toRemoteGame = (state: GameState): unknown => gameSnapshot(state, { maxActivity: MAX_SYNCED_ACTIVITY });

/**
 * Keep the game in progress in step with the server, so it resumes where it was
 * left off; see useRemoteSync. A server copy that is not a valid snapshot is ignored.
 */
export function useGameSync(
  state: GameState,
  dispatch: React.Dispatch<IGameReducerAction>,
  options: { enabled?: boolean } = {},
): void {
  useRemoteSync<GameState>({
    kind: 'game',
    value: state,
    toRemote: toRemoteGame,
    preview: restoreGameState,
    replace: (remote) => dispatch({ type: GameAction.RestoreGame, snapshot: remote }),
    ...options,
  });
}
