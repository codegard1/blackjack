import { isBotId } from "../characters";
import { createGameState } from "../context";
import { defaultplayersArr } from "../definitions";
import { GameAction, GameStatus } from "../enums";
import { GameReducerAction, IPlayerOptions } from "../interfaces";
import { GameState, cloneBotAccounts, isTableRules, tableRulesFrom } from "../types";
import { evaluateGame } from "./evaluateGame";
import { debugLog } from "./debugLog";
import { recordActivity } from "./activity";
import {
  appendCardsToHand, clearAllHands, createDeck, dealCards, drawCards, getPlayerHand, getPlayerHands, getPlayerHandValue,
  selectCard, shuffleDeck, splitPlayerHand, syncDeckHands, unselectCard, updateHand,
} from "./deck";
import { restoreGameState } from "./persistence";
import {
  addPlayer, allPlayers, betPlayer, createPlayerStore, getPlayer, hitPlayer, playerCount, resetPlayers, updatePlayer,
} from "./playerStore";
import { seededRandom } from "./random";
import {
  advanceTurn, applyRoster, canDoubleDown, canSplit, collectAntes, configureCharacterWork, isBot, isDealer, playerSeats, refillDeck, reshuffleIfLow, resolveNaturals,
  resolveShowdown, roundStake, seatOrder, setControl, syncSeatWithAccount, updateBotAccount,
} from "./round";
import { defaultBotAccount, defaultBotAccounts } from "./work";

/**
 * After a player draws, check for a bust. A busted player loses and the turn
 * moves on; a busted dealer ends the round, and every hand still in play wins.
 */
function updatePlayerHandStatus(state: GameState, playerKey: string, handIndex: number): GameState {
  const player = getPlayer(state.playerStore, playerKey);
  const hand = getPlayerHand(state.deck, playerKey, handIndex);
  if (!player || !hand) return state;

  const isHandBusted = getPlayerHandValue(state.deck, playerKey, handIndex).highest > 21;
  let deck = updateHand(state.deck, playerKey, handIndex, (h) => ({ ...h, isBusted: isHandBusted }));
  const isBusted = getPlayerHands(deck, playerKey).every((item) => item.isBusted);
  let playerStore = updatePlayer(state.playerStore, playerKey, (p) => ({ ...p, isBusted }));
  let next: GameState = { ...state, deck, playerStore };
  if (!isHandBusted || next.gameStatus !== GameStatus.InProgress) return next;

  if (isDealer(player)) {
    return resolveShowdown(next);
  }

  deck = updateHand(next.deck, playerKey, handIndex, (h) => ({ ...h, result: 'loss' }));
  const hands = getPlayerHands(deck, playerKey);
  if (hands.every((item) => item.result)) {
    playerStore = updatePlayer(next.playerStore, playerKey, (p) => ({ ...p, result: hands[0].result }));
  }
  next = { ...next, deck, playerStore };
  return advanceTurn(next, playerKey, handIndex);
}

/** The first seat to act in a round: the first player who has not sat out */
function firstSeat(state: GameState): string | undefined {
  return playerSeats(state).find((player) => !player.isSittingOut)?.key;
}

export { canDoubleDown, canSplit } from "./round";

/**
 * Reducer function for game state
 * @param state game state object
 * @param action action containing the state parameters
 * @returns modified game state
 */
export function gameReducer(state: GameState, action: GameReducerAction): GameState {
  // The time and the randomness come from the action when it carries them (see stampAction),
  // so the same action gives the same result. Without them the clock and Math.random are used.
  const rng = action.seed !== undefined ? seededRandom(action.seed) : () => Math.random();
  const lastWriteTime = new Date(action.now ?? Date.now()).toISOString();
  return applyAction({ ...state, lastWriteTime }, action, rng);
}

/**
 * Apply one action purely, returning a new state with untouched slices shared by reference.
 * Compound actions (such as a deal starting a round, or double down) compose smaller
 * transitions via `applyAction`.
 */
