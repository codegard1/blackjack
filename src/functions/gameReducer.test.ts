import { gameDefaults } from '../context';
import { GameAction, GameStatus } from '../enums';
import { GameReducerAction } from '../interfaces';
import { GameState, TableRules, defaultTableRules } from '../types';
import { recordActivity } from './activity';
import { buildCardKeys } from './cards';
import {
  createDeck, getPlayerHand, getPlayerHands, getPlayerHandValue, updateHand, updateHandValue,
} from './deck';
import { evaluateGame } from './evaluateGame';
import { gameReducer } from './gameReducer';
import { gameSnapshot } from './persistence';
import {
  activePlayerKeys, allPlayers, createPlayerStore, getPlayer, playerCount, setCurrentPlayer, updatePlayer,
} from './playerStore';
import { defaultProfileState, seatsFor } from './profiles';
import { applyRoster, canDoubleDown, canInsurance, canSplit, canSurrender, configureCharacterWork, decideSeatMove, reshuffleIfLow, setControl } from './round';
import { handValue } from './getHandValue';
import { seatStatus } from './seatStatus';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createGameState = (): GameState => ({
  ...gameDefaults,
  deck: createDeck(),
  playerStore: createPlayerStore(),
});

const startDefaultGame = (): GameState => {
  const started = gameReducer(createGameState(), {
    type: GameAction.NewGame,
    playerKeys: ['chris', 'dealer'],
  });
  return gameReducer(started, { type: GameAction.EvaluateGame });
};

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'time').mockImplementation(() => {});
  vi.spyOn(console, 'timeEnd').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('configurable table rules', () => {
  const startWithRules = (rules: Partial<TableRules> = {}) => {
    const state = gameReducer(createGameState(), {
      type: GameAction.NewGame, playerKeys: ['chris', 'dealer'],
      tableRules: { ...defaultTableRules, ...rules },
    });
    return gameReducer(state, { type: GameAction.EvaluateGame });
  };

  it.each(['2', '6', '8'] as const)('builds a %s-deck shoe and scales the reshuffle threshold', (numberOfDecks) => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    let state = startWithRules({ numberOfDecks });
    const size = Number(numberOfDecks) * 52;
    expect(state.deck.cardKeys.length).toBe(size);
    expect(new Set(state.deck.cardKeys).size).toBe(size);
    expect(state.deck.cardKeys).toEqual(buildCardKeys(Number(numberOfDecks)));

    const threshold = 2 * 6 * Number(numberOfDecks);
    state.deck = { ...state.deck, cardKeys: state.deck.cardKeys.slice(0, threshold) };
    state = gameReducer(state, { type: GameAction.NewRound });
    expect(state.deck.cardKeys.length).toBe(threshold);
    state.deck = { ...state.deck, cardKeys: state.deck.cardKeys.slice(0, -1) };
    state = gameReducer(state, { type: GameAction.NewRound });
    expect(state.deck.cardKeys.length).toBe(size);
  });

  it.each([
    { dealerSoft17: 'stand', net: 25, cards: 2 },
    { dealerSoft17: 'hit', net: 0, cards: 3 },
  ] as const)('settles a fixed soft-17 hand with dealer set to $dealerSoft17', ({ dealerSoft17, net, cards }) => {
    let state = startWithRules({ dealerSoft17 });
    state.deck = { ...state.deck, cardKeys: ['Club_2', 'Heart_6', 'Diamond_14', 'Spade_9', 'Club_10'] };
    state = gameReducer(state, { type: GameAction.Deal });
    state = gameReducer(state, { type: GameAction.Stay, playerKey: 'chris' });
    expect(decideSeatMove(state, 'dealer')).toBe(dealerSoft17 === 'hit' ? 'hit' : 'stay');
    if (dealerSoft17 === 'hit') state = gameReducer(state, { type: GameAction.Draw, playerKey: 'dealer', numberOfCards: 1 });
    state = gameReducer(state, { type: GameAction.Stay, playerKey: 'dealer' });
    state = gameReducer(state, { type: GameAction.EvaluateGame });
    expect(getPlayerHand(state.deck, 'dealer')?.cards).toHaveLength(cards);
    expect(state.playerStore.players.chris.bank).toBe(1000 + net);
    expect(state.playerStore.players.dealer.bank).toBe(1000 - net);
    expect(state.gameStatusFlag).toBe(true);
  });

  it.each([
    ['Club_10', 'Heart_7'],
    ['Club_14', 'Heart_6', 'Spade_10'],
    ['Club_14', 'Heart_7'],
  ])('does not hit a hard 17 or a soft 18 under hit-soft-17 rules (%j)', (...cards) => {
    const state = startWithRules({ dealerSoft17: 'hit' });
    state.deck = updateHand(state.deck, 'dealer', 0, (h) => ({ ...h, cards }));
    expect(decideSeatMove(state, 'dealer')).toBe('stay');
  });

  it('pays a fixed natural 6:5 on both sides of the bank and settles only once', () => {
    let state = startWithRules({ blackjackPayout: '6:5' });
    state.deck = { ...state.deck, cardKeys: ['Club_7', 'Heart_10', 'Diamond_14', 'Spade_10'] };
    state = gameReducer(state, { type: GameAction.Deal });
    expect(state.gameStatus).toBe(GameStatus.RoundOver);
    expect(state.playerStore.players.chris.net).toBe(30);
    expect(state.playerStore.players.dealer.net).toBe(-30);
    state = gameReducer(state, { type: GameAction.EvaluateGame });
    state = gameReducer(state, { type: GameAction.EvaluateGame });
    expect(state.playerStore.players.chris.bank).toBe(1030);
    expect(state.playerStore.players.dealer.bank).toBe(970);
    expect(state.playerStore.players.chris.stats.totalWinnings).toBe(30);
  });

  it('keeps the active rules until the next hand, then rebuilds a changed shoe', () => {
    let state = startWithRules();
    state.deck = { ...state.deck, cardKeys: ['Club_7', 'Heart_10', 'Diamond_9', 'Spade_10'] };
    state = gameReducer(state, { type: GameAction.Deal });
    const tableRules: TableRules = { numberOfDecks: '2', dealerSoft17: 'hit', blackjackPayout: '6:5' };
    // a move during a hand has no place for table rules: the action's type does not take them
    state = gameReducer(state, { type: GameAction.Stay, playerKey: 'chris' });
    expect(state.tableRules).toEqual(defaultTableRules);
    state = gameReducer(state, { type: GameAction.Stay, playerKey: 'dealer' });
    state = gameReducer(state, { type: GameAction.EvaluateGame });
    expect(state.playerStore.players.chris.bank).toBe(1025);
    state = gameReducer(state, { type: GameAction.Deal, tableRules });
    expect(state.tableRules).toEqual(tableRules);
    expect(state.round).toBe(2);
    expect(state.deck.cardKeys.length).toBe(100);
    expect(getPlayerHands(state.deck, 'chris')[0].cards).toHaveLength(2);
  });

  it('splits matching ranks across decks and recognizes split aces', () => {
    let state = startWithRules({ numberOfDecks: '2' });
    state.deck = {
      ...state.deck,
      cardKeys: ['Spade_10_2', 'Spade_10', 'Club_7', 'Heart_10', 'Diamond_14_2', 'Diamond_14'],
    };
    state = gameReducer(state, { type: GameAction.Deal });
    expect(canSplit(state, 'chris')).toBe(true);
    state = gameReducer(state, { type: GameAction.Split, playerKey: 'chris' });
    expect(getPlayerHands(state.deck, 'chris').map((hand) => hand.cards)).toEqual([
      ['Diamond_14', 'Spade_10'], ['Diamond_14_2', 'Spade_10_2'],
    ]);
    expect(getPlayerHands(state.deck, 'chris').every((hand) => hand.isSplitAces && hand.isStaying && !hand.isBlackjack)).toBe(true);
  });

  it('refills a multi-deck shoe without reusing copies in any split hand', () => {
    let state = startWithRules({ numberOfDecks: '2' });
    state.deck = { ...state.deck, cardKeys: ['Club_7', 'Heart_10', 'Diamond_8_2', 'Diamond_8'] };
    state = gameReducer(state, { type: GameAction.Deal });
    state = gameReducer(state, { type: GameAction.Split, playerKey: 'chris' });
    const held = allPlayers(state.playerStore).flatMap((player) => getPlayerHands(state.deck, player.key).flatMap((hand) => hand.cards));
    expect(new Set([...held, ...state.deck.cardKeys]).size).toBe(104);
    expect(state.deck.cardKeys.length).toBe(98);
    expect(state.deck.cardKeys.every((key) => !held.includes(key))).toBe(true);
  });
});

