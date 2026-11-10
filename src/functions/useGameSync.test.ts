import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameState } from '../context';
import { GameAction, GameStatus } from '../enums';
import { IGameReducerAction } from '../interfaces';
import { GameState } from '../types';
import { gameReducer } from './gameReducer';
import { gameSnapshot, MAX_SYNCED_ACTIVITY } from './persistence';
import { loadSyncState, saveSyncState } from './remote';
import { SYNC_DEBOUNCE_MS } from './useRemoteSync';
import { toRemoteGame, useGameSync } from './useGameSync';

/** an id of the shape the server issues; the client only checks the shape */
const OWNER = 'browser:3b2e6c1e-4f55-4a9e-9c1a-1d2e3f4a5b6c.c2lnbmVkLWJ5LXRoZS1zZXJ2ZXItZm9yLXRlc3RzLTAx';
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
const startedGame = () => gameReducer(createGameState(), { type: GameAction.NewGame, playerKey: ['chris', 'dealer'] });

function renderSync(initial: GameState, fetch: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetch);
  return renderHook(() => {
    const [state, dispatch] = React.useReducer(gameReducer, initial);
    useGameSync(state, dispatch, { enabled: true });
    return { state, dispatch: dispatch as React.Dispatch<IGameReducerAction> };
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('toRemoteGame', () => {
  it('is the saved snapshot with the activity log bounded', () => {
    const state = startedGame();
    expect(toRemoteGame(state)).toEqual(gameSnapshot(state));

    const noisy = { ...state, activityLog: Array.from({ length: MAX_SYNCED_ACTIVITY + 5 }, (_, id) => ({ id, timestamp: id, name: 'x', description: 'y' })) };
    const sent = toRemoteGame(noisy) as { game: { activityLog: { id: number }[] } };
    expect(sent.game.activityLog).toHaveLength(MAX_SYNCED_ACTIVITY);
    expect(sent.game.activityLog[0].id).toBe(5);
  });
});

describe('useGameSync', () => {
  it('resumes the server copy of the game when it is newer', async () => {
    saveSyncState({ ownerId: OWNER, syncedAt: { profiles: 0, game: 10 } });
    const dealt = gameReducer(startedGame(), { type: GameAction.Deal });
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ game: gameSnapshot(dealt), updatedAt: 20 }));

    const { result } = renderSync(createGameState(), fetch);
    await flush();

    expect(result.current.state.gameStatus).toBe(dealt.gameStatus);
    expect(result.current.state.round).toBe(dealt.round);
    expect(result.current.state.playerStore.activePlayerKeys).toEqual(['chris', 'dealer']);
    expect(result.current.state.deck.playerHands.chris.cards).toEqual(dealt.deck.playerHands.chris.cards);
    expect(loadSyncState().syncedAt.game).toBe(20);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('ignores a server copy that is not a valid snapshot and sends the local game', async () => {
    saveSyncState({ ownerId: OWNER, syncedAt: { profiles: 0, game: 0 } });
    const fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ game: { deck: {}, players: {}, game: {} }, updatedAt: 20 }))
      .mockResolvedValueOnce(jsonResponse({ updatedAt: 21 }));
    const local = startedGame();

    const { result } = renderSync(local, fetch);
    await flush();

    expect(result.current.state.round).toBe(local.round);
    expect(result.current.state.gameStatus).toBe(local.gameStatus);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ game: gameSnapshot(local) });
    expect(loadSyncState().syncedAt.game).toBe(21);
  });

  it('sends the game once a move settles, but not a change that leaves the snapshot alone', async () => {
    saveSyncState({ ownerId: OWNER, syncedAt: { profiles: 0, game: 0 } });
    const fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'Not found.' }, 404))
      .mockResolvedValue(jsonResponse({ updatedAt: 6 }));
    const { result } = renderSync(startedGame(), fetch);
    await flush();
    expect(fetch).toHaveBeenCalledTimes(2);

    vi.useFakeTimers();
    act(() => result.current.dispatch({ type: GameAction.SetSpinnerVisible }));
    await act(async () => { await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS); });
    expect(fetch).toHaveBeenCalledTimes(2);

    act(() => result.current.dispatch({ type: GameAction.Deal }));
    await act(async () => { await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS); });
    expect(fetch).toHaveBeenCalledTimes(3);
    const sent = JSON.parse(fetch.mock.calls[2][1].body).game;
    expect(sent).toEqual(JSON.parse(JSON.stringify(toRemoteGame(result.current.state))));
    expect(sent.game.gameStatus).not.toBe(GameStatus.Init);
    expect(sent.deck.playerHands.chris.cards).toHaveLength(2);
  });
});
