import { PlayerStore } from '../classes/PlayerStore';
import { PlayingCard } from '../classes/PlayingCard';
import { PlayingCardDeck } from '../classes/PlayingCardDeck';
import { gameDefaults } from '../context';
import { GameAction, GameStatus } from '../enums';
import { GameState } from '../types';
import { gameReducer } from './gameReducer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createGameState = (): GameState => ({
  ...gameDefaults,
  deck: new PlayingCardDeck(),
  playerStore: new PlayerStore(),
  messageBarDefinition: { ...gameDefaults.messageBarDefinition },
});

const startDefaultGame = (): GameState => gameReducer(createGameState(), {
  type: GameAction.NewGame,
  playerKey: ['chris', 'dealer'],
});

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'time').mockImplementation(() => {});
  vi.spyOn(console, 'timeEnd').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('game behavior baseline', () => {
  it('starts a game with the selected human and dealer', () => {
    const state = startDefaultGame();

    expect(state.gameStatus).toBe(GameStatus.InProgress);
    expect(state.round).toBe(1);
    expect(state.playerStore.activePlayerKeys).toEqual(['chris', 'dealer']);
    expect(state.playerStore.currentPlayerKey).toBe('chris');
    expect(state.deck.playerHands.chris.cards).toEqual([]);
    expect(state.deck.playerHands.dealer.cards).toEqual([]);
  });

  it('deals two cards to each player from the top of the deck', () => {
    const state = startDefaultGame();
    state.deck.cards = ['Club_2', 'Diamond_5', 'Heart_9', 'Spade_10'].map(
      (key) => new PlayingCard(key),
    );

    const result = gameReducer(state, { type: GameAction.Deal });

    expect(result.deck.playerHands.chris.cards).toEqual(['Spade_10', 'Heart_9']);
    expect(result.deck.playerHands.dealer.cards).toEqual(['Diamond_5', 'Club_2']);
    expect(result.deck.length).toBe(0);
    expect(result.playerStore.player('chris').bank).toBe(975);
    expect(result.playerStore.player('dealer').bank).toBe(975);
    expect(result.pot).toBe(50);
  });

  it('draws from the requested end of the deck into the player hand', () => {
    const state = startDefaultGame();
    state.deck.cards = ['Club_2', 'Diamond_5', 'Heart_9'].map(
      (key) => new PlayingCard(key),
    );

    gameReducer(state, {
      type: GameAction.Draw,
      playerKey: 'chris',
      deckSide: 'top',
      numberOfCards: 1,
    });
    gameReducer(state, {
      type: GameAction.Draw,
      playerKey: 'chris',
      deckSide: 'bottom',
      numberOfCards: 1,
    });

    expect(state.deck.playerHands.chris.cards).toEqual(['Heart_9', 'Club_2']);
    expect(state.deck.drawnKeys).toEqual(['Heart_9', 'Club_2']);
    expect(state.deck.cardKeys).toEqual(['Diamond_5']);
  });

});