describe('game behavior baseline', () => {
  it('starts a game with the selected human and dealer', () => {
    const state = startDefaultGame();

    expect(state.gameStatus).toBe(GameStatus.InProgress);
    expect(state.round).toBe(1);
    expect(activePlayerKeys(state.playerStore)).toEqual(['chris', 'dealer']);
    expect(state.playerStore.currentPlayerKey).toBe('chris');
    expect(state.deck.playerHands.chris.cards).toEqual([]);
    expect(state.deck.playerHands.dealer.cards).toEqual([]);
  });

  it('deals two cards to each player from the top of the deck', () => {
    const state = startDefaultGame();
    state.deck = { ...state.deck, cardKeys: ['Club_2', 'Diamond_5', 'Heart_9', 'Spade_10'] };

    const result = gameReducer(state, { type: GameAction.Deal });

    expect(result.deck.playerHands.chris.cards).toEqual(['Spade_10', 'Heart_9']);
    expect(result.deck.playerHands.dealer.cards).toEqual(['Diamond_5', 'Club_2']);
    expect(result.deck.cardKeys.length).toBe(0);
    expect(result.playerStore.players.chris.bank).toBe(975);
    // the dealer does not ante; each hand is played against the dealer's bank
    expect(result.playerStore.players.dealer.bank).toBe(1000);
    expect(result.pot).toBe(25);
  });

  it('starts a new round instead of appending cards on subsequent deals', () => {
    const state = startDefaultGame();
    state.deck = { ...state.deck, cardKeys: buildCardKeys() };

    const firstDeal = gameReducer(state, { type: GameAction.Deal });
    const firstHand = firstDeal.deck.playerHands.chris.cards.slice();
    const nextDeal = gameReducer(firstDeal, { type: GameAction.Deal });

    expect(firstDeal.round).toBe(1);
    expect(nextDeal.round).toBe(2);
    expect(nextDeal.deck.playerHands.chris.cards).toHaveLength(2);
    expect(nextDeal.deck.playerHands.dealer.cards).toHaveLength(2);
    expect(nextDeal.deck.playerHands.chris.cards).not.toEqual(firstHand);
    expect(nextDeal.playerStore.players.chris.bank).toBe(950);
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
    const secondGame = gameReducer(reset, { type: GameAction.NewGame, playerKeys: ['chris', 'dealer'] });

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
    state.deck = { ...state.deck, cardKeys: ['Club_2', 'Diamond_5', 'Heart_9'] };

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
    state.deck = { ...state.deck, cardKeys: ['Club_2'] };

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
    state.deck = updateHand(state.deck, 'chris', 0, (h) => ({ ...h, cards: ['Club_10', 'Heart_7'] }));
    state.deck = updateHand(state.deck, 'dealer', 0, (h) => ({ ...h, cards: ['Spade_10', 'Diamond_5'] }));

    const result = gameReducer(state, { type: GameAction.Stay, playerKey: 'chris' });

    expect(result.playerStore.players.chris.isStaying).toBe(true);
    expect(result.playerStore.currentPlayerKey).toBe('dealer');
    expect(result.dealerHasControl).toBe(true);
  });

  it('pushes when the dealer stands on an equal total', () => {
    const state = startDefaultGame();
    state.deck = updateHand(state.deck, 'chris', 0, (h) => ({ ...h, cards: ['Club_10', 'Heart_7'] }));
    state.deck = updateHand(state.deck, 'dealer', 0, (h) => ({ ...h, cards: ['Spade_10', 'Diamond_7'] }));
    state.deck = updateHandValue(state.deck, 'chris');
    state.deck = updateHandValue(state.deck, 'dealer');

    const dealerTurn = gameReducer(state, { type: GameAction.Stay, playerKey: 'chris' });
    const result = gameReducer(dealerTurn, { type: GameAction.Stay, playerKey: 'dealer' });

    expect(result.gameStatus).toBe(GameStatus.RoundOver);
    expect(result.playerStore.players.chris.result).toBe('push');
    expect(result.dealerHasControl).toBe(false);
  });

  it('ends the round when the dealer busts on a draw, and every hand still in play wins', () => {
    const state = startDefaultGame();
    state.deck = updateHand(state.deck, 'chris', 0, (h) => ({ ...h, cards: ['Club_10', 'Heart_8'] }));
    state.playerStore = setCurrentPlayer(
      updatePlayer(state.playerStore, 'chris', (p) => ({ ...p, isStaying: true })),
      'dealer',
    );
    state.deck = updateHand(state.deck, 'dealer', 0, (h) => ({ ...h, cards: ['Spade_10', 'Diamond_9'] }));
    state.deck = { ...state.deck, cardKeys: ['Club_5'] };

    const result = gameReducer(state, {
      type: GameAction.Draw,
      playerKey: 'dealer',
      deckSide: 'top',
      numberOfCards: 1,
    });

    expect(result.playerStore.players.dealer.isBusted).toBe(true);
    expect(result.gameStatus).toBe(GameStatus.RoundOver);
    expect(result.playerStore.players.chris.result).toBe('win');
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

    expect(result.playerStore.players.chris.bank).toBe(950);
    expect(result.playerStore.players.chris.lastBet).toBe(25);
    expect(result.playerStore.players.chris.totalBet).toBe(25);
    expect(result.pot).toBe(50);
  });

  it('resets to a fresh game state without retaining players', () => {
    const state = startDefaultGame();

    const result = gameReducer(state, { type: GameAction.ResetGame });

    expect(result).not.toBe(state);
    expect(result.playerStore).not.toBe(state.playerStore);
    expect(playerCount(result.playerStore)).toBe(0);
    expect(result.gameStatus).toBe(GameStatus.Init);
    expect(result.deck.cardKeys.length).toBe(52);
  });

});

const dealHands = (state: GameState, chris: string[], dealer: string[]): GameState => {
  // deal() gives each player two consecutive cards from the top (end of the array)
  const deck = { ...state.deck, cardKeys: [dealer[1], dealer[0], chris[1], chris[0]] };
  return gameReducer({ ...state, deck }, { type: GameAction.Deal });
};

const settle = (state: GameState): GameState =>
  gameReducer(state, { type: GameAction.EvaluateGame });

