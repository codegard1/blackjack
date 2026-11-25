import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import App from './App';
import { STARTING_BANK } from './definitions';
import { StoreName } from './enums';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

type SavedPlayer = { key: string; bank: number; stats: { numberOfGamesPlayed: number } };
type SavedHand = { cards: string[]; splitHands?: SavedHand[] };
type SavedEntry = { event?: string; description: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- what the game saved, read back as it is
const saved = (store: StoreName): any => JSON.parse(localStorage.getItem(store)!);

it('plays two hands under strict mode, which runs every reducer and effect twice, without doing anything twice', async () => {
  render(<React.StrictMode><App /></React.StrictMode>);

  fireEvent.click(screen.getByRole('button', { name: 'Players' }));
  await act(async () => { await vi.dynamicImportSettled(); });
  const dialog = screen.getByRole('dialog', { name: 'Players' });
  fireEvent.click(within(dialog).getByRole('checkbox', { name: /Ogion/ }));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));

  vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));

  const players = (): SavedPlayer[] => Object.values(saved(StoreName.PLAYERSTORE).players);
  const hands = (): Record<string, SavedHand> => saved(StoreName.DECKSTORE).playerHands;
  const log = (): SavedEntry[] => saved(StoreName.GAMESTORE).activityLog;

  // one game, one ante each, two cards each, and a shoe short by exactly those cards
  expect(players().map((player) => player.key)).toEqual(['chris', 'ogion', 'dealer']);
  expect(Object.values(hands()).map((hand) => hand.cards.length)).toEqual([2, 2, 2]);
  expect(saved(StoreName.DECKSTORE).cardKeys).toHaveLength(52 - 6);
  expect(log().filter((entry) => entry.event === 'game')).toHaveLength(1);
  expect(log().filter((entry) => entry.event === 'ante')).toHaveLength(2);
  expect(log().filter((entry) => entry.event === 'deal')).toHaveLength(3);
  const staked = () => players().filter((player) => player.key !== 'dealer').reduce((total, player) => total + STARTING_BANK - player.bank, 0);
  expect(saved(StoreName.GAMESTORE).pot).toBe(staked());
  expect(staked()).toBeGreaterThanOrEqual(50);

  // play the hand out: the human stays when it is their turn, and the computer seats take theirs
  const nextHand = () => screen.queryByRole('button', { name: 'Next hand' });
  const isFree = (button: HTMLElement | null) => !!button && !button.hasAttribute('disabled') && button.getAttribute('aria-disabled') !== 'true';
  for (let waited = 0; waited < 60_000 && !isFree(nextHand()); waited += 250) {
    const stay = screen.queryByRole('button', { name: 'Stay' });
    if (isFree(stay)) fireEvent.click(stay!);
    act(() => vi.advanceTimersByTime(250));
  }
  expect(isFree(nextHand())).toBe(true);

  // the round was settled once: the money at the table is what it started with, and each hand counted once
  expect(players().reduce((total, player) => total + player.bank, 0)).toBe(3 * STARTING_BANK);
  // (a seat that split played two hands, and the stats count hands)
  const handsPlayed = (key: string) => 1 + (hands()[key].splitHands?.length ?? 0);
  expect(players().map((player) => player.stats.numberOfGamesPlayed)).toEqual(['chris', 'ogion', 'dealer'].map(handsPlayed));
  const profile = saved(StoreName.PROFILESTORE).profiles.find((item: { id: string }) => item.id === 'chris');
  expect(profile.stats.numberOfGamesPlayed).toBe(handsPlayed('chris'));

  fireEvent.click(nextHand()!);
  expect(saved(StoreName.GAMESTORE).round).toBe(2);
  expect(Object.values(hands()).map((hand) => hand.cards.length)).toEqual([2, 2, 2]);
  expect(log().filter((entry) => entry.description === 'Round 2 started')).toHaveLength(1);
  // the cards are real, so the hand can be long, and strict mode renders everything twice: allow for both
}, 30_000);
