import { PlayerStore } from '../classes/PlayerStore';
import { PlayingCard } from '../classes/PlayingCard';
import { PlayingCardDeck } from '../classes/PlayingCardDeck';
import { gameDefaults } from '../context';
import { GameAction, GameStatus } from '../enums';
import { GameState } from '../types';
import { gameReducer } from './gameReducer';
import { handValue } from './getHandValue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createGameState = (): GameState => ({
  ...gameDefaults,
  deck: new PlayingCardDeck(),
  playerStore: new PlayerStore(),
  messageBarDefinition: { ...gameDefaults.messageBarDefinition },
});

const startDefaultGame = (): GameState => {
  const started = gameReducer(createGameState(), {
    type: GameAction.NewGame,
    playerKey: ['chris', 'dealer'],
  });
  return gameReducer(started, { type: GameAction.EvaluateGame, gameStatus: GameStatus.InProgress });
};

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
    let state = startDefaultGame();

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

  it('starts a new round instead of appending cards on subsequent deals', () => {
    const state = startDefaultGame();
    state.deck.cards = PlayingCardDeck.cardKeys().map((key) => new PlayingCard(key));

    const firstDeal = gameReducer(state, { type: GameAction.Deal });
    const firstHand = firstDeal.deck.playerHands.chris.cards.slice();
    const nextDeal = gameReducer(firstDeal, { type: GameAction.Deal });

    expect(firstDeal.round).toBe(1);
    expect(nextDeal.round).toBe(2);
    expect(nextDeal.deck.playerHands.chris.cards).toHaveLength(2);
    expect(nextDeal.deck.playerHands.dealer.cards).toHaveLength(2);
    expect(nextDeal.deck.playerHands.chris.cards).not.toEqual(firstHand);
    expect(nextDeal.playerStore.player('chris').bank).toBe(950);
    expect(nextDeal.pot).toBe(50);
  });

  it('records player actions in the game activity log', () => {
    const state = startDefaultGame();

    const result = gameReducer(state, {
      type: GameAction.Bet,
      playerKey: 'chris',
      betAmount: 25,
    });

    expect(result.activityLog.at(-1)).toMatchObject({
      name: 'Chris',
      description: 'wagered $25',
      sessionId: 1,
      event: 'bet',
    });
  });

  it('retains previous sessions after resetting and starting another game', () => {
    const firstGame = startDefaultGame();
    const wagered = gameReducer(firstGame, { type: GameAction.Bet, playerKey: 'chris', betAmount: 25 });
    const reset = gameReducer(wagered, { type: GameAction.ResetGame });
    const secondGame = gameReducer(reset, { type: GameAction.NewGame, playerKey: ['chris', 'dealer'] });

    // first game: game started, two antes, one wager; second game: game started
    expect(secondGame.activityLog.map((entry) => entry.sessionId)).toEqual([1, 1, 1, 1, 2]);
    expect(secondGame.activityLog.map((entry) => entry.id)).toEqual([1, 2, 3, 4, 5]);
    expect(secondGame.activityLog.at(-1)).toMatchObject({ event: 'game', description: 'Game started' });
    expect(firstGame.activityLog).toHaveLength(3);
  });

  it('clears activity history when explicitly clearing application data', () => {
    const result = gameReducer(startDefaultGame(), { type: GameAction.ResetGame, clearActivityLog: true });

    expect(result.activityLog).toEqual([]);
  });

  it('draws from the requested end of the deck into the player hand', () => {
    let state = startDefaultGame();
    state.deck.cards = ['Club_2', 'Diamond_5', 'Heart_9'].map(
      (key) => new PlayingCard(key),
    );

    state = gameReducer(state, {
      type: GameAction.Draw,
      playerKey: 'chris',
      deckSide: 'top',
      numberOfCards: 1,
    });
    state = gameReducer(state, {
      type: GameAction.Draw,
      playerKey: 'chris',
      deckSide: 'bottom',
      numberOfCards: 1,
    });

    expect(state.deck.playerHands.chris.cards).toEqual(['Heart_9', 'Club_2']);
    expect(state.deck.drawnKeys).toEqual(['Heart_9', 'Club_2']);
    expect(state.deck.cardKeys).toEqual(['Diamond_5']);
    expect(state.deck.playerHands.chris.handValue).toEqual({
      aceAsEleven: 11,
      aceAsOne: 11,
      highest: 11,
    });
  });

  it('returns a new state reference after a draw', () => {
    const state = startDefaultGame();
    state.deck.cards = [new PlayingCard('Club_2')];

    const result = gameReducer(state, {
      type: GameAction.Draw,
      playerKey: 'chris',
      deckSide: 'top',
      numberOfCards: 1,
    });

    expect(result).not.toBe(state);
  });

  it('hands control to the dealer when the human stays', () => {
    const state = startDefaultGame();

    const result = gameReducer(state, { type: GameAction.Stay, playerKey: 'chris' });

    expect(result.playerStore.player('chris').isStaying).toBe(true);
    expect(result.playerStore.currentPlayerKey).toBe('dealer');
    expect(result.dealerHasControl).toBe(true);
  });

  it('pushes when the dealer stands on an equal total', () => {
    const state = startDefaultGame();
    state.deck.playerHands.chris.cards = ['Club_10', 'Heart_7'];
    state.deck.playerHands.dealer.cards = ['Spade_10', 'Diamond_7'];
    state.deck.updateHandValue('chris');
    state.deck.updateHandValue('dealer');

    const dealerTurn = gameReducer(state, { type: GameAction.Stay, playerKey: 'chris' });
    const result = gameReducer(dealerTurn, { type: GameAction.Stay, playerKey: 'dealer' });

    expect(result.gameStatus).toBe(GameStatus.Push);
    expect(result.dealerHasControl).toBe(false);
  });

  it('ends the game when the dealer busts on a draw', () => {
    const state = startDefaultGame();
    state.playerStore.currentPlayerKey = 'dealer';
    state.deck.playerHands.dealer.cards = ['Spade_10', 'Diamond_9'];
    state.deck.cards = [new PlayingCard('Club_5')];

    const result = gameReducer(state, {
      type: GameAction.Draw,
      playerKey: 'dealer',
      deckSide: 'top',
      numberOfCards: 1,
    });

    expect(result.playerStore.player('dealer').isBusted).toBe(true);
    expect(result.gameStatus).toBe(GameStatus.HumanWins);
    expect(result.dealerHasControl).toBe(false);
  });

  it('calculates playable totals for an ace and a regular card', () => {
    expect(handValue(['Spade_14', 'Heart_5'])).toEqual({
      aceAsEleven: 16,
      aceAsOne: 6,
      highest: 16,
    });
  });

  it('records a wager against the current player and adds it to the pot', () => {
    const state = startDefaultGame();

    const result = gameReducer(state, {
      type: GameAction.Bet,
      playerKey: 'chris',
      betAmount: 25,
    });

    expect(result.playerStore.player('chris').bank).toBe(950);
    expect(result.playerStore.player('chris').lastBet).toBe(25);
    expect(result.playerStore.player('chris').totalBet).toBe(25);
    expect(result.pot).toBe(75);
  });

  it('resets to a fresh game state without retaining players', () => {
    const state = startDefaultGame();

    const result = gameReducer(state, { type: GameAction.ResetGame });

    expect(result).not.toBe(state);
    expect(result.playerStore).not.toBe(state.playerStore);
    expect(result.playerStore.length).toBe(0);
    expect(result.gameStatus).toBe(GameStatus.Init);
    expect(result.deck.length).toBe(52);
  });

});

