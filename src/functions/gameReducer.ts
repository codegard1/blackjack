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
  advanceTurn, applyRoster, canDoubleDown, canSplit, collectAntes, configureCharacterWork, ensureBotAccount, isBot, isDealer, playerSeats, refillDeck, reshuffleIfLow, resolveNaturals,
  resolveShowdown, roundStake, seatOrder, setControl, syncSeatWithAccount,
} from "./round";
import { defaultBotAccount, defaultBotAccounts } from "./work";

/**
 * After a player draws, check for a bust. A busted player loses and the turn
 * moves on; a busted dealer ends the round, and every hand still in play wins.
 */
function updatePlayerHandStatus(state: GameState, playerKey: string, handIndex: number): void {
  const player = getPlayer(state.playerStore, playerKey);
  const hand = getPlayerHand(state.deck, playerKey, handIndex);
  if (!player || !hand) return;

  const isHandBusted = getPlayerHandValue(state.deck, playerKey, handIndex).highest > 21;
  state.deck = updateHand(state.deck, playerKey, handIndex, (h) => ({ ...h, isBusted: isHandBusted }));
  const isBusted = getPlayerHands(state.deck, playerKey).every((item) => item.isBusted);
  state.playerStore = updatePlayer(state.playerStore, playerKey, (p) => ({ ...p, isBusted }));
  if (!isHandBusted || state.gameStatus !== GameStatus.InProgress) return;

  if (isDealer(player)) {
    resolveShowdown(state);
  } else {
    state.deck = updateHand(state.deck, playerKey, handIndex, (h) => ({ ...h, result: 'loss' }));
    const hands = getPlayerHands(state.deck, playerKey);
    if (hands.every((item) => item.result)) {
      state.playerStore = updatePlayer(state.playerStore, playerKey, (p) => ({ ...p, result: hands[0].result }));
    }
    advanceTurn(state, playerKey, handIndex);
  }
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
  return applyAction({
    ...state,
    botAccounts: cloneBotAccounts(state.botAccounts),
    lastWriteTime,
  }, action, rng);
}

/**
 * Apply one action to a state this call owns, changing it in place and returning it.
 * An action that is made of others (a deal that starts a round, a double down) runs them
 * here, on the same copies.
 */
