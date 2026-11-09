import { PlayerStore } from '../classes/PlayerStore';
import { PlayingCard } from '../classes/PlayingCard';
import { PlayingCardDeck } from '../classes/PlayingCardDeck';
import { gameDefaults } from '../context';
import { GameAction, GameStatus } from '../enums';
import { GameState } from '../types';
import { gameReducer } from './gameReducer';
import { defaultProfileState, seatsFor } from './profiles';
import { canDoubleDown, canSplit, decideSeatMove } from './round';
import { handValue } from './getHandValue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createGameState = (): GameState => ({
  ...gameDefaults,
  deck: new PlayingCardDeck(),
  playerStore: new PlayerStore(),
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
    // the dealer does not ante; each hand is played against the dealer's bank
    expect(result.playerStore.player('dealer').bank).toBe(1000);
    expect(result.pot).toBe(25);
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
    expect(nextDeal.pot).toBe(25);
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

    // first game: game started, the human's ante, one wager; second game: game started
    expect(secondGame.activityLog.map((entry) => entry.sessionId)).toEqual([1, 1, 1, 2]);
    expect(secondGame.activityLog.map((entry) => entry.id)).toEqual([1, 2, 3, 4]);
    expect(secondGame.activityLog.at(-1)).toMatchObject({ event: 'game', description: 'Game started' });
    expect(firstGame.activityLog).toHaveLength(2);
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
    state.deck.playerHands.chris.cards = ['Club_10', 'Heart_7'];
    state.deck.playerHands.dealer.cards = ['Spade_10', 'Diamond_5'];

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

    expect(result.gameStatus).toBe(GameStatus.RoundOver);
    expect(result.playerStore.player('chris').result).toBe('push');
    expect(result.dealerHasControl).toBe(false);
  });

  it('ends the round when the dealer busts on a draw, and every hand still in play wins', () => {
    const state = startDefaultGame();
    state.deck.playerHands.chris.cards = ['Club_10', 'Heart_8'];
    state.playerStore.player('chris').isStaying = true;
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
    expect(result.gameStatus).toBe(GameStatus.RoundOver);
    expect(result.playerStore.player('chris').result).toBe('win');
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
    expect(result.pot).toBe(50);
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

    expect(dealt.gameStatus).toBe(GameStatus.RoundOver);
    expect(dealt.playerStore.player('chris').result).toBe('push');

    const result = settle(dealt);
    expect(result.playerStore.player('chris').bank).toBe(1000);
    expect(result.playerStore.player('dealer').bank).toBe(1000);
    expect(result.activityLog.filter((entry) => entry.event === 'push').map((entry) => entry.amount)).toEqual([25, 0]);
  });

  it('records every bank movement, so the logged amounts add up to each bank change', () => {
    let state = dealHands(startDefaultGame(), ['Spade_10', 'Heart_9'], ['Club_10', 'Diamond_7']);
    state = gameReducer(state, { type: GameAction.Stay, playerKey: 'chris' });
    state = gameReducer(state, { type: GameAction.Stay, playerKey: 'dealer' });
    state = settle(state);

    expect(state.activityLog.find((entry) => entry.event === 'win')).toMatchObject({ name: 'Chris', description: 'won $25', amount: 50 });
    for (const key of ['chris', 'dealer']) {
      const player = state.playerStore.player(key);
      const logged = state.activityLog
        .filter((entry) => entry.name === player.title)
        .reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
      expect(logged).toBe(player.bank - 1000);
    }
  });

  it('pays a natural blackjack 3:2 from the dealer', () => {
    const dealt = dealHands(startDefaultGame(), ['Spade_14', 'Heart_13'], ['Club_10', 'Diamond_7']);
    expect(dealt.gameStatus).toBe(GameStatus.RoundOver);
    expect(dealt.playerStore.player('chris').result).toBe('blackjack');

    const result = settle(dealt);
    // Chris: 975 + stake 25 + floor(25 * 1.5) = 1037; Dealer: 1000 - 37 = 963
    expect(result.playerStore.player('chris').bank).toBe(1037);
    expect(result.playerStore.player('dealer').bank).toBe(963);
    expect(result.playerStore.player('chris').stats.numberOfTimesBlackjack).toBe(1);
    expect(result.playerStore.player('chris').stats.numberOfGamesWon).toBe(1);
    expect(result.playerStore.player('dealer').stats.numberOfGamesLost).toBe(1);
  });

  it('lets the dealer win with a natural', () => {
    const dealt = dealHands(startDefaultGame(), ['Spade_10', 'Heart_9'], ['Club_14', 'Diamond_11']);
    expect(dealt.gameStatus).toBe(GameStatus.RoundOver);
    expect(dealt.playerStore.player('chris').result).toBe('loss');
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
    expect(state.pot).toBe(50);
    expect(state.playerStore.player('chris').isStaying).toBe(true);
    expect(state.dealerHasControl).toBe(true);
    expect(state.activityLog.some((entry) => entry.event === 'double')).toBe(true);
  });

  it('ends the round when a double down busts', () => {
    let state = dealHands(startDefaultGame(), ['Spade_10', 'Heart_6'], ['Club_10', 'Diamond_7']);
    state.deck.cards = [new PlayingCard('Club_9')];

    state = gameReducer(state, { type: GameAction.DoubleDown, playerKey: 'chris' });

    expect(state.gameStatus).toBe(GameStatus.RoundOver);
    expect(state.playerStore.player('chris').result).toBe('loss');
    expect(settle(state).playerStore.player('dealer').bank).toBe(1050);
  });

  it('rejects double down after a hit', () => {
    let state = dealHands(startDefaultGame(), ['Spade_2', 'Heart_3'], ['Club_10', 'Diamond_7']);
    state.deck.cards = [new PlayingCard('Club_4'), new PlayingCard('Club_5')];
    state = gameReducer(state, { type: GameAction.Draw, playerKey: 'chris', deckSide: 'top', numberOfCards: 1 });

    const result = gameReducer(state, { type: GameAction.DoubleDown, playerKey: 'chris' });

    expect(result.deck.playerHands.chris.cards).toHaveLength(3);
    expect(result.pot).toBe(25);
  });
});