const dealHands = (state: GameState, chris: string[], dealer: string[]): GameState => {
  // deal() gives each player two consecutive cards from the top (end of the array)
  state.deck.cards = [dealer[1], dealer[0], chris[1], chris[0]].map((key) => new PlayingCard(key));
  return gameReducer(state, { type: GameAction.Deal });
};

const settle = (state: GameState): GameState =>
  gameReducer(state, { type: GameAction.EvaluateGame, gameStatus: state.gameStatus });

describe('blackjack rules', () => {
  it('pushes when both players are dealt blackjack and returns stakes', () => {
    const dealt = dealHands(startDefaultGame(), ['Spade_14', 'Heart_13'], ['Club_14', 'Diamond_12']);

    expect(dealt.gameStatus).toBe(GameStatus.Push);

    const result = settle(dealt);
    expect(result.playerStore.player('chris').bank).toBe(1000);
    expect(result.playerStore.player('dealer').bank).toBe(1000);
    expect(result.winner).toBeUndefined();
    expect(result.activityLog.filter((entry) => entry.event === 'push').map((entry) => entry.amount)).toEqual([25, 25]);
  });

  it('records every bank movement, so the logged amounts add up to each bank change', () => {
    let state = dealHands(startDefaultGame(), ['Spade_10', 'Heart_9'], ['Club_10', 'Diamond_7']);
    state = gameReducer(state, { type: GameAction.Stay, playerKey: 'chris' });
    state = gameReducer(state, { type: GameAction.Stay, playerKey: 'dealer' });
    state = settle(state);

    expect(state.activityLog.find((entry) => entry.event === 'win')).toMatchObject({ name: 'Chris', amount: 50 });
    for (const key of ['chris', 'dealer']) {
      const player = state.playerStore.player(key);
      const logged = state.activityLog
        .filter((entry) => entry.name === player.title)
        .reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
      expect(logged).toBe(player.bank - 1000);
    }
  });

  it('pays a human natural the pot plus a 3:2 bonus from the dealer', () => {
    const dealt = dealHands(startDefaultGame(), ['Spade_14', 'Heart_13'], ['Club_10', 'Diamond_7']);
    expect(dealt.gameStatus).toBe(GameStatus.HumanWins);

    const result = settle(dealt);
    // Chris: 975 + pot 50 + bonus floor(25 / 2) = 1037; Dealer: 975 - 12 = 963
    expect(result.playerStore.player('chris').bank).toBe(1037);
    expect(result.playerStore.player('dealer').bank).toBe(963);
    expect(result.playerStore.player('chris').stats.numberOfTimesBlackjack).toBe(1);
    expect(result.playerStore.player('chris').stats.numberOfGamesWon).toBe(1);
    expect(result.playerStore.player('dealer').stats.numberOfGamesLost).toBe(1);
  });

  it('lets the dealer win with a natural', () => {
    const dealt = dealHands(startDefaultGame(), ['Spade_10', 'Heart_9'], ['Club_14', 'Diamond_11']);
    expect(dealt.gameStatus).toBe(GameStatus.DealerWins);
    expect(settle(dealt).playerStore.player('dealer').bank).toBe(1025);
  });

  it('settles a round only once', () => {
    const dealt = dealHands(startDefaultGame(), ['Spade_14', 'Heart_13'], ['Club_10', 'Diamond_7']);
    const once = settle(dealt);
    const twice = settle(once);
    expect(twice.playerStore.player('chris').bank).toBe(1037);
    expect(twice.playerStore.player('chris').stats.numberOfGamesPlayed).toBe(1);
  });

  it('keeps stats across rounds', () => {
    const first = settle(dealHands(startDefaultGame(), ['Spade_14', 'Heart_13'], ['Club_10', 'Diamond_7']));
    const second = gameReducer(first, { type: GameAction.NewRound });
    expect(second.playerStore.player('chris').stats.numberOfGamesWon).toBe(1);
  });

  it('doubles down: doubles the stake, draws one card, and passes to the dealer', () => {
    let state = dealHands(startDefaultGame(), ['Spade_5', 'Heart_6'], ['Club_10', 'Diamond_7']);
    state.deck.cards = [new PlayingCard('Club_9')];

    state = gameReducer(state, { type: GameAction.DoubleDown, playerKey: 'chris' });

    expect(state.deck.playerHands.chris.cards).toEqual(['Spade_5', 'Heart_6', 'Club_9']);
    expect(state.playerStore.player('chris').bank).toBe(950);
    expect(state.pot).toBe(75);
    expect(state.playerStore.player('chris').isStaying).toBe(true);
    expect(state.dealerHasControl).toBe(true);
    expect(state.activityLog.some((entry) => entry.event === 'double')).toBe(true);
  });

  it('ends the round when a double down busts', () => {
    let state = dealHands(startDefaultGame(), ['Spade_10', 'Heart_6'], ['Club_10', 'Diamond_7']);
    state.deck.cards = [new PlayingCard('Club_9')];

    state = gameReducer(state, { type: GameAction.DoubleDown, playerKey: 'chris' });

    expect(state.gameStatus).toBe(GameStatus.DealerWins);
    expect(settle(state).playerStore.player('dealer').bank).toBe(1050);
  });

  it('rejects double down after a hit', () => {
    let state = dealHands(startDefaultGame(), ['Spade_2', 'Heart_3'], ['Club_10', 'Diamond_7']);
    state.deck.cards = [new PlayingCard('Club_4'), new PlayingCard('Club_5')];
    state = gameReducer(state, { type: GameAction.Draw, playerKey: 'chris', deckSide: 'top', numberOfCards: 1 });

    const result = gameReducer(state, { type: GameAction.DoubleDown, playerKey: 'chris' });

    expect(result.deck.playerHands.chris.cards).toHaveLength(3);
    expect(result.pot).toBe(50);
  });
});