function applyAction(state: GameState, action: GameReducerAction, rng: () => number): GameState {

  // Announce
  debugLog('GameAction.' + action.type, action);

  // Respond to action dispatch. Inside each case the action is known to be of that type.
  switch (action.type) {

    // Toggle visibility of the spinner
    case GameAction.SetSpinnerVisible: {
      state.isSpinnerVisible = !state.isSpinnerVisible;
      return state;
    }

    case GameAction.Bet: {
      const { playerKey, betAmount } = action;
      const { store, paid } = betPlayer(state.playerStore, playerKey, betAmount);
      if (paid) {
        state.playerStore = store;
        state.pot += betAmount;
        const player = getPlayer(state.playerStore, playerKey)!;
        if (isBot(player)) ensureBotAccount(state, playerKey).bank = player.bank;
        if (state.playerStore.currentPlayerKey === playerKey) {
          const hand = getPlayerHand(state.deck, playerKey, state.activeHandIndex);
          if (hand?.cards.length) {
            state.deck = updateHand(state.deck, playerKey, state.activeHandIndex, (h) => ({
              ...h,
              stake: (h.stake ?? 0) + betAmount,
            }));
          }
        }
        recordActivity(state, player.title, `wagered $${betAmount}`, 'bet', { amount: -betAmount });
      }
      return state;
    }

    case GameAction.ConfigureWork: {
      configureCharacterWork(state, action.playerKey, {
        taskOverride: action.taskOverride,
        allowReturn: action.allowReturn,
      });
      return state;
    }

    /**
     * Initiate a new game from scratch
     */
    case GameAction.NewGame: {
      const { players, playerKeys, botAccounts } = action;
      if (isTableRules(action.tableRules)) state.tableRules = tableRulesFrom(action.tableRules);
      state.playerStore = createPlayerStore();
      state.botAccounts = {
        ...defaultBotAccounts(),
        ...cloneBotAccounts(state.botAccounts),
        ...cloneBotAccounts(botAccounts),
      };
      state.pot = 0;
      state.winner = undefined;
      state.loser = undefined;
      state.gameStatusFlag = false;

      // seats come from the players payload; otherwise the keys name default players
      const seats: IPlayerOptions[] = players ?? (playerKeys ?? []).flatMap((k) => {
        const p = defaultplayersArr.find((i) => i.key === k);
        return p ? [{ bank: p.bank, id: p.id, isNPC: p.isNPC, key: k, title: p.title, disabled: p.disabled }] : [];
      });
      seats.forEach((seat) => {
        state.playerStore = addPlayer(state.playerStore, seat);
        if (isBotId(seat.key) && !botAccounts?.[seat.key]) {
          state.botAccounts[seat.key] = {
            ...defaultBotAccount(seat.bank),
            ...(seat.awayTask ? {
              work: { status: seat.isReadyToReturn ? 'ready' : 'working', taskId: seat.awayTask, daysWorked: 0 },
            } : {}),
          };
        }
        if (isBotId(seat.key)) syncSeatWithAccount(state, seat.key);
      });
      state.deck = syncDeckHands(
        createDeck(Number(state.tableRules.numberOfDecks), rng),
        seats.map((seat) => seat.key),
      );
      state.controllingPlayer = undefined;
      state.activeHandIndex = 0;
      state.dealerHasControl = false;
      const first = firstSeat(state);
      if (first) setControl(state, first);
      state.gameStatus = GameStatus.InProgress;
      state.round = 1;
      state.turnCount = 0;
      recordActivity(state, '', 'Game started', 'game');
      return state;
    }

    /**
     * Seat a new roster between hands; ignored while a hand is in play
     */
    case GameAction.SetRoster: {
      const { players, botAccounts } = action;
      applyRoster(state, players, botAccounts);
      return state;
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
      if (isTableRules(action.tableRules)) {
        const decksChanged = state.tableRules.numberOfDecks !== action.tableRules.numberOfDecks;
        state.tableRules = tableRulesFrom(action.tableRules);
        if (decksChanged) {
          state.deck = syncDeckHands(
            createDeck(Number(state.tableRules.numberOfDecks), rng),
            allPlayers(state.playerStore).map((player) => player.key),
          );
          recordActivity(state, '', 'Deck shuffled', 'shuffle');
        }
      }
      state.deck = clearAllHands(state.deck);
      state.playerStore = resetPlayers(state.playerStore);
      state.controllingPlayer = undefined;
      state.activeHandIndex = 0;
      state.dealerHasControl = false;
      state.gameStatus = GameStatus.InProgress;
      state.gameStatusFlag = false;
      state.pot = 0;
      state.round += 1;
      state.turnCount = 1;
      recordActivity(state, '', `Round ${state.round} started`, 'round');
      reshuffleIfLow(state, rng);
      // antes come after the round starts, so they belong to the new hand
      collectAntes(state, rng);
      const first = firstSeat(state);
      if (first) setControl(state, first);
      return state;
    }

    case GameAction.Stay: {
      const { playerKey, handIndex } = action;
      const stayingPlayerKey = playerKey ?? state.playerStore.currentPlayerKey;
      const stayingPlayer = stayingPlayerKey ? getPlayer(state.playerStore, stayingPlayerKey) : undefined;
      const stayingHandIndex = handIndex ?? state.activeHandIndex;
      const stayingHand = stayingPlayerKey ? getPlayerHand(state.deck, stayingPlayerKey, stayingHandIndex) : undefined;
      if (stayingPlayerKey && stayingPlayer && stayingHand) {
        recordActivity(state, stayingPlayer.title, 'stayed', 'stay');
        state.deck = updateHand(state.deck, stayingPlayerKey, stayingHandIndex, (h) => ({ ...h, isStaying: true }));
        const hands = getPlayerHands(state.deck, stayingPlayerKey);
        const isStaying = hands.every((hand) => hand.isStaying || hand.result);
        state.playerStore = updatePlayer(state.playerStore, stayingPlayerKey, (p) => ({ ...p, isStaying }));
        if (isDealer(stayingPlayer)) {
          resolveShowdown(state);
        } else {
          advanceTurn(state, stayingPlayerKey, stayingHandIndex);
        }
      }
      return state;
    }

    // Select a card
    case GameAction.Select: {
      const { cardKey } = action;
      state.deck = selectCard(state.deck, cardKey);
      return state;
    }

    case GameAction.SitOut: {
      const human = allPlayers(state.playerStore).find((p) => !p.isNPC && !isDealer(p));
      const key = action.playerKey ?? human?.key ?? state.playerStore.currentPlayerKey;
      if (!key) return state;
      const player = getPlayer(state.playerStore, key);
      if (!player) return state;
      const isSittingOut = action.isSittingOut !== undefined ? action.isSittingOut : true;
      state.playerStore = updatePlayer(state.playerStore, key, (p) => ({ ...p, isSittingOut }));
      return state;
    }

    // Unselect a card
    case GameAction.Unselect: {
      const { cardKey } = action;
      state.deck = unselectCard(state.deck, cardKey);
      return state;
    }

    // Draw card(s) from the deck
    case GameAction.Draw: {
      const { playerKey, handIndex, deckSide, numberOfCards } = action;
      const _num = numberOfCards ?? 1;
      // a long round with many seats can run the deck dry; reshuffle what is not in play
      if (_num > 0 && state.deck.cardKeys.length < _num && state.gameStatus === GameStatus.InProgress) refillDeck(state, rng);
      // Nothing to draw (no cards asked for, or a deck that cannot cover them outside a round):
      // leave the game as it is. A reducer that throws takes the whole table down with it.
      if (_num <= 0 || state.deck.cardKeys.length < _num) return state;

      const side = deckSide === 'top' ? 'top' : deckSide === 'random' ? 'random' : 'bottom';
      const { deck: nextDeck, drawn } = drawCards(state.deck, _num, side, rng);
      state.deck = nextDeck;
      const where = deckSide === 'top' ? 'from the top' : deckSide === 'random' ? 'at random' : 'from the bottom';
      if (playerKey !== undefined) {
        const index = handIndex ?? state.activeHandIndex;
        state.deck = appendCardsToHand(state.deck, playerKey, drawn, index);
        state.playerStore = hitPlayer(state.playerStore, playerKey);
        recordActivity(state, getPlayer(state.playerStore, playerKey)!.title, `drew ${_num} card${_num === 1 ? '' : 's'} ${where}`, 'draw');
        updatePlayerHandStatus(state, playerKey, index);
      }

      return state;
    }

    // Shuffle the remaining card in the deck
    case GameAction.Shuffle: {
      state.deck = shuffleDeck(state.deck, Number(state.tableRules.numberOfDecks), rng);
      recordActivity(state, '', 'Deck shuffled', 'shuffle');
      return state;
    }

    case GameAction.Deal: {
      const hasCardsInHands = allPlayers(state.playerStore).some((player) => getPlayerHands(state.deck, player.key).some((hand) => hand.cards.length));
      if (hasCardsInHands || state.gameStatus >= GameStatus.RoundOver) {
        state = applyAction(state, { type: GameAction.NewRound, tableRules: action.tableRules }, rng);
      }
      if (playerCount(state.playerStore) === 0) return state;
      const dealtKeys = seatOrder(state).filter((key) => !getPlayer(state.playerStore, key)?.isSittingOut);
      state.activeHandIndex = 0;
      state.deck = dealCards(state.deck, 2, dealtKeys);
      dealtKeys.forEach((key) => {
        recordActivity(state, getPlayer(state.playerStore, key)!.title, 'was dealt two cards', 'deal');
      });
      resolveNaturals(state);
      return state;
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
      state.playerStore = betPlayer(state.playerStore, key, stake).store;
      state.pot += stake;
      const player = getPlayer(state.playerStore, key)!;
      if (isBot(player)) ensureBotAccount(state, key).bank = player.bank;
      if (getPlayerHand(state.deck, key, index)) {
        state.deck = updateHand(state.deck, key, index, (h) => ({ ...h, stake: (h.stake ?? stake) + stake }));
      }
      recordActivity(state, player.title, `doubled down for $${stake}`, 'double', { amount: -stake });

      state = applyAction(state, { type: GameAction.Draw, playerKey: key, handIndex: index, deckSide: 'top', numberOfCards: 1 }, rng);
      if (state.gameStatus === GameStatus.InProgress && !getPlayer(state.playerStore, key)?.isBusted) {
        state = applyAction(state, { type: GameAction.Stay, playerKey: key, handIndex: index }, rng);
      }
      return state;
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
      state.playerStore = betResult.store;
      state.pot += stake;
      const updatedPlayer = getPlayer(state.playerStore, key)!;
      if (isBot(updatedPlayer)) ensureBotAccount(state, key).bank = updatedPlayer.bank;
      recordActivity(state, updatedPlayer.title, `split for $${stake}`, 'split', { amount: -stake });

      const { deck: splitDeck, isSplitAces } = splitPlayerHand(state.deck, key, index, stake);
      state.deck = splitDeck;

      if (state.deck.cardKeys.length < 2) refillDeck(state, rng);
      for (const offset of [0, 1]) {
        const currentIndex = index + offset;
        const { deck: drawnDeck, drawn } = drawCards(state.deck, 1, 'top', rng);
        state.deck = appendCardsToHand(drawnDeck, key, drawn, currentIndex);
        state.playerStore = hitPlayer(state.playerStore, key);
        recordActivity(state, player.title, `drew 1 card to split hand ${currentIndex + 1}`, 'draw');
      }

      if (isSplitAces) {
        state.deck = updateHand(state.deck, key, index, (h) => ({ ...h, isStaying: true }));
        state.deck = updateHand(state.deck, key, index + 1, (h) => ({ ...h, isStaying: true }));
        state.playerStore = updatePlayer(state.playerStore, key, (p) => ({ ...p, isStaying: true }));
        advanceTurn(state, key, index);
      }
      return state;
    }

    default: {
      return state;
    }
  }

}