/** Start a game with the given computer players; Math.random is fixed so wagers are predictable */
const startWithBots = (opponentIds: string[], random = 0.99): GameState => {
  vi.spyOn(Math, 'random').mockReturnValue(random);
  const started = gameReducer(createGameState(), { type: GameAction.NewGame, players: seatsFor({ ...defaultProfileState(), opponentIds }) });
  return gameReducer(started, { type: GameAction.EvaluateGame, gameStatus: GameStatus.InProgress });
};

/** Unused cards under the stacked ones, so a new round does not reshuffle the stack away */
const FILLER = Array.from({ length: 30 }, () => 'Club_2');

/** Stack the deck so each seat, in turn order, is dealt the given hand; later draws come from `draws` in order */
const dealSeats = (state: GameState, hands: string[][], draws: string[] = []): GameState => {
  state.deck.cards = [...FILLER, ...[...draws].reverse(), ...hands.flat().reverse()].map((key) => new PlayingCard(key));
  return gameReducer(state, { type: GameAction.Deal });
};

const stay = (state: GameState, playerKey: string) => gameReducer(state, { type: GameAction.Stay, playerKey });
const hit = (state: GameState, playerKey: string) => gameReducer(state, { type: GameAction.Draw, playerKey, deckSide: 'top', numberOfCards: 1 });