describe('blackjack rules', () => {
  it('pushes when both players are dealt blackjack and returns stakes', () => {
    const dealt = dealHands(startDefaultGame(), ['Spade_14', 'Heart_13'], ['Club_14', 'Diamond_12']);

    expect(dealt.gameStatus).toBe(GameStatus.RoundOver);
    expect(dealt.playerStore.players.chris.result).toBe('push');

    const result = settle(dealt);
    expect(result.playerStore.players.chris.bank).toBe(1000);
    expect(result.playerStore.players.dealer.bank).toBe(1000);
    expect(result.activityLog.filter((entry) => entry.event === 'push').map((entry) => entry.amount)).toEqual([25, 0]);
  });

  it('records every bank movement, so the logged amounts add up to each bank change', () => {
    let state = dealHands(startDefaultGame(), ['Spade_10', 'Heart_9'], ['Club_10', 'Diamond_7']);
    state = gameReducer(state, { type: GameAction.Stay, playerKey: 'chris' });
    state = gameReducer(state, { type: GameAction.Stay, playerKey: 'dealer' });
    state = settle(state);

    expect(state.activityLog.find((entry) => entry.event === 'win')).toMatchObject({ name: 'Chris', description: 'won $25', amount: 50 });
    for (const key of ['chris', 'dealer']) {
      const player = state.playerStore.players[key];
      const logged = state.activityLog
        .filter((entry) => entry.name === player.title)
        .reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
      expect(logged).toBe(player.bank - 1000);
    }
  });

  it('pays a natural blackjack 3:2 from the dealer', () => {
    const dealt = dealHands(startDefaultGame(), ['Spade_14', 'Heart_13'], ['Club_10', 'Diamond_7']);
    expect(dealt.gameStatus).toBe(GameStatus.RoundOver);
    expect(dealt.playerStore.players.chris.result).toBe('blackjack');

    const result = settle(dealt);
    // Chris: 975 + stake 25 + floor(25 * 1.5) = 1037; Dealer: 1000 - 37 = 963
    expect(result.playerStore.players.chris.bank).toBe(1037);
    expect(result.playerStore.players.dealer.bank).toBe(963);
    expect(result.playerStore.players.chris.stats.numberOfTimesBlackjack).toBe(1);
    expect(result.playerStore.players.chris.stats.numberOfGamesWon).toBe(1);
    expect(result.playerStore.players.dealer.stats.numberOfGamesLost).toBe(1);
  });

  it('lets the dealer win with a natural', () => {
    const dealt = dealHands(startDefaultGame(), ['Spade_10', 'Heart_9'], ['Club_14', 'Diamond_11']);
    expect(dealt.gameStatus).toBe(GameStatus.RoundOver);
    expect(dealt.playerStore.players.chris.result).toBe('loss');
    expect(settle(dealt).playerStore.players.dealer.bank).toBe(1025);
  });

  it('settles a round only once', () => {
    const dealt = dealHands(startDefaultGame(), ['Spade_14', 'Heart_13'], ['Club_10', 'Diamond_7']);
    const once = settle(dealt);
    const twice = settle(once);
    expect(twice.playerStore.players.chris.bank).toBe(1037);
    expect(twice.playerStore.players.chris.stats.numberOfGamesPlayed).toBe(1);
  });

  it('keeps stats across rounds', () => {
    const first = settle(dealHands(startDefaultGame(), ['Spade_14', 'Heart_13'], ['Club_10', 'Diamond_7']));
    const second = gameReducer(first, { type: GameAction.NewRound });
    expect(second.playerStore.players.chris.stats.numberOfGamesWon).toBe(1);
  });

  it('doubles down: doubles the stake, draws one card, and passes to the dealer', () => {
    let state = dealHands(startDefaultGame(), ['Spade_5', 'Heart_6'], ['Club_10', 'Diamond_7']);
    state.deck = { ...state.deck, cardKeys: ['Club_9'] };

    state = gameReducer(state, { type: GameAction.DoubleDown, playerKey: 'chris' });

    expect(state.deck.playerHands.chris.cards).toEqual(['Spade_5', 'Heart_6', 'Club_9']);
    expect(state.playerStore.players.chris.bank).toBe(950);
    expect(state.pot).toBe(50);
    expect(state.playerStore.players.chris.isStaying).toBe(true);
    expect(state.dealerHasControl).toBe(true);
    expect(state.activityLog.some((entry) => entry.event === 'double')).toBe(true);
  });

  it('ends the round when a double down busts', () => {
    let state = dealHands(startDefaultGame(), ['Spade_10', 'Heart_6'], ['Club_10', 'Diamond_7']);
    state.deck = { ...state.deck, cardKeys: ['Club_9'] };

    state = gameReducer(state, { type: GameAction.DoubleDown, playerKey: 'chris' });

    expect(state.gameStatus).toBe(GameStatus.RoundOver);
    expect(state.playerStore.players.chris.result).toBe('loss');
    expect(settle(state).playerStore.players.dealer.bank).toBe(1050);
  });

  it('rejects double down after a hit', () => {
    let state = dealHands(startDefaultGame(), ['Spade_2', 'Heart_3'], ['Club_10', 'Diamond_7']);
    state.deck = { ...state.deck, cardKeys: ['Club_4', 'Club_5'] };
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
  return gameReducer(started, { type: GameAction.EvaluateGame });
};

/** Unused cards under the stacked ones, so a new round does not reshuffle the stack away */
const FILLER = Array.from({ length: 30 }, () => 'Club_2');

/** Stack the deck so each seat, in turn order, is dealt the given hand; later draws come from `draws` in order */
const dealSeats = (state: GameState, hands: string[][], draws: string[] = []): GameState => {
  const deck = { ...state.deck, cardKeys: [...FILLER, ...[...draws].reverse(), ...hands.flat().reverse()] };
  return gameReducer({ ...state, deck }, { type: GameAction.Deal });
};

const stay = (state: GameState, playerKey: string) => gameReducer(state, { type: GameAction.Stay, playerKey });
const hit = (state: GameState, playerKey: string) => gameReducer(state, { type: GameAction.Draw, playerKey, deckSide: 'top', numberOfCards: 1 });

describe('split hands', () => {
  it('splits an exact-rank pair for an equal stake and plays each hand in turn', () => {
    let state = dealSeats(startDefaultGame(), [['Club_8', 'Heart_8'], ['Club_10', 'Diamond_8']], ['Spade_10', 'Spade_9']);

    expect(canSplit(state, 'chris')).toBe(true);
    state = gameReducer(state, { type: GameAction.Split, playerKey: 'chris' });

    expect(getPlayerHands(state.deck, 'chris').map((hand) => hand.cards)).toEqual([
      ['Club_8', 'Spade_10'],
      ['Heart_8', 'Spade_9'],
    ]);
    expect(getPlayerHands(state.deck, 'chris').map((hand) => hand.stake)).toEqual([25, 25]);
    expect(state.playerStore.players.chris.bank).toBe(950);
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

    expect(getPlayerHandValue(state.deck, 'chris', 0).highest).toBe(23);
    expect(getPlayerHand(state.deck, 'chris', 0)?.result).toBe('loss');
    expect(state.playerStore.players.chris.isBusted).toBe(false);
    expect(state.playerStore.players.chris.result).toBeUndefined();
    expect(state.controllingPlayer).toBe('chris');
    expect(state.activeHandIndex).toBe(1);
  });

  it('stands split aces after one card each and does not award a natural for 21', () => {
    let state = dealSeats(startDefaultGame(), [['Club_14', 'Heart_14'], ['Club_10', 'Diamond_7']], ['Spade_10', 'Spade_8']);
    state = gameReducer(state, { type: GameAction.Split, playerKey: 'chris' });

    expect(getPlayerHands(state.deck, 'chris').map((hand) => hand.cards)).toEqual([
      ['Club_14', 'Spade_10'],
      ['Heart_14', 'Spade_8'],
    ]);
    expect(getPlayerHands(state.deck, 'chris').every((hand) => hand.isSplitAces && hand.isStaying)).toBe(true);
    expect(getPlayerHand(state.deck, 'chris', 0)?.isBlackjack).not.toBe(true);
    expect(state.controllingPlayer).toBe('dealer');
    expect(canSplit(state, 'chris')).toBe(false);

    state = stay(state, 'dealer');
    state = settle(state);
    expect(getPlayerHandValue(state.deck, 'chris', 0).highest).toBe(21);
    expect(getPlayerHands(state.deck, 'chris').map((hand) => hand.result)).toEqual(['win', 'win']);
    expect(state.playerStore.players.chris.stats.numberOfTimesBlackjack).toBe(0);
    expect(state.playerStore.players.chris.stats.numberOfGamesPlayed).toBe(2);
  });

  it('settles mixed outcomes and counts each hand in the statistics', () => {
    let state = dealSeats(startDefaultGame(), [['Club_8', 'Heart_8'], ['Club_10', 'Diamond_8']], ['Spade_10', 'Spade_9', 'Diamond_2']);
    state = gameReducer(state, { type: GameAction.Split, playerKey: 'chris' });
    state = hit(state, 'chris');
    state = stay(state, 'chris');
    state = stay(state, 'chris');
    state = stay(state, 'dealer');
    state = settle(state);

    expect(getPlayerHands(state.deck, 'chris').map((hand) => hand.result)).toEqual(['win', 'loss']);
    expect(state.playerStore.players.chris.bank).toBe(1000);
    expect(state.playerStore.players.chris.stats).toMatchObject({
      numberOfGamesPlayed: 2,
      numberOfGamesWon: 1,
      numberOfGamesLost: 1,
    });
    expect(state.playerStore.players.dealer.bank).toBe(1000);
  });

  it('does not treat different ten-value ranks as a pair', () => {
    const state = dealSeats(startDefaultGame(), [['Club_10', 'Heart_13'], ['Club_10', 'Diamond_8']]);
    expect(canSplit(state, 'chris')).toBe(false);
  });

  it('allows resplitting up to four hands when enabled, and blocks a fifth', () => {
    const started = gameReducer(createGameState(), {
      type: GameAction.NewGame,
      playerKeys: ['chris', 'dealer'],
      tableRules: { ...defaultTableRules, resplit: true },
    });
    const evaluated = gameReducer(started, { type: GameAction.EvaluateGame });
    let state = dealSeats(
      evaluated,
      [['Club_8', 'Heart_8'], ['Club_10', 'Diamond_8']],
      ['Spade_8', 'Diamond_2', 'Diamond_8', 'Heart_3', 'Club_8', 'Spade_4', 'Club_5'],
    );

    // Split 1: [8,8] -> [8,8] and [8,2] (2 hands)
    state = gameReducer(state, { type: GameAction.Split, playerKey: 'chris' });
    expect(getPlayerHands(state.deck, 'chris')).toHaveLength(2);
    expect(canSplit(state, 'chris', 0)).toBe(true);

    // Split 2 (on hand 0): -> [8,8], [8,3], [8,2] (3 hands)
    state = gameReducer(state, { type: GameAction.Split, playerKey: 'chris' });
    expect(getPlayerHands(state.deck, 'chris')).toHaveLength(3);
    expect(canSplit(state, 'chris', 0)).toBe(true);

    // Split 3 (on hand 0): -> [8,8], [8,4], [8,3], [8,2] (4 hands = MAX_SPLIT_HANDS)
    state = gameReducer(state, { type: GameAction.Split, playerKey: 'chris' });
    expect(getPlayerHands(state.deck, 'chris')).toHaveLength(4);
    expect(canSplit(state, 'chris', 0)).toBe(false);

    // Resplitting on a non-zero split hand also works when under the limit
    let state2 = dealSeats(
      evaluated,
      [['Club_8', 'Heart_8'], ['Club_10', 'Diamond_8']],
      ['Spade_2', 'Diamond_8', 'Heart_8', 'Club_4'],
    );
    state2 = gameReducer(state2, { type: GameAction.Split, playerKey: 'chris' });
    state2 = stay(state2, 'chris');
    expect(state2.activeHandIndex).toBe(1);
    expect(canSplit(state2, 'chris', 1)).toBe(true);
    state2 = gameReducer(state2, { type: GameAction.Split, playerKey: 'chris' });
    expect(getPlayerHands(state2.deck, 'chris').map((h) => h.cards)).toEqual([
      ['Club_8', 'Spade_2'],
      ['Heart_8', 'Heart_8'],
      ['Diamond_8', 'Club_4'],
    ]);
  });

  it('allows doubling after a split only when doubleAfterSplit is enabled', () => {
    const started = gameReducer(createGameState(), {
      type: GameAction.NewGame,
      playerKeys: ['chris', 'dealer'],
      tableRules: { ...defaultTableRules, doubleAfterSplit: true },
    });
    const evaluated = gameReducer(started, { type: GameAction.EvaluateGame });
    let state = dealSeats(evaluated, [['Club_5', 'Heart_5'], ['Club_10', 'Diamond_8']], ['Spade_6', 'Diamond_4', 'Club_10']);

    state = gameReducer(state, { type: GameAction.Split, playerKey: 'chris' });
    expect(canDoubleDown(state, 'chris', 0)).toBe(true);
    state = gameReducer(state, { type: GameAction.DoubleDown, playerKey: 'chris' });
    expect(getPlayerHand(state.deck, 'chris', 0)?.cards).toEqual(['Club_5', 'Spade_6', 'Club_10']);
    expect(getPlayerHand(state.deck, 'chris', 0)?.stake).toBe(50);
    expect(state.activeHandIndex).toBe(1);
    expect(canDoubleDown(state, 'chris', 1)).toBe(true);
  });
});

describe('computer players', () => {
  it('seats the human, then the computer players, then the dealer, and only players ante', () => {
    const state = startWithBots(['ogion', 'shevek']);

    expect(activePlayerKeys(state.playerStore)).toEqual(['chris', 'ogion', 'shevek', 'dealer']);
    expect(state.playerStore.players.ogion).toMatchObject({ role: 'bot', title: 'Ogion', isNPC: true });
    expect(state.playerStore.players.dealer).toMatchObject({ role: 'dealer', title: 'Faxe' });
    expect(state.playerStore.players.dealer.bank).toBe(1000);
    // Ogion (aggression 2) only antes; Shevek (aggression 7) adds one wager
    expect(state.playerStore.players.ogion.bank).toBe(975);
    expect(state.playerStore.players.shevek.bank).toBe(950);
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
    expect(['chris', 'ogion', 'shevek'].map((key) => state.playerStore.players[key].result)).toEqual(['push', 'push', 'win']);
  });

  it('keeps the round going when a player busts', () => {
    let state = dealSeats(startWithBots(['ogion']), [['Club_10', 'Heart_6'], ['Club_9', 'Heart_8'], ['Diamond_10', 'Spade_7']], ['Spade_9']);

    state = hit(state, 'chris');

    expect(state.playerStore.players.chris).toMatchObject({ isBusted: true, result: 'loss' });
    expect(state.gameStatus).toBe(GameStatus.InProgress);
    expect(state.controllingPlayer).toBe('ogion');
  });

  it('ends the round without the dealer drawing when every player has busted', () => {
    let state = dealSeats(startWithBots(['ogion']), [['Club_10', 'Heart_6'], ['Club_9', 'Heart_8'], ['Diamond_10', 'Spade_2']], ['Spade_9', 'Club_8']);

    state = hit(state, 'chris');
    state = hit(state, 'ogion');

    expect(state.gameStatus).toBe(GameStatus.RoundOver);
    expect(state.deck.playerHands.dealer.cards).toHaveLength(2);
    expect(state.playerStore.players.dealer.result).toBe('win');
  });

  it('skips a seat dealt a natural, which wins 3:2', () => {
    const state = dealSeats(startWithBots(['ogion']), [['Spade_14', 'Heart_13'], ['Club_9', 'Heart_8'], ['Diamond_10', 'Spade_7']]);

    expect(state.playerStore.players.chris.result).toBe('blackjack');
    expect(state.controllingPlayer).toBe('ogion');
    expect(state.gameStatus).toBe(GameStatus.InProgress);
  });

  it('ends the round at once on a dealer natural: player naturals push, every other hand loses', () => {
    const state = dealSeats(startWithBots(['ogion']), [['Spade_14', 'Heart_13'], ['Club_9', 'Heart_8'], ['Diamond_14', 'Spade_12']]);

    expect(state.gameStatus).toBe(GameStatus.RoundOver);
    expect(state.playerStore.players.chris.result).toBe('push');
    expect(state.playerStore.players.ogion.result).toBe('loss');
  });

  it('settles every hand against the dealer, and the dealer takes the other side', () => {
    let state = dealSeats(startWithBots(['ogion', 'shevek']), [['Spade_14', 'Heart_13'], ['Club_10', 'Heart_9'], ['Spade_10', 'Heart_6'], ['Diamond_10', 'Spade_8']]);
    state = stay(state, 'ogion');
    state = stay(state, 'shevek');
    state = stay(state, 'dealer');
    state = settle(state);

    // Chris: natural on $25 wins $37; Ogion: 19 beats 18 on $25; Shevek: 16 loses $50 (ante and one wager)
    expect(state.playerStore.players.chris.bank).toBe(1037);
    expect(state.playerStore.players.ogion.bank).toBe(1025);
    expect(state.playerStore.players.shevek.bank).toBe(950);
    expect(state.playerStore.players.dealer.bank).toBe(1000 - 37 - 25 + 50);
    expect(state.playerStore.players.dealer.result).toBe('loss');
    expect(state.playerStore.players.ogion.stats.numberOfGamesWon).toBe(1);
    expect(state.playerStore.players.shevek.lossStreak).toBe(1);
  });

  it('sits out a computer player who cannot cover the ante, and deals them no hand', () => {
    let state = startWithBots(['ogion']);
    state = dealSeats(state, [['Club_10', 'Heart_7'], ['Club_9', 'Heart_8'], ['Diamond_10', 'Spade_7']]);
    state.playerStore = updatePlayer(state.playerStore, 'ogion', (p) => ({ ...p, bank: 10 }));

    state = dealSeats(state, [['Club_10', 'Heart_7'], ['Diamond_10', 'Spade_7']]);

    expect(state.playerStore.players.ogion.isSittingOut).toBe(true);
    expect(state.deck.playerHands.ogion.cards).toEqual([]);
    state = stay(state, 'chris');
    expect(state.controllingPlayer).toBe('dealer');
  });

  it('reshuffles a fresh deck between rounds when it runs low', () => {
    let state = dealSeats(startWithBots(['ogion']), [['Club_10', 'Heart_7'], ['Club_9', 'Heart_8'], ['Diamond_10', 'Spade_7']]);
    state.deck = { ...state.deck, cardKeys: state.deck.cardKeys.slice(0, 10) };
    state = gameReducer(state, { type: GameAction.NewRound });

    expect(state.deck.cardKeys.length).toBe(52);
    expect(state.activityLog.some((entry) => entry.event === 'shuffle')).toBe(true);
  });

  it('reshuffles the cards not in play when the deck runs dry mid-round', () => {
    let state = dealSeats(startWithBots(['ogion']), [['Club_2', 'Heart_3'], ['Club_4', 'Heart_5'], ['Diamond_10', 'Spade_7']]);
    state.deck = { ...state.deck, cardKeys: [] };

    state = hit(state, 'chris');

    const inHands = Object.values(state.deck.playerHands).flatMap((hand) => hand.cards);
    expect(state.deck.playerHands.chris.cards).toHaveLength(3);
    expect(state.deck.cardKeys.length + inHands.length).toBe(52);
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

      expect(activePlayerKeys(state.playerStore)).toEqual(['chris', 'ogion', 'dealer']);
      expect(Object.keys(state.deck.playerHands).sort()).toEqual(['chris', 'dealer', 'ogion']);
    });

    it('waits until the round is settled', () => {
      const unsettled = overWithOgion();
      expect(unsettled.gameStatus).toBe(GameStatus.RoundOver);
      expect(unsettled.gameStatusFlag).toBe(false);

      const state = gameReducer(unsettled, { type: GameAction.SetRoster, players: roster([]) });

      expect(activePlayerKeys(state.playerStore)).toEqual(['chris', 'ogion', 'dealer']);
    });

    it('seats the new roster between hands, keeping the bank and stats of those who stay', () => {
      const settled = settledWithOgion();
      const chris = { ...settled.playerStore.players.chris };

      const state = gameReducer(settled, { type: GameAction.SetRoster, players: roster(['shevek', 'haber']) });

      expect(activePlayerKeys(state.playerStore)).toEqual(['chris', 'shevek', 'haber', 'dealer']);
      expect(state.playerStore.players.chris.bank).toBe(chris.bank);
      expect(state.playerStore.players.chris.stats).toEqual(chris.stats);
      expect(state.playerStore.players.shevek).toMatchObject({ role: 'bot', bank: 1000 });
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
      expect(activePlayerKeys(state.playerStore)).toEqual(['player-9', 'ogion', 'dealer']);
      expect(state.playerStore.players['player-9']).toMatchObject({ role: 'human', title: 'Sam', bank: 1000 });

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

  describe('away working and character accounts', () => {
    it('sends a broke character to work and shows their away task in seatStatus', () => {
      let state = startWithBots(['haber']);
      state = dealSeats(state, [['Club_10', 'Heart_7'], ['Club_9', 'Heart_8'], ['Diamond_10', 'Spade_7']]);
      state = { ...state, playerStore: updatePlayer(state.playerStore, 'haber', (p) => ({ ...p, bank: 10 })) };

      state = dealSeats(state, [['Club_10', 'Heart_7'], ['Diamond_10', 'Spade_7']]);

      const haber = getPlayer(state.playerStore, 'haber')!;
      expect(haber).toMatchObject({
        bank: 10,
        isSittingOut: true,
        awayTask: 'smashing-rocks',
        isReadyToReturn: false,
      });
      expect(state.botAccounts.haber.work).toEqual({
        status: 'working',
        taskId: 'smashing-rocks',
        daysWorked: 0,
      });
      expect(seatStatus(haber, state.gameStatus)).toEqual({
        text: 'Away: smashing rocks',
        color: 'subtle',
        appearance: 'tint',
      });
      expect(state.activityLog.some((entry) => entry.name === 'Haber' && entry.description === 'left to work: smashing rocks' && entry.event === 'work')).toBe(true);
    });

    it('advances work over hands, records balanceHistory on settle and payday, and waits in ready state when allowReturn is false', () => {
      let state = dealSeats(startWithBots(['genly-ai']), [['Spade_14', 'Heart_13'], ['Club_10', 'Heart_9'], ['Diamond_10', 'Spade_8']]);
      state = stay(state, 'genly-ai');
      state = stay(state, 'dealer');
      state = settle(state);

      // Genly Ai won $25 on Round 1; settleRound records the post-hand balance
      expect(state.botAccounts['genly-ai'].bank).toBe(1025);
      expect(state.botAccounts['genly-ai'].balanceHistory).toEqual([1000, 1025]);

      // Genly goes broke before Round 2 and leaves for 2-day dreaming-trials ($150 pay, $100 threshold)
      state = { ...state, playerStore: updatePlayer(state.playerStore, 'genly-ai', (p) => ({ ...p, bank: 0 })) };
      state = dealSeats(state, [['Club_10', 'Heart_7'], ['Diamond_10', 'Spade_7']]);
      expect(state.botAccounts['genly-ai'].work).toEqual({
        status: 'working',
        taskId: 'dreaming-trials',
        daysWorked: 0,
      });

      // Round 3: 1st hand while away -> daysWorked = 1
      state = dealSeats(state, [['Club_10', 'Heart_7'], ['Diamond_10', 'Spade_7']]);
      expect(state.botAccounts['genly-ai'].work).toEqual({
        status: 'working',
        taskId: 'dreaming-trials',
        daysWorked: 1,
      });
      expect(seatStatus(getPlayer(state.playerStore, 'genly-ai')!, state.gameStatus)).toEqual({
        text: 'Away: dreaming trials',
        color: 'subtle',
        appearance: 'tint',
      });

      // Round 4: 2nd hand while away -> payday (+$150 >= $100 threshold), waits in ready state
      state = dealSeats(state, [['Club_10', 'Heart_7'], ['Diamond_10', 'Spade_7']]);
      expect(state.botAccounts['genly-ai'].bank).toBe(150);
      expect(state.botAccounts['genly-ai'].balanceHistory.at(-1)).toBe(150);
      expect(state.botAccounts['genly-ai'].work).toEqual({
        status: 'ready',
        taskId: 'dreaming-trials',
        daysWorked: 2,
      });
      const genly = getPlayer(state.playerStore, 'genly-ai')!;
      expect(genly).toMatchObject({
        bank: 150,
        isSittingOut: true,
        awayTask: 'dreaming-trials',
        isReadyToReturn: true,
      });
      expect(seatStatus(genly, state.gameStatus)).toEqual({
        text: 'Ready to return',
        color: 'informative',
        appearance: 'tint',
      });
      expect(state.activityLog.some((entry) => entry.name === 'Genly Ai' && entry.description === 'finished sitting for effective dreaming trials and earned $150' && entry.event === 'work')).toBe(true);
      expect(state.activityLog.some((entry) => entry.name === 'Genly Ai' && entry.description === 'has $150 and wants back in' && entry.event === 'work')).toBe(true);
    });

    it('chains a second task when payday leaves the bank below threshold and supports ConfigureWork taskOverride switching and clearing', () => {
      let state = startWithBots(['ogion']);
      // Ignore non-bot keys in ConfigureWork
      expect(gameReducer(state, { type: GameAction.ConfigureWork, playerKey: 'chris', taskOverride: 'smashing-rocks' }).botAccounts.chris).toBeUndefined();

      state = gameReducer(state, { type: GameAction.ConfigureWork, playerKey: 'ogion', taskOverride: 'smashing-rocks' });
      expect(state.botAccounts.ogion.taskOverride).toBe('smashing-rocks');

      // Ogion goes broke and starts his overridden 1-day task (smashing-rocks, +$32 vs $300 threshold)
      state = { ...state, playerStore: updatePlayer(state.playerStore, 'ogion', (p) => ({ ...p, bank: 0 })) };
      state = gameReducer(state, { type: GameAction.NewRound });
      expect(state.botAccounts.ogion.work).toEqual({
        status: 'working',
        taskId: 'smashing-rocks',
        daysWorked: 0,
      });

      // Switch taskOverride while actively working -> resets daysWorked to 0 and logs the switch
      state = gameReducer(state, { type: GameAction.ConfigureWork, playerKey: 'ogion', taskOverride: 'herding-goats' });
      expect(state.botAccounts.ogion.work).toEqual({
        status: 'working',
        taskId: 'herding-goats',
        daysWorked: 0,
      });
      expect(state.activityLog.at(-1)).toMatchObject({
        name: 'Ogion',
        description: 'switched work to herding goats on gont',
        event: 'work',
      });

      // Clear taskOverride with null -> reverts to Ogion's own pick (gobrin-ice)
      state = gameReducer(state, { type: GameAction.ConfigureWork, playerKey: 'ogion', taskOverride: null });
      expect(state.botAccounts.ogion.taskOverride).toBeUndefined();
      expect(state.botAccounts.ogion.work).toEqual({
        status: 'working',
        taskId: 'gobrin-ice',
        daysWorked: 0,
      });

      // Override back to 1-day smashing-rocks and advance 1 round -> earns $32 (< $300), chains into another smashing-rocks
      state = gameReducer(state, { type: GameAction.ConfigureWork, playerKey: 'ogion', taskOverride: 'smashing-rocks' });
      state = gameReducer(state, { type: GameAction.NewRound });
      expect(state.botAccounts.ogion.bank).toBe(32);
      expect(state.botAccounts.ogion.work).toEqual({
        status: 'working',
        taskId: 'smashing-rocks',
        daysWorked: 0,
      });
      expect(state.activityLog.some((entry) => entry.name === 'Ogion' && entry.description === 'started smashing rocks' && entry.event === 'work')).toBe(true);
    });

    it('returns a ready character immediately between hands when allowReturn is enabled, or automatically on payday with immediate ante', () => {
      // Case A: enabling allowReturn between hands while ready
      let state = dealSeats(startWithBots(['haber']), [['Club_10', 'Heart_7'], ['Club_9', 'Heart_8'], ['Diamond_10', 'Spade_7']]);
      state = { ...state, playerStore: updatePlayer(state.playerStore, 'haber', (p) => ({ ...p, bank: 0 })) };
      // Round 2: broke Haber leaves to work on 1-day smashing-rocks
      state = dealSeats(state, [['Spade_14', 'Heart_13'], ['Diamond_10', 'Spade_7']]);
      // Round 3: Haber finishes 1-day smashing-rocks (+$32 >= $25) and waits in ready state; Chris gets blackjack so round is over
      state = dealSeats(state, [['Spade_14', 'Heart_13'], ['Diamond_10', 'Spade_7']]);
      state = settle(state);
      expect(state.botAccounts.haber.work?.status).toBe('ready');

      state = gameReducer(state, { type: GameAction.ConfigureWork, playerKey: 'haber', allowReturn: true });
      expect(state.botAccounts.haber.work).toBeUndefined();
      expect(getPlayer(state.playerStore, 'haber')).toMatchObject({
        bank: 32,
        isSittingOut: false,
        awayTask: undefined,
        isReadyToReturn: false,
      });
      expect(state.activityLog.at(-1)).toMatchObject({
        name: 'Haber',
        description: 'returned to the table with $32',
        event: 'work',
      });

      // Case B: allowReturn already true before payday -> returns on payday and immediately antes into the new round
      let autoState = dealSeats(startWithBots(['haber']), [['Club_10', 'Heart_7'], ['Club_9', 'Heart_8'], ['Diamond_10', 'Spade_7']]);
      autoState = gameReducer(autoState, { type: GameAction.ConfigureWork, playerKey: 'haber', allowReturn: true });
      autoState = { ...autoState, playerStore: updatePlayer(autoState.playerStore, 'haber', (p) => ({ ...p, bank: 0 })) };
      autoState = dealSeats(autoState, [['Club_10', 'Heart_7'], ['Diamond_10', 'Spade_7']]);
      expect(autoState.botAccounts.haber.work).toEqual({
        status: 'working',
        taskId: 'smashing-rocks',
        daysWorked: 0,
      });

      // Next round: Haber finishes smashing-rocks (+$32), automatically returns, and immediately antes $25 (leaving $7)
      autoState = dealSeats(autoState, [['Club_10', 'Heart_7'], ['Club_9', 'Heart_8'], ['Diamond_10', 'Spade_7']]);
      expect(autoState.botAccounts.haber.work).toBeUndefined();
      expect(getPlayer(autoState.playerStore, 'haber')?.isSittingOut).toBe(false);
      expect(getPlayer(autoState.playerStore, 'haber')?.bank).toBe(7);
      expect(autoState.deck.playerHands.haber.cards).toHaveLength(2);
      expect(autoState.activityLog.some((entry) => entry.name === 'Haber' && entry.description === 'returned to the table with $32' && entry.event === 'work')).toBe(true);
    });

    it('advances work each hand for unseated characters and preserves their work state when seated via SetRoster', () => {
      let state = gameReducer(createGameState(), {
        type: GameAction.NewGame,
        playerKeys: ['chris', 'dealer'],
        botAccounts: {
          ogion: {
            bank: 200,
            balanceHistory: [1000, 200],
            work: { status: 'working', taskId: 'dreaming-trials', daysWorked: 0 },
            allowReturn: false,
          },
        },
      });
      // Round 1 starts on EvaluateGame -> unseated Ogion advances to daysWorked = 1
      state = gameReducer(state, { type: GameAction.EvaluateGame });
      expect(state.botAccounts.ogion.work).toEqual({
        status: 'working',
        taskId: 'dreaming-trials',
        daysWorked: 1,
      });

      // Play and settle Round 1, then start Round 2 -> unseated Ogion finishes dreaming-trials (+$150 -> $350 >= $300)
      state = dealSeats(state, [['Spade_14', 'Heart_13'], ['Diamond_10', 'Spade_7']]);
      state = settle(state);
      state = dealSeats(state, [['Spade_14', 'Heart_13'], ['Diamond_10', 'Spade_7']]);
      state = settle(state);

      expect(state.botAccounts.ogion.bank).toBe(350);
      expect(state.botAccounts.ogion.balanceHistory).toEqual([1000, 200, 350]);
      expect(state.botAccounts.ogion.work).toEqual({
        status: 'ready',
        taskId: 'dreaming-trials',
        daysWorked: 2,
      });

      // Seat Ogion between hands -> inherits bank and ready-to-return state from botAccounts
      const seats = seatsFor({ ...defaultProfileState(), opponentIds: ['ogion'] });
      state = gameReducer(state, { type: GameAction.SetRoster, players: seats });
      expect(getPlayer(state.playerStore, 'ogion')).toMatchObject({
        bank: 350,
        isSittingOut: true,
        awayTask: 'dreaming-trials',
        isReadyToReturn: true,
      });
    });
  });
});

describe('RestoreGame', () => {
  it('resumes a saved game and ignores a snapshot that is not valid', () => {
    const dealt = gameReducer(startDefaultGame(), { type: GameAction.Deal });
    const restored = gameReducer(createGameState(), { type: GameAction.RestoreGame, snapshot: gameSnapshot(dealt) });
    expect(restored.gameStatus).toBe(dealt.gameStatus);
    expect(restored.deck.playerHands.chris.cards).toEqual(dealt.deck.playerHands.chris.cards);
    expect(activePlayerKeys(restored.playerStore)).toEqual(activePlayerKeys(dealt.playerStore));

    const fresh = createGameState();
    expect(playerCount(gameReducer(fresh, { type: GameAction.RestoreGame, snapshot: { nope: true } }).playerStore)).toBe(0);
    expect(gameReducer(fresh, { type: GameAction.RestoreGame, snapshot: undefined }).gameStatus).toBe(GameStatus.Init);
  });
});

describe('leaving the previous state alone', () => {
  /** Freeze a state and everything reachable from it, so any write to it throws */
  const deepFreeze = <T,>(value: T, seen = new Set<unknown>()): T => {
    if (typeof value !== 'object' || value === null || seen.has(value)) return value;
    seen.add(value);
    Object.values(value).forEach((item) => deepFreeze(item, seen));
    return Object.freeze(value);
  };

  /** Run an action against a frozen state, and check that state still saves to the same thing */
  const step = (state: GameState, action: Parameters<typeof gameReducer>[1]): GameState => {
    const before = JSON.stringify(gameSnapshot(state));
    const next = gameReducer(deepFreeze(state), action);
    expect(JSON.stringify(gameSnapshot(state))).toBe(before);
    expect(next).not.toBe(state);
    return next;
  };

  const rig = (state: GameState, ...keys: string[]): GameState => ({
    ...state,
    // the top of the deck is the end of the list
    deck: { ...state.deck, cardKeys: [...keys].reverse() },
  });

  it('plays a whole round, with a wager, a split, a double down and the settlement, without writing to any state it was given', () => {
    const profiles = { ...defaultProfileState(), opponentIds: ['ogion'] };
    let state = step(createGameState(), { type: GameAction.NewGame, players: seatsFor(profiles) });
    state = step(state, { type: GameAction.EvaluateGame });
    const anted = state;
    state = step(state, { type: GameAction.Bet, playerKey: 'chris', betAmount: state.minimumBet });
    expect(state.playerStore).not.toBe(anted.playerStore);
    expect(state.playerStore.players.ogion).toBe(anted.playerStore.players.ogion);
    expect(state.playerStore.players.dealer).toBe(anted.playerStore.players.dealer);
    expect(state.deck).toBe(anted.deck);
    expect(state.botAccounts).toBe(anted.botAccounts);

    // chris gets a pair of eights, ogion 9 and 2, the dealer 10 and 7; then the cards the round will draw
    state = rig(state, 'Spade_8', 'Heart_8', 'Club_9', 'Diamond_2', 'Club_10', 'Heart_7', 'Club_3', 'Diamond_4', 'Club_5', 'Heart_6', 'Spade_10', 'Diamond_10', 'Club_2', 'Heart_2');
    state = step(state, { type: GameAction.Deal });
    expect(getPlayerHand(state.deck, 'chris')?.cards).toEqual(['Spade_8', 'Heart_8']);

    state = step(state, { type: GameAction.Split, playerKey: 'chris' });
    expect(getPlayerHands(state.deck, 'chris')).toHaveLength(2);
    state = step(state, { type: GameAction.Draw, playerKey: 'chris', deckSide: 'top', numberOfCards: 1 });
    state = step(state, { type: GameAction.Stay, playerKey: 'chris' });
    state = step(state, { type: GameAction.Stay, playerKey: 'chris' });

    expect(state.controllingPlayer).toBe('ogion');
    state = step(state, { type: GameAction.DoubleDown, playerKey: 'ogion' });
    for (let moves = 0; state.gameStatus === GameStatus.InProgress && moves < 10; moves += 1) {
      state = step(state, { type: GameAction.Stay, playerKey: state.controllingPlayer });
    }
    expect(state.gameStatus).toBe(GameStatus.RoundOver);
    state = step(state, { type: GameAction.EvaluateGame });
    expect(state.gameStatusFlag).toBe(true);

    // between hands: a roster change, the next round, and the rest of the actions the table sends
    state = step(state, { type: GameAction.SetRoster, players: seatsFor({ ...profiles, opponentIds: ['ogion', 'shevek'] }) });
    expect(activePlayerKeys(state.playerStore)).toContain('shevek');
    const beforeWork = state;
    state = step(state, { type: GameAction.ConfigureWork, playerKey: 'ogion', taskOverride: 'herding-goats', allowReturn: true });
    expect(state.deck).toBe(beforeWork.deck);
    expect(state.botAccounts.shevek).toBe(beforeWork.botAccounts.shevek);

    const beforeSpinner = state;
    state = step(state, { type: GameAction.SetSpinnerVisible });
    expect(state.deck).toBe(beforeSpinner.deck);
    expect(state.playerStore).toBe(beforeSpinner.playerStore);
    expect(state.botAccounts).toBe(beforeSpinner.botAccounts);
    expect(state.activityLog).toBe(beforeSpinner.activityLog);
    expect(state.tableRules).toBe(beforeSpinner.tableRules);

    const beforeSitOut = state;
    state = step(state, { type: GameAction.SitOut, playerKey: 'chris', isSittingOut: true });
    expect(state.deck).toBe(beforeSitOut.deck);
    expect(state.botAccounts).toBe(beforeSitOut.botAccounts);
    expect(state.activityLog).toBe(beforeSitOut.activityLog);
    state = step(state, { type: GameAction.SitOut, playerKey: 'chris', isSittingOut: false });

    state = step(state, { type: GameAction.Deal, tableRules: { ...defaultTableRules, numberOfDecks: '2' } });
    expect(state.round).toBe(2);
    const beforeDeckOnly = state;
    state = step(state, { type: GameAction.Shuffle });
    expect(state.deck).not.toBe(beforeDeckOnly.deck);
    expect(state.playerStore).toBe(beforeDeckOnly.playerStore);
    expect(state.botAccounts).toBe(beforeDeckOnly.botAccounts);
    const beforeSelect = state;
    state = step(state, { type: GameAction.Select, cardKey: 'Spade_8' });
    expect(state.playerStore).toBe(beforeSelect.playerStore);
    expect(state.botAccounts).toBe(beforeSelect.botAccounts);
    expect(state.activityLog).toBe(beforeSelect.activityLog);
    const beforeUnselect = state;
    state = step(state, { type: GameAction.Unselect, cardKey: 'Spade_8' });
    expect(state.playerStore).toBe(beforeUnselect.playerStore);
    expect(state.botAccounts).toBe(beforeUnselect.botAccounts);
    expect(state.activityLog).toBe(beforeUnselect.activityLog);
    state = step(state, { type: GameAction.RestoreGame, snapshot: JSON.parse(JSON.stringify(gameSnapshot(state))) });
    state = step(state, { type: GameAction.ResetGame });
    expect(state.gameStatus).toBe(GameStatus.Init);
  });

  it('keeps turn-engine and activity helpers pure on frozen state and preserves identity on no-op guards', () => {
    const base = deepFreeze(gameReducer(createGameState(), {
      type: GameAction.NewGame,
      players: seatsFor({ ...defaultProfileState(), opponentIds: ['ogion'] }),
      seed: 42,
    }));

    // recordActivity leaves input untouched and appends one entry
    const logged = recordActivity(base, 'Chris', 'tested pure log', 'round');
    expect(logged).not.toBe(base);
    expect(logged.activityLog).toHaveLength(base.activityLog.length + 1);
    expect(base.activityLog).toHaveLength(1);

    // evaluateGame starts turnCount 0, and is an exact identity no-op when already in turn 1
    const evaluated = deepFreeze(evaluateGame(base));
    expect(evaluated.turnCount).toBe(1);
    expect(evaluateGame(evaluated)).toBe(evaluated);

    // setControl switches seat without mutating frozen store
    const controlled = setControl(evaluated, 'ogion');
    expect(controlled.controllingPlayer).toBe('ogion');
    expect(evaluated.controllingPlayer).toBe('chris');

    // reshuffleIfLow preserves reference identity when deck is healthy, and reshuffles when low
    expect(reshuffleIfLow(evaluated)).toBe(evaluated);
    const lowDeck = deepFreeze({ ...evaluated, deck: { ...evaluated.deck, cardKeys: ['Spade_2'] } });
    const reshuffled = reshuffleIfLow(lowDeck);
    expect(reshuffled).not.toBe(lowDeck);
    expect(reshuffled.deck.cardKeys.length).toBeGreaterThan(10);

    // configureCharacterWork preserves identity on non-bot keys
    expect(configureCharacterWork(evaluated, 'chris', { allowReturn: true })).toBe(evaluated);

    // applyRoster preserves identity mid-hand and between hands when roster is unchanged
    expect(applyRoster(evaluated, seatsFor({ ...defaultProfileState(), opponentIds: ['ogion', 'shevek'] }))).toBe(evaluated);
    const settled = deepFreeze(gameReducer(
      gameReducer(rig(evaluated, 'Spade_14', 'Heart_13', 'Club_9', 'Diamond_8', 'Club_14', 'Heart_13'), { type: GameAction.Deal }),
      { type: GameAction.EvaluateGame },
    ));
    expect(settled.gameStatus).toBe(GameStatus.RoundOver);
    expect(evaluateGame(settled)).toBe(settled);
    expect(applyRoster(settled, seatsFor({ ...defaultProfileState(), opponentIds: ['ogion'] }))).toBe(settled);
    const updatedRoster = applyRoster(settled, seatsFor({ ...defaultProfileState(), opponentIds: ['ogion', 'shevek'] }));
    expect(updatedRoster).not.toBe(settled);
    expect(activePlayerKeys(updatedRoster.playerStore)).toContain('shevek');
  });

  it('advances work, configures overrides, and settles bot balance history without mutating a frozen state', () => {
    const profiles = { ...defaultProfileState(), opponentIds: ['haber'] };
    let state = step(createGameState(), {
      type: GameAction.NewGame,
      players: seatsFor(profiles),
      botAccounts: {
        haber: {
          bank: 10,
          balanceHistory: [1000, 10],
          allowReturn: false,
        },
      },
    });
    // Round 1 start: broke Haber leaves to work on 1-day smashing-rocks
    state = step(state, { type: GameAction.EvaluateGame });
    expect(state.botAccounts.haber.work).toEqual({ status: 'working', taskId: 'smashing-rocks', daysWorked: 0 });

    // ConfigureWork on frozen state: switch override and back
    state = step(state, { type: GameAction.ConfigureWork, playerKey: 'haber', taskOverride: 'herding-goats' });
    state = step(state, { type: GameAction.ConfigureWork, playerKey: 'haber', taskOverride: 'smashing-rocks' });

    // Round 2: Haber finishes smashing-rocks (+$32 -> $42) and enters ready state
    state = step(state, { type: GameAction.NewRound });
    expect(state.botAccounts.haber.work).toEqual({ status: 'ready', taskId: 'smashing-rocks', daysWorked: 1 });
    expect(state.botAccounts.haber.balanceHistory).toEqual([1000, 10, 42]);

    // Enable allowReturn on next NewRound -> returns to table and antes
    state = step(state, { type: GameAction.ConfigureWork, playerKey: 'haber', allowReturn: true });
    state = step(state, { type: GameAction.NewRound });
    expect(state.botAccounts.haber.work).toBeUndefined();
  });

  it('takes its time and its randomness from the action, so a stamped action always gives the same result', () => {
    const profiles = { ...defaultProfileState(), opponentIds: ['haber', 'shevek'] };
    const stamp = { now: 1700000000000, seed: 12345 };
    // one blank table for every game below: the reducer leaves it as it is
    const blank = createGameState();
    const random = vi.spyOn(Math, 'random');
    const play = () => {
      let state = gameReducer(blank, { type: GameAction.NewGame, players: seatsFor(profiles), ...stamp });
      state = gameReducer(state, { type: GameAction.EvaluateGame, ...stamp, seed: 6 });
      state = gameReducer(state, { type: GameAction.Deal, ...stamp, now: stamp.now + 1000, seed: 7 });
      return gameReducer(state, { type: GameAction.Shuffle, ...stamp, seed: 8 });
    };
    const first = play();
    const second = play();

    // a new shoe, the computer players' wagers and the shuffle all came out the same
    expect(JSON.stringify(gameSnapshot(second))).toBe(JSON.stringify(gameSnapshot(first)));
    expect(first.deck.cardKeys.length).toBeLessThan(52);
    expect(random).not.toHaveBeenCalled();
    // every entry carries the time of the action that made it
    expect(first.lastWriteTime).toBe(new Date(stamp.now).toISOString());
    expect(first.activityLog.find((entry) => entry.event === 'game')?.timestamp).toBe(stamp.now);
    expect(first.activityLog.find((entry) => entry.event === 'deal')?.timestamp).toBe(stamp.now + 1000);

    // another seed gives another shoe
    const other = gameReducer(blank, { type: GameAction.NewGame, players: seatsFor(profiles), ...stamp, seed: 54321 });
    const same = gameReducer(blank, { type: GameAction.NewGame, players: seatsFor(profiles), ...stamp });
    expect(other.deck.cardKeys).not.toEqual(same.deck.cardKeys);
  });

  it('uses the clock and Math.random for an action that carries neither', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1600000000000);
    const random = vi.spyOn(Math, 'random');
    const state = gameReducer(createGameState(), { type: GameAction.NewGame, playerKeys: ['chris', 'dealer'] });
    expect(random).toHaveBeenCalled();
    expect(state.lastWriteTime).toBe(new Date(1600000000000).toISOString());
    expect(state.activityLog[0].timestamp).toBe(1600000000000);
    vi.useRealTimers();
  });

  it('leaves the game as it is when there is nothing to draw, without throwing', () => {
    let state = rig(startDefaultGame(), 'Spade_10', 'Heart_6', 'Club_10', 'Heart_7');
    state = gameReducer(state, { type: GameAction.Deal });
    const none = gameReducer(state, { type: GameAction.Draw, playerKey: 'chris', deckSide: 'top', numberOfCards: 0 });
    expect(none.deck).toEqual(state.deck);

    // an empty deck outside a round is not refilled
    const over = { ...state, gameStatus: GameStatus.RoundOver };
    expect(over.deck.cardKeys.length).toBe(0);
    const short = gameReducer(over, { type: GameAction.Draw, playerKey: 'chris', deckSide: 'top', numberOfCards: 1 });
    expect(getPlayerHand(short.deck, 'chris')?.cards).toEqual(['Spade_10', 'Heart_6']);
    expect(short.activityLog).toEqual(over.activityLog);

    // during a round the cards not in a hand are shuffled back in, so play carries on
    const refilled = gameReducer(state, { type: GameAction.Draw, playerKey: 'chris', deckSide: 'top', numberOfCards: 1 });
    expect(getPlayerHand(refilled.deck, 'chris')?.cards).toHaveLength(3);
    expect(refilled.deck.cardKeys.length).toBe(47);
  });

  it('gives the same result when one action is applied twice to the same state', () => {
    let state = rig(startDefaultGame(), 'Spade_10', 'Heart_6', 'Club_10', 'Heart_7', 'Club_5');
    state = gameReducer(state, { type: GameAction.Deal });
    const action: GameReducerAction = { type: GameAction.Draw, playerKey: 'chris', deckSide: 'top', numberOfCards: 1 };
    const once = gameReducer(state, action);
    const twice = gameReducer(state, action);
    expect(getPlayerHand(once.deck, 'chris')?.cards).toEqual(['Spade_10', 'Heart_6', 'Club_5']);
    expect(twice.deck).toEqual(once.deck);
    expect(twice.playerStore.players).toEqual(once.playerStore.players);
    expect(getPlayerHand(state.deck, 'chris')?.cards).toEqual(['Spade_10', 'Heart_6']);
  });

  it('allows the human player to sit out a round, letting computer players play by themselves', () => {
    let state = startWithBots(['ogion']);
    // Hand 1: Chris and Ogion both play
    state = dealSeats(state, [['Club_10', 'Heart_7'], ['Club_9', 'Heart_8'], ['Diamond_10', 'Spade_7']]);
    expect(state.playerStore.players.chris.isSittingOut).toBeFalsy();
    state = stay(state, 'chris');
    state = stay(state, 'ogion');
    state = stay(state, 'dealer');
    expect(state.gameStatus).toBe(GameStatus.RoundOver);
    state = gameReducer(state, { type: GameAction.EvaluateGame });
    const chrisBankAfterRound1 = state.playerStore.players.chris.bank;

    // Chris sits out Hand 2
    state = gameReducer(state, { type: GameAction.SitOut, playerKey: 'chris', isSittingOut: true });
    expect(state.playerStore.players.chris.isSittingOut).toBe(true);

    // Deal Hand 2: only Ogion and Dealer receive cards
    state = dealSeats(state, [['Club_10', 'Heart_8'], ['Diamond_10', 'Spade_8']]);
    expect(state.round).toBe(2);
    expect(state.playerStore.players.chris.isSittingOut).toBe(true);
    expect(state.deck.playerHands.chris.cards).toEqual([]);
    expect(state.deck.playerHands.ogion.cards).toHaveLength(2);
    expect(state.deck.playerHands.dealer.cards).toHaveLength(2);

    // Activity log recorded that Chris sat out
    expect(state.activityLog.some((e) => e.name === 'Chris' && e.description === 'sat out')).toBe(true);
    // Chris did not ante
    expect(state.playerStore.players.chris.bank).toBe(chrisBankAfterRound1);

    // First seat in control is Ogion, not Chris
    expect(state.controllingPlayer).toBe('ogion');
    state = stay(state, 'ogion');
    expect(state.controllingPlayer).toBe('dealer');
    state = stay(state, 'dealer');
    expect(state.gameStatus).toBe(GameStatus.RoundOver);

    // Settle hand 2
    state = gameReducer(state, { type: GameAction.EvaluateGame });
    expect(state.playerStore.players.chris.bank).toBe(chrisBankAfterRound1);
    expect(state.playerStore.players.chris.result).toBeUndefined();

    // Chris rejoins the table for Hand 3
    state = gameReducer(state, { type: GameAction.SitOut, playerKey: 'chris', isSittingOut: false });
    expect(state.playerStore.players.chris.isSittingOut).toBe(false);

    state = dealSeats(state, [['Club_10', 'Heart_7'], ['Club_9', 'Heart_8'], ['Diamond_10', 'Spade_7']]);
    expect(state.round).toBe(3);
    expect(state.playerStore.players.chris.isSittingOut).toBe(false);
    expect(state.deck.playerHands.chris.cards).toHaveLength(2);
    expect(state.controllingPlayer).toBe('chris');
    expect(state.playerStore.players.chris.bank).toBe(chrisBankAfterRound1 - state.minimumBet);
  });
});

describe('what an action may carry', () => {
  // These are checked by the compiler (npm run typecheck): each line marked as an error
  // must be one, or the marker itself fails the check.
  it('is fixed by its type', () => {
    const accept = (action: GameReducerAction) => action.type;

    expect(accept({ type: GameAction.Bet, playerKey: 'chris', betAmount: 25 })).toBe(GameAction.Bet);
    expect(accept({ type: GameAction.Stay })).toBe(GameAction.Stay);
    expect(accept({ type: GameAction.Deal, now: 1, seed: 2 })).toBe(GameAction.Deal);
    expect(accept({ type: GameAction.ConfigureWork, playerKey: 'ogion', taskOverride: 'herding-goats', allowReturn: true })).toBe(GameAction.ConfigureWork);

    // @ts-expect-error a wager needs its amount
    accept({ type: GameAction.Bet, playerKey: 'chris' });
    // @ts-expect-error a move names one seat, not several
    accept({ type: GameAction.Stay, playerKey: ['chris'] });
    // @ts-expect-error table rules arrive with a deal or a new game, not with a move
    accept({ type: GameAction.Draw, playerKey: 'chris', tableRules: defaultTableRules });
    // @ts-expect-error a roster change needs the roster
    accept({ type: GameAction.SetRoster });
    // @ts-expect-error there is nothing to restore without a snapshot
    accept({ type: GameAction.RestoreGame });
    // @ts-expect-error a shuffle takes no card
    accept({ type: GameAction.Shuffle, cardKey: 'Spade_8' });
    // @ts-expect-error configuring work requires a playerKey
    accept({ type: GameAction.ConfigureWork, allowReturn: true });
  });
});

describe('insurance and late surrender', () => {
  const startWithRules = (rules: Partial<TableRules>, players?: ReturnType<typeof seatsFor>) => {
    const started = gameReducer(createGameState(), {
      type: GameAction.NewGame,
      ...(players ? { players } : { playerKeys: ['chris', 'dealer'] }),
      tableRules: { ...defaultTableRules, ...rules },
    });
    return gameReducer(started, { type: GameAction.EvaluateGame });
  };

  it('offers insurance before checking for a dealer natural, and pays 2:1 when the dealer has blackjack', () => {
    // Dealer gets [Spade_10, Heart_14] (hole card 10, up card Ace = natural)
    let state = dealSeats(startWithRules({ insurance: true }), [['Club_9', 'Diamond_9'], ['Spade_10', 'Heart_14']]);

    expect(state.isInsuranceOpen).toBe(true);
    expect(state.gameStatus).toBe(GameStatus.InProgress);
    expect(canInsurance(state, 'chris')).toBe(true);
    expect(canDoubleDown(state, 'chris')).toBe(false);

    // Stake is $25, max insurance is $12. Insurance wins 2:1 (+$24), main hand loses -$25 -> net -$1
    state = gameReducer(state, { type: GameAction.Insurance, playerKey: 'chris', accept: true, amount: 12 });
    expect(state.isInsuranceOpen).toBe(false);
    expect(state.gameStatus).toBe(GameStatus.RoundOver);
    state = gameReducer(state, { type: GameAction.EvaluateGame });
    expect(state.playerStore.players.chris.bank).toBe(999);
    expect(state.playerStore.players.dealer.bank).toBe(1001);
  });

  it('collects a lost insurance bet and continues play when the dealer has no natural', () => {
    let state = dealSeats(startWithRules({ insurance: true }), [['Club_10', 'Diamond_9'], ['Spade_6', 'Heart_14']]);

    expect(state.isInsuranceOpen).toBe(true);
    state = gameReducer(state, { type: GameAction.Insurance, playerKey: 'chris', accept: true, amount: 12 });
    expect(state.isInsuranceOpen).toBe(false);
    expect(state.gameStatus).toBe(GameStatus.InProgress);
    expect(state.controllingPlayer).toBe('chris');
    // Insurance $12 was lost to the dealer immediately
    expect(state.playerStore.players.chris.bank).toBe(963);
    expect(state.playerStore.players.dealer.bank).toBe(1012);

    state = stay(state, 'chris');
    state = stay(state, 'dealer');
    state = gameReducer(state, { type: GameAction.EvaluateGame });
    // Chris wins $25 on the 19 vs 17 main hand: 963 + 50 = 1013 (1000 - 12 + 25)
    expect(state.playerStore.players.chris.bank).toBe(1013);
  });

  it('does not offer insurance when the rule is off', () => {
    const state = dealSeats(startWithRules({ insurance: false }), [['Club_9', 'Diamond_9'], ['Spade_10', 'Heart_14']]);
    expect(state.isInsuranceOpen).toBeFalsy();
    expect(state.gameStatus).toBe(GameStatus.RoundOver);
  });

  it('allows late surrender on a two-card unsplit hand when enabled and returns half the stake', () => {
    let state = dealSeats(startWithRules({ surrender: true }), [['Club_10', 'Diamond_6'], ['Spade_10', 'Heart_10']]);

    expect(canSurrender(state, 'chris')).toBe(true);
    state = gameReducer(state, { type: GameAction.Surrender, playerKey: 'chris' });
    expect(getPlayerHand(state.deck, 'chris', 0)?.isSurrendered).toBe(true);
    expect(getPlayerHand(state.deck, 'chris', 0)?.result).toBe('loss');
    expect(state.gameStatus).toBe(GameStatus.RoundOver);

    state = gameReducer(state, { type: GameAction.EvaluateGame });
    // Stake was $25 -> $12 returned, $13 lost
    expect(state.playerStore.players.chris.bank).toBe(987);
    expect(state.playerStore.players.chris.stats.numberOfTimesSurrendered).toBe(1);
    expect(state.playerStore.players.dealer.bank).toBe(1013);
  });

  it('does not allow surrender when the rule is off or after hitting', () => {
    const offState = dealSeats(startWithRules({ surrender: false }), [['Club_10', 'Diamond_6'], ['Spade_10', 'Heart_10']]);
    expect(canSurrender(offState, 'chris')).toBe(false);

    let onState = dealSeats(startWithRules({ surrender: true }), [['Club_10', 'Diamond_4'], ['Spade_10', 'Heart_10']], ['Club_2']);
    expect(canSurrender(onState, 'chris')).toBe(true);
    onState = hit(onState, 'chris');
    expect(canSurrender(onState, 'chris')).toBe(false);
  });

  it('has disciplined bots surrender 16 vs 10 while maniacs do not', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const state = dealSeats(
      startWithRules({ surrender: true }, seatsFor({ ...defaultProfileState(), opponentIds: ['shevek', 'haber'] })),
      [['Club_10', 'Diamond_10'], ['Club_10', 'Heart_6'], ['Spade_10', 'Diamond_6'], ['Club_9', 'Heart_10']],
    );
    const afterChris = stay(state, 'chris');
    expect(afterChris.controllingPlayer).toBe('shevek');
    // Shevek (discipline 10) surrenders 16 vs 10 even with rng=0.5 (or 0.01)
    expect(decideSeatMove(afterChris, 'shevek', () => 0.01)).toBe('surrender');
    // Haber (aggression 10) never surrenders
    const afterShevek = stay(afterChris, 'shevek');
    expect(decideSeatMove(afterShevek, 'haber', () => 0.01)).not.toBe('surrender');
  });
});

describe('session summary tracking', () => {
  it('tracks per-seat hands, outcomes, net, and balanceHistory, and resets on roster change', () => {
    let state = dealSeats(startDefaultGame(), [['Club_10', 'Diamond_10'], ['Spade_10', 'Heart_7']]);
    state = stay(state, 'chris');
    state = stay(state, 'dealer');
    state = gameReducer(state, { type: GameAction.EvaluateGame });
    // Second EvaluateGame must not double-count
    state = gameReducer(state, { type: GameAction.EvaluateGame });

    expect(state.session?.seats.chris).toMatchObject({
      title: 'Chris',
      hands: 1,
      wins: 1,
      losses: 0,
      pushes: 0,
      blackjacks: 0,
      busts: 0,
      net: 25,
      balanceHistory: [1000, 1025],
    });

    // Changing roster between hands starts a fresh session
    const nextRoster = seatsFor({ ...defaultProfileState(), opponentIds: ['ogion'] });
    state = gameReducer(state, { type: GameAction.SetRoster, players: nextRoster });
    expect(state.session?.seats.chris).toMatchObject({
      hands: 0,
      net: 0,
      balanceHistory: [1025],
    });
    expect(state.session?.seats.ogion).toBeDefined();
  });
});