function applyAction(state: GameState, action: GameReducerAction, rng: () => number): GameState {

  // Announce
  debugLog('GameAction.' + action.type, action);

  // Respond to action dispatch. Inside each case the action is known to be of that type.
  switch (action.type) {

    // Toggle visibility of the spinner
    case GameAction.SetSpinnerVisible: {
      return { ...state, isSpinnerVisible: !state.isSpinnerVisible };
    }

    case GameAction.Bet: {
      const { playerKey, betAmount } = action;
      const { store, paid } = betPlayer(state.playerStore, playerKey, betAmount);
      if (!paid) return state;

      const player = getPlayer(store, playerKey)!;
      let deck = state.deck;
      if (store.currentPlayerKey === playerKey) {
        const hand = getPlayerHand(deck, playerKey, state.activeHandIndex);
        if (hand?.cards.length) {
          deck = updateHand(deck, playerKey, state.activeHandIndex, (h) => ({
            ...h,
            stake: (h.stake ?? 0) + betAmount,
          }));
        }
      }
      let next: GameState = {
        ...state,
        playerStore: store,
        deck,
        pot: state.pot + betAmount,
      };
      if (isBot(player)) {
        next = updateBotAccount(next, playerKey, (acc) => (
          acc.bank === player.bank ? acc : { ...acc, bank: player.bank }
        ));
      }
      return recordActivity(next, player.title, `wagered $${betAmount}`, 'bet', { amount: -betAmount });
    }

    case GameAction.ConfigureWork: {
      return configureCharacterWork(state, action.playerKey, {
        taskOverride: action.taskOverride,
        allowReturn: action.allowReturn,
      });
    }

    /**
     * Initiate a new game from scratch
     */
    case GameAction.NewGame: {
      const { players, playerKeys, botAccounts } = action;
      const tableRules = isTableRules(action.tableRules) ? tableRulesFrom(action.tableRules) : state.tableRules;
      const baseAccounts = {
        ...defaultBotAccounts(),
        ...cloneBotAccounts(state.botAccounts),
        ...cloneBotAccounts(botAccounts),
      };

      // seats come from the players payload; otherwise the keys name default players
      const seats: IPlayerOptions[] = players ?? (playerKeys ?? []).flatMap((k) => {
        const p = defaultplayersArr.find((i) => i.key === k);
        return p ? [{ bank: p.bank, id: p.id, isNPC: p.isNPC, key: k, title: p.title, disabled: p.disabled }] : [];
      });
      let playerStore = createPlayerStore();
      const nextAccounts = { ...baseAccounts };
      for (const seat of seats) {
        playerStore = addPlayer(playerStore, seat);
        if (isBotId(seat.key) && !botAccounts?.[seat.key]) {
          nextAccounts[seat.key] = {
            ...defaultBotAccount(seat.bank),
            ...(seat.awayTask ? {
              work: { status: seat.isReadyToReturn ? 'ready' : 'working', taskId: seat.awayTask, daysWorked: 0 },
            } : {}),
          };
        }
      }
      const deck = syncDeckHands(
        createDeck(Number(tableRules.numberOfDecks), rng),
        seats.map((seat) => seat.key),
      );
      let next: GameState = {
        ...state,
        tableRules,
        playerStore,
        botAccounts: nextAccounts,
        pot: 0,
        winner: undefined,
        loser: undefined,
        gameStatusFlag: false,
        deck,
        controllingPlayer: undefined,
        activeHandIndex: 0,
        dealerHasControl: false,
        gameStatus: GameStatus.InProgress,
        round: 1,
        turnCount: 0,
      };
      for (const seat of seats) {
        if (isBotId(seat.key)) next = syncSeatWithAccount(next, seat.key);
      }
      const first = firstSeat(next);
      if (first) next = setControl(next, first);
      return recordActivity(next, '', 'Game started', 'game');
    }

    /**
     * Seat a new roster between hands; ignored while a hand is in play
     */
    case GameAction.SetRoster: {
      const { players, botAccounts } = action;
      return applyRoster(state, players, botAccounts);
    }

    /**
     * Run status-driven bookkeeping (opening ante, payouts, stats)
     */
    case GameAction.EvaluateGame: {
      return evaluateGame(state, rng);
    }

    /**
     * Reset game state to default
     */
    /**
     * Resume a saved game, such as the copy kept on the server. An invalid
     * snapshot leaves the game as it is.
     */
    case GameAction.RestoreGame: {
      return restoreGameState(action.snapshot) ?? state;
    }

    case GameAction.ResetGame: {
      return { ...createGameState(), activityLog: action.clearActivityLog ? [] : state.activityLog };
    }

    /**
     * Start a new round of a continuous game
     */
    case GameAction.NewRound: {
      let next = state;
      if (isTableRules(action.tableRules)) {
        const tableRules = tableRulesFrom(action.tableRules);
        const decksChanged = next.tableRules.numberOfDecks !== action.tableRules.numberOfDecks;
        next = { ...next, tableRules };
        if (decksChanged) {
          next = recordActivity({
            ...next,
            deck: syncDeckHands(
              createDeck(Number(tableRules.numberOfDecks), rng),
              allPlayers(next.playerStore).map((player) => player.key),
            ),
          }, '', 'Deck shuffled', 'shuffle');
        }
      }
      next = {
        ...next,
        deck: clearAllHands(next.deck),
        playerStore: resetPlayers(next.playerStore),
        controllingPlayer: undefined,
        activeHandIndex: 0,
        dealerHasControl: false,
        gameStatus: GameStatus.InProgress,
        gameStatusFlag: false,
        pot: 0,
        round: next.round + 1,
        turnCount: 1,
      };
      next = recordActivity(next, '', `Round ${next.round} started`, 'round');
      next = reshuffleIfLow(next, rng);
      // antes come after the round starts, so they belong to the new hand
      next = collectAntes(next, rng);
      const first = firstSeat(next);
      return first ? setControl(next, first) : next;
    }

    case GameAction.Stay: {
      const { playerKey, handIndex } = action;
      const stayingPlayerKey = playerKey ?? state.playerStore.currentPlayerKey;
      const stayingPlayer = stayingPlayerKey ? getPlayer(state.playerStore, stayingPlayerKey) : undefined;
      const stayingHandIndex = handIndex ?? state.activeHandIndex;
      const stayingHand = stayingPlayerKey ? getPlayerHand(state.deck, stayingPlayerKey, stayingHandIndex) : undefined;
      if (!stayingPlayerKey || !stayingPlayer || !stayingHand) return state;

      let next = recordActivity(state, stayingPlayer.title, 'stayed', 'stay');
      const deck = updateHand(next.deck, stayingPlayerKey, stayingHandIndex, (h) => ({ ...h, isStaying: true }));
      const hands = getPlayerHands(deck, stayingPlayerKey);
      const isStaying = hands.every((hand) => hand.isStaying || hand.result);
      const playerStore = updatePlayer(next.playerStore, stayingPlayerKey, (p) => ({ ...p, isStaying }));
      next = { ...next, deck, playerStore };
      return isDealer(stayingPlayer)
        ? resolveShowdown(next)
        : advanceTurn(next, stayingPlayerKey, stayingHandIndex);
    }

    // Select a card
    case GameAction.Select: {
      return { ...state, deck: selectCard(state.deck, action.cardKey) };
    }

    case GameAction.SitOut: {
      const human = allPlayers(state.playerStore).find((p) => !p.isNPC && !isDealer(p));
      const key = action.playerKey ?? human?.key ?? state.playerStore.currentPlayerKey;
      if (!key) return state;
      const player = getPlayer(state.playerStore, key);
      if (!player) return state;
      const isSittingOut = action.isSittingOut !== undefined ? action.isSittingOut : true;
      return {
        ...state,
        playerStore: updatePlayer(state.playerStore, key, (p) => ({ ...p, isSittingOut })),
      };
    }

    // Unselect a card
    case GameAction.Unselect: {
      return { ...state, deck: unselectCard(state.deck, action.cardKey) };
    }

    // Draw card(s) from the deck
    case GameAction.Draw: {
      const { playerKey, handIndex, deckSide, numberOfCards } = action;
      const _num = numberOfCards ?? 1;
      let next = state;
      // a long round with many seats can run the deck dry; reshuffle what is not in play
      if (_num > 0 && next.deck.cardKeys.length < _num && next.gameStatus === GameStatus.InProgress) {
        next = refillDeck(next, rng);
      }
      // Nothing to draw (no cards asked for, or a deck that cannot cover them outside a round):
      // leave the game as it is. A reducer that throws takes the whole table down with it.
      if (_num <= 0 || next.deck.cardKeys.length < _num) return next;

      const side = deckSide === 'top' ? 'top' : deckSide === 'random' ? 'random' : 'bottom';
      const { deck: nextDeck, drawn } = drawCards(next.deck, _num, side, rng);
      next = { ...next, deck: nextDeck };
      const where = deckSide === 'top' ? 'from the top' : deckSide === 'random' ? 'at random' : 'from the bottom';
      if (playerKey !== undefined) {
        const index = handIndex ?? next.activeHandIndex;
        next = {
          ...next,
          deck: appendCardsToHand(next.deck, playerKey, drawn, index),
          playerStore: hitPlayer(next.playerStore, playerKey),
        };
        next = recordActivity(next, getPlayer(next.playerStore, playerKey)!.title, `drew ${_num} card${_num === 1 ? '' : 's'} ${where}`, 'draw');
        next = updatePlayerHandStatus(next, playerKey, index);
      }

      return next;
    }

    // Shuffle the remaining card in the deck
    case GameAction.Shuffle: {
      return recordActivity({
        ...state,
        deck: shuffleDeck(state.deck, Number(state.tableRules.numberOfDecks), rng),
      }, '', 'Deck shuffled', 'shuffle');
    }

    case GameAction.Deal: {
      const hasCardsInHands = allPlayers(state.playerStore).some((player) => getPlayerHands(state.deck, player.key).some((hand) => hand.cards.length));
      let next = hasCardsInHands || state.gameStatus >= GameStatus.RoundOver
        ? applyAction(state, { type: GameAction.NewRound, tableRules: action.tableRules }, rng)
        : state;
      if (playerCount(next.playerStore) === 0) return next;
      const dealtKeys = seatOrder(next).filter((key) => !getPlayer(next.playerStore, key)?.isSittingOut);
      next = {
        ...next,
        activeHandIndex: 0,
        deck: dealCards(next.deck, 2, dealtKeys),
      };
      for (const key of dealtKeys) {
        next = recordActivity(next, getPlayer(next.playerStore, key)!.title, 'was dealt two cards', 'deal');
      }
      return resolveNaturals(next);
    }

    /**
     * Double the player's stake, draw exactly one card, then stand
     * (unless the card busts them). Only allowed on a two-card hand.
     */
    case GameAction.DoubleDown: {
      const { playerKey, handIndex } = action;
      const key = playerKey ?? state.playerStore.currentPlayerKey;
      const index = handIndex ?? state.activeHandIndex;
      if (!key || !canDoubleDown(state, key, index)) return state;

      const stake = roundStake(state, key);
      const playerStore = betPlayer(state.playerStore, key, stake).store;
      const player = getPlayer(playerStore, key)!;
      const deck = getPlayerHand(state.deck, key, index)
        ? updateHand(state.deck, key, index, (h) => ({ ...h, stake: (h.stake ?? stake) + stake }))
        : state.deck;
      let next: GameState = {
        ...state,
        playerStore,
        deck,
        pot: state.pot + stake,
      };
      if (isBot(player)) {
        next = updateBotAccount(next, key, (acc) => (
          acc.bank === player.bank ? acc : { ...acc, bank: player.bank }
        ));
      }
      next = recordActivity(next, player.title, `doubled down for $${stake}`, 'double', { amount: -stake });

      next = applyAction(next, { type: GameAction.Draw, playerKey: key, handIndex: index, deckSide: 'top', numberOfCards: 1 }, rng);
      if (next.gameStatus === GameStatus.InProgress && !getPlayer(next.playerStore, key)?.isBusted) {
        next = applyAction(next, { type: GameAction.Stay, playerKey: key, handIndex: index }, rng);
      }
      return next;
    }

    case GameAction.Split: {
      const { playerKey, handIndex } = action;
      const key = playerKey ?? state.playerStore.currentPlayerKey;
      const index = handIndex ?? state.activeHandIndex;
      if (!key || !canSplit(state, key, index)) return state;
      const player = getPlayer(state.playerStore, key);
      if (!player || !getPlayerHand(state.deck, key, index)) return state;
      const stake = roundStake(state, key);
      const betResult = betPlayer(state.playerStore, key, stake);
      if (!betResult.paid) return state;

      const updatedPlayer = getPlayer(betResult.store, key)!;
      let next: GameState = {
        ...state,
        playerStore: betResult.store,
        pot: state.pot + stake,
      };
      if (isBot(updatedPlayer)) {
        next = updateBotAccount(next, key, (acc) => (
          acc.bank === updatedPlayer.bank ? acc : { ...acc, bank: updatedPlayer.bank }
        ));
      }
      next = recordActivity(next, updatedPlayer.title, `split for $${stake}`, 'split', { amount: -stake });

      const { deck: splitDeck, isSplitAces } = splitPlayerHand(next.deck, key, index, stake);
      next = { ...next, deck: splitDeck };

      if (next.deck.cardKeys.length < 2) next = refillDeck(next, rng);
      for (const offset of [0, 1]) {
        const currentIndex = index + offset;
        const { deck: drawnDeck, drawn } = drawCards(next.deck, 1, 'top', rng);
        next = {
          ...next,
          deck: appendCardsToHand(drawnDeck, key, drawn, currentIndex),
          playerStore: hitPlayer(next.playerStore, key),
        };
        next = recordActivity(next, updatedPlayer.title, `drew 1 card to split hand ${currentIndex + 1}`, 'draw');
      }

      if (isSplitAces) {
        let deck = updateHand(next.deck, key, index, (h) => ({ ...h, isStaying: true }));
        deck = updateHand(deck, key, index + 1, (h) => ({ ...h, isStaying: true }));
        const playerStore = updatePlayer(next.playerStore, key, (p) => ({ ...p, isStaying: true }));
        next = advanceTurn({ ...next, deck, playerStore }, key, index);
      }
      return next;
    }

    default: {
      return state;
    }
  }

}