describe('split hands', () => {
  it('splits an exact-rank pair for an equal stake and plays each hand in turn', () => {
    let state = dealSeats(startDefaultGame(), [['Club_8', 'Heart_8'], ['Club_10', 'Diamond_8']], ['Spade_10', 'Spade_9']);

    expect(canSplit(state, 'chris')).toBe(true);
    state = gameReducer(state, { type: GameAction.Split, playerKey: 'chris' });

    expect(state.deck.getHands('chris').map((hand) => hand.cards)).toEqual([
      ['Club_8', 'Spade_10'],
      ['Heart_8', 'Spade_9'],
    ]);
    expect(state.deck.getHands('chris').map((hand) => hand.stake)).toEqual([25, 25]);
    expect(state.playerStore.player('chris').bank).toBe(950);
    expect(state.pot).toBe(50);
    expect(state.controllingPlayer).toBe('chris');
    expect(state.activeHandIndex).toBe(0);
    expect(canDoubleDown(state, 'chris')).toBe(false);

    state = stay(state, 'chris');
    expect(state.controllingPlayer).toBe('chris');
    expect(state.activeHandIndex).toBe(1);
    expect(canSplit(state, 'chris')).toBe(false);
  });

  it('keeps a second hand in play when the first hand busts', () => {
    let state = dealSeats(startDefaultGame(), [['Club_8', 'Heart_8'], ['Club_10', 'Diamond_8']], ['Spade_10', 'Spade_9', 'Diamond_5']);
    state = gameReducer(state, { type: GameAction.Split, playerKey: 'chris' });

    state = hit(state, 'chris');

    expect(state.deck.getHand('chris', 0).handValue.highest).toBe(23);
    expect(state.deck.hand('chris', 0)?.result).toBe('loss');
    expect(state.playerStore.player('chris').isBusted).toBe(false);
    expect(state.playerStore.player('chris').result).toBeUndefined();
    expect(state.controllingPlayer).toBe('chris');
    expect(state.activeHandIndex).toBe(1);
  });

  it('stands split aces after one card each and does not award a natural for 21', () => {
    let state = dealSeats(startDefaultGame(), [['Club_14', 'Heart_14'], ['Club_10', 'Diamond_7']], ['Spade_10', 'Spade_8']);
    state = gameReducer(state, { type: GameAction.Split, playerKey: 'chris' });

    expect(state.deck.getHands('chris').map((hand) => hand.cards)).toEqual([
      ['Club_14', 'Spade_10'],
      ['Heart_14', 'Spade_8'],
    ]);
    expect(state.deck.getHands('chris').every((hand) => hand.isSplitAces && hand.isStaying)).toBe(true);
    expect(state.deck.hand('chris', 0)?.isBlackjack).not.toBe(true);
    expect(state.controllingPlayer).toBe('dealer');
    expect(canSplit(state, 'chris')).toBe(false);

    state = stay(state, 'dealer');
    state = settle(state);
    expect(state.deck.getHand('chris', 0).handValue.highest).toBe(21);
    expect(state.deck.getHands('chris').map((hand) => hand.result)).toEqual(['win', 'win']);
    expect(state.playerStore.player('chris').stats.numberOfTimesBlackjack).toBe(0);
    expect(state.playerStore.player('chris').stats.numberOfGamesPlayed).toBe(2);
  });

  it('settles mixed outcomes and counts each hand in the statistics', () => {
    let state = dealSeats(startDefaultGame(), [['Club_8', 'Heart_8'], ['Club_10', 'Diamond_8']], ['Spade_10', 'Spade_9', 'Diamond_2']);
    state = gameReducer(state, { type: GameAction.Split, playerKey: 'chris' });
    state = hit(state, 'chris');
    state = stay(state, 'chris');
    state = stay(state, 'chris');
    state = stay(state, 'dealer');
    state = settle(state);

    expect(state.deck.getHands('chris').map((hand) => hand.result)).toEqual(['win', 'loss']);
    expect(state.playerStore.player('chris').bank).toBe(1000);
    expect(state.playerStore.player('chris').stats).toMatchObject({
      numberOfGamesPlayed: 2,
      numberOfGamesWon: 1,
      numberOfGamesLost: 1,
    });
    expect(state.playerStore.player('dealer').bank).toBe(1000);
  });

  it('does not treat different ten-value ranks as a pair', () => {
    const state = dealSeats(startDefaultGame(), [['Club_10', 'Heart_13'], ['Club_10', 'Diamond_8']]);
    expect(canSplit(state, 'chris')).toBe(false);
  });
});

describe('computer players', () => {
  it('seats the human, then the computer players, then the dealer, and only players ante', () => {
    const state = startWithBots(['ogion', 'shevek']);

    expect(state.playerStore.activePlayerKeys).toEqual(['chris', 'ogion', 'shevek', 'dealer']);
    expect(state.playerStore.player('ogion')).toMatchObject({ role: 'bot', title: 'Ogion', isNPC: true });
    expect(state.playerStore.player('dealer')).toMatchObject({ role: 'dealer', title: 'Faxe' });
    expect(state.playerStore.player('dealer').bank).toBe(1000);
    // Ogion (aggression 2) only antes; Shevek (aggression 7) adds one wager
    expect(state.playerStore.player('ogion').bank).toBe(975);
    expect(state.playerStore.player('shevek').bank).toBe(950);
    expect(state.pot).toBe(100);
  });

  it('passes the turn from seat to seat, then to the dealer', () => {
    let state = dealSeats(startWithBots(['ogion', 'shevek']), [['Club_10', 'Heart_7'], ['Club_9', 'Heart_8'], ['Spade_10', 'Heart_9'], ['Diamond_10', 'Spade_7']]);
    expect(state.controllingPlayer).toBe('chris');

    state = stay(state, 'chris');
    expect(state.controllingPlayer).toBe('ogion');
    state = stay(state, 'ogion');
    expect(state.controllingPlayer).toBe('shevek');
    state = stay(state, 'shevek');
    expect(state.controllingPlayer).toBe('dealer');
    expect(state.dealerHasControl).toBe(true);

    state = stay(state, 'dealer');
    expect(state.gameStatus).toBe(GameStatus.RoundOver);
    // dealer 17: Chris 17 pushes, Ogion 17 pushes, Shevek 19 wins
    expect(['chris', 'ogion', 'shevek'].map((key) => state.playerStore.player(key).result)).toEqual(['push', 'push', 'win']);
  });

  it('keeps the round going when a player busts', () => {
    let state = dealSeats(startWithBots(['ogion']), [['Club_10', 'Heart_6'], ['Club_9', 'Heart_8'], ['Diamond_10', 'Spade_7']], ['Spade_9']);

    state = hit(state, 'chris');

    expect(state.playerStore.player('chris')).toMatchObject({ isBusted: true, result: 'loss' });
    expect(state.gameStatus).toBe(GameStatus.InProgress);
    expect(state.controllingPlayer).toBe('ogion');
  });

  it('ends the round without the dealer drawing when every player has busted', () => {
    let state = dealSeats(startWithBots(['ogion']), [['Club_10', 'Heart_6'], ['Club_9', 'Heart_8'], ['Diamond_10', 'Spade_2']], ['Spade_9', 'Club_8']);

    state = hit(state, 'chris');
    state = hit(state, 'ogion');

    expect(state.gameStatus).toBe(GameStatus.RoundOver);
    expect(state.deck.playerHands.dealer.cards).toHaveLength(2);
    expect(state.playerStore.player('dealer').result).toBe('win');
  });

  it('skips a seat dealt a natural, which wins 3:2', () => {
    const state = dealSeats(startWithBots(['ogion']), [['Spade_14', 'Heart_13'], ['Club_9', 'Heart_8'], ['Diamond_10', 'Spade_7']]);

    expect(state.playerStore.player('chris').result).toBe('blackjack');
    expect(state.controllingPlayer).toBe('ogion');
    expect(state.gameStatus).toBe(GameStatus.InProgress);
  });

  it('ends the round at once on a dealer natural: player naturals push, every other hand loses', () => {
    const state = dealSeats(startWithBots(['ogion']), [['Spade_14', 'Heart_13'], ['Club_9', 'Heart_8'], ['Diamond_14', 'Spade_12']]);

    expect(state.gameStatus).toBe(GameStatus.RoundOver);
    expect(state.playerStore.player('chris').result).toBe('push');
    expect(state.playerStore.player('ogion').result).toBe('loss');
  });

  it('settles every hand against the dealer, and the dealer takes the other side', () => {
    let state = dealSeats(startWithBots(['ogion', 'shevek']), [['Spade_14', 'Heart_13'], ['Club_10', 'Heart_9'], ['Spade_10', 'Heart_6'], ['Diamond_10', 'Spade_8']]);
    state = stay(state, 'ogion');
    state = stay(state, 'shevek');
    state = stay(state, 'dealer');
    state = settle(state);

    // Chris: natural on $25 wins $37; Ogion: 19 beats 18 on $25; Shevek: 16 loses $50 (ante and one wager)
    expect(state.playerStore.player('chris').bank).toBe(1037);
    expect(state.playerStore.player('ogion').bank).toBe(1025);
    expect(state.playerStore.player('shevek').bank).toBe(950);
    expect(state.playerStore.player('dealer').bank).toBe(1000 - 37 - 25 + 50);
    expect(state.playerStore.player('dealer').result).toBe('loss');
    expect(state.playerStore.player('ogion').stats.numberOfGamesWon).toBe(1);
    expect(state.playerStore.player('shevek').lossStreak).toBe(1);
  });

  it('sits out a computer player who cannot cover the ante, and deals them no hand', () => {
    let state = startWithBots(['ogion']);
    state = dealSeats(state, [['Club_10', 'Heart_7'], ['Club_9', 'Heart_8'], ['Diamond_10', 'Spade_7']]);
    state.playerStore.player('ogion').bank = 10;

    state = dealSeats(state, [['Club_10', 'Heart_7'], ['Diamond_10', 'Spade_7']]);

    expect(state.playerStore.player('ogion').isSittingOut).toBe(true);
    expect(state.deck.playerHands.ogion.cards).toEqual([]);
    state = stay(state, 'chris');
    expect(state.controllingPlayer).toBe('dealer');
  });

  it('reshuffles a fresh deck between rounds when it runs low', () => {
    let state = dealSeats(startWithBots(['ogion']), [['Club_10', 'Heart_7'], ['Club_9', 'Heart_8'], ['Diamond_10', 'Spade_7']]);
    state.deck.cards = state.deck.cards.slice(0, 10);
    state = gameReducer(state, { type: GameAction.NewRound });

    expect(state.deck.length).toBe(52);
    expect(state.activityLog.some((entry) => entry.event === 'shuffle')).toBe(true);
  });

  it('reshuffles the cards not in play when the deck runs dry mid-round', () => {
    let state = dealSeats(startWithBots(['ogion']), [['Club_2', 'Heart_3'], ['Club_4', 'Heart_5'], ['Diamond_10', 'Spade_7']]);
    state.deck.cards = [];

    state = hit(state, 'chris');

    const inHands = Object.values(state.deck.playerHands).flatMap((hand) => hand.cards);
    expect(state.deck.playerHands.chris.cards).toHaveLength(3);
    expect(state.deck.length + inHands.length).toBe(52);
    expect(new Set(inHands).size).toBe(inHands.length);
  });

  it('decides computer moves from character stats and the dealer upcard', () => {
    const state = dealSeats(startWithBots(['ogion', 'genly-ai']), [['Club_10', 'Heart_7'], ['Club_10', 'Heart_3'], ['Spade_10', 'Heart_6'], ['Diamond_10', 'Spade_6']]);
    // with no discipline roll (random 0.99), each goes on instinct
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(decideSeatMove(state, 'ogion')).toBe('stay'); // The Rock stands on 13
    expect(decideSeatMove(state, 'genly-ai')).toBe('hit'); // The Tourist hits 16
    expect(decideSeatMove(state, 'dealer')).toBe('hit'); // the dealer hits 16
  });
  describe('changing the roster', () => {
    // chris has blackjack, ogion 17, the dealer 17: the round is over and settled
    const overWithOgion = () => {
      const dealt = dealSeats(startWithBots(['ogion']), [['Spade_14', 'Heart_13'], ['Club_10', 'Heart_7'], ['Club_10', 'Diamond_7']]);
      return stay(stay(dealt, 'ogion'), 'dealer');
    };
    const settledWithOgion = () => settle(overWithOgion());
    const roster = (opponentIds: string[], selectedId = 'chris') => seatsFor({ ...defaultProfileState(), opponentIds, selectedId });

    it('ignores a new roster while a hand is in play', () => {
      const inPlay = dealSeats(startWithBots(['ogion']), [['Club_10', 'Heart_6'], ['Club_10', 'Heart_7'], ['Club_10', 'Diamond_7']]);
      expect(inPlay.gameStatus).toBe(GameStatus.InProgress);

      const state = gameReducer(inPlay, { type: GameAction.SetRoster, players: roster(['shevek']) });

      expect(state.playerStore.activePlayerKeys).toEqual(['chris', 'ogion', 'dealer']);
      expect(Object.keys(state.deck.playerHands).sort()).toEqual(['chris', 'dealer', 'ogion']);
    });

    it('waits until the round is settled', () => {
      const unsettled = overWithOgion();
      expect(unsettled.gameStatus).toBe(GameStatus.RoundOver);
      expect(unsettled.gameStatusFlag).toBe(false);

      const state = gameReducer(unsettled, { type: GameAction.SetRoster, players: roster([]) });

      expect(state.playerStore.activePlayerKeys).toEqual(['chris', 'ogion', 'dealer']);
    });

    it('seats the new roster between hands, keeping the bank and stats of those who stay', () => {
      const settled = settledWithOgion();
      const chris = { ...settled.playerStore.player('chris') };

      const state = gameReducer(settled, { type: GameAction.SetRoster, players: roster(['shevek', 'haber']) });

      expect(state.playerStore.activePlayerKeys).toEqual(['chris', 'shevek', 'haber', 'dealer']);
      expect(state.playerStore.player('chris').bank).toBe(chris.bank);
      expect(state.playerStore.player('chris').stats).toEqual(chris.stats);
      expect(state.playerStore.player('shevek')).toMatchObject({ role: 'bot', bank: 1000 });
      expect(Object.keys(state.deck.playerHands).sort()).toEqual(['chris', 'dealer', 'haber', 'shevek']);
      expect(state.activityLog[state.activityLog.length - 1].description).toBe('Players changed: Shevek, Haber joined; Ogion left');
      // the finished round is still settled
      expect(state.gameStatus).toBe(GameStatus.RoundOver);
      expect(state.gameStatusFlag).toBe(true);
    });

    it('swaps the human player and deals the next hand to the new roster', () => {
      const profiles = { ...defaultProfileState(), opponentIds: ['ogion'] };
      profiles.profiles = [...profiles.profiles, { id: 'player-9', name: 'Sam', createdAt: 1, stats: { ...profiles.profiles[0].stats } }];
      const settled = settledWithOgion();

      let state = gameReducer(settled, { type: GameAction.SetRoster, players: seatsFor({ ...profiles, selectedId: 'player-9' }) });
      expect(state.playerStore.activePlayerKeys).toEqual(['player-9', 'ogion', 'dealer']);
      expect(state.playerStore.player('player-9')).toMatchObject({ role: 'human', title: 'Sam', bank: 1000 });

      state = dealSeats(state, [['Club_10', 'Heart_6'], ['Club_10', 'Heart_7'], ['Club_10', 'Diamond_7']]);
      expect(state.round).toBe(2);
      expect(state.controllingPlayer).toBe('player-9');
      expect(state.deck.playerHands['player-9'].cards).toHaveLength(2);
    });

    it('does nothing when the roster has not changed', () => {
      const settled = settledWithOgion();
      const logLength = settled.activityLog.length;

      const state = gameReducer(settled, { type: GameAction.SetRoster, players: roster(['ogion']) });

      expect(state.activityLog).toHaveLength(logLength);
    });
  });
});
