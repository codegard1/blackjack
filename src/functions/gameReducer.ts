import { PlayerStore } from "../classes/PlayerStore";
import { PlayingCard } from "../classes/PlayingCard";
import { PlayingCardDeck } from "../classes/PlayingCardDeck";
import { createGameState, gameDefaults } from "../context";
import { defaultplayersArr } from "../definitions";
import { GameAction, GameStatus } from "../enums";
import { IGameReducerAction, IPlayerOptions } from "../interfaces";
import { ActivityLogEntry, GameState } from "../types";
import { evaluateGame } from "./evaluateGame";
import { debugLog } from "./debugLog";
import { recordActivity } from "./activity";
import {
  advanceTurn, canDoubleDown, collectAntes, isDealer, playerSeats, reshuffleIfLow, resolveNaturals,
  resolveShowdown, roundStake, seatOrder, setControl,
} from "./round";

/**
 * After a player draws, check for a bust. A busted player loses and the turn
 * moves on; a busted dealer ends the round, and every hand still in play wins.
 */
function updatePlayerHandStatus(state: GameState, playerKey: string): void {
  const player = state.playerStore.player(playerKey);
  if (!player || !state.deck.playerHands[playerKey]) return;

  player.isBusted = state.deck.getHandValue(playerKey).highest > 21;
  if (!player.isBusted || state.gameStatus !== GameStatus.InProgress) return;

  if (isDealer(player)) {
    resolveShowdown(state);
  } else {
    player.result = 'loss';
    state.playerStore.finish(playerKey);
    advanceTurn(state, playerKey);
  }
}

/** The first seat to act in a round: the first player who has not sat out */
function firstSeat(state: GameState): string | undefined {
  return playerSeats(state).find((player) => !player.isSittingOut)?.key ?? state.playerStore.activePlayerKeys[0];
}

export { canDoubleDown } from "./round";

/**
 * Reducer function for game state
 * @param state game state object
 * @param action action containing the state parameters
 * @returns modified game state
 */
export function gameReducer(state: GameState, action: IGameReducerAction) {
  state = { ...state };

  // Action props
  const {
    cardKey,
    betAmount,
    controllingPlayerKey,
    deckSide,
    deckState,
    gameStatus,
    messageBarDefinition,
    minimumBet,
    numberOfCards,
    playerKey,
    playerState,
    players,
    potIncrement,
    type,
  } = action;

  // Announce
  debugLog('GameAction.' + type, action);

  // Mandatory state mutations
  state.lastWriteTime = new Date().toISOString();


  // Respond to action dispatch
  switch (type) {

    /**
     * Replace the current deck with one initialized from saved options
     */
    case GameAction.SetDeckState: {
      if (undefined !== deckState) state.deck = new PlayingCardDeck(deckState);
      return state;
    }

    /**
     * Replace the current playerStore with one initialize from saved options
     */
    case GameAction.SetPlayerState: {
      if (undefined !== playerState) state.playerStore = new PlayerStore(playerState);
      return state;
    }

    // Toggle visibility of the spinner
    case GameAction.SetSpinnerVisible: {
      state.isSpinnerVisible = !state.isSpinnerVisible;
      return state;
    }

    case GameAction.ShowMessageBar: {
      if (undefined === messageBarDefinition) {
        state.messageBarDefinition = gameDefaults.messageBarDefinition;
      } else {
        state.messageBarDefinition = messageBarDefinition;
      }
      return state;
    }

    case GameAction.SetMinimumBet: {
      if (undefined !== minimumBet)
        state.minimumBet = minimumBet;
      return state;
    }

    case GameAction.Bet: {
      if (typeof playerKey === 'string' && undefined !== betAmount && state.playerStore.bet(playerKey, betAmount)) {
        state.pot += betAmount;
        recordActivity(state, state.playerStore.player(playerKey).title, `wagered $${betAmount}`, 'bet', { amount: -betAmount });
      }
      return state;
    }

    case GameAction.AddToPot: {
      if (undefined !== potIncrement)
        state.pot += potIncrement;
      return state;
    }

    case GameAction.IncrementRound: {
      state.round += 1;
      return state;
    }

    case GameAction.IncrementTurn: {
      state.turnCount += 1;
      return state;
    }

    case GameAction.SetControllingPlayer: {
      state.controllingPlayer = controllingPlayerKey;
      state.dealerHasControl = controllingPlayerKey === 'dealer';
      if (undefined !== controllingPlayerKey) {
        state.playerStore.currentPlayerKey = controllingPlayerKey;
        state.playerStore.startTurn(controllingPlayerKey);
      }
      return state;
    }

    case GameAction.SetGameStatus: {
      if (undefined !== gameStatus) state.gameStatus = gameStatus;
      return state;
    }

    /**
     * Initiate a new game from scratch
     */
    case GameAction.NewGame: {
      state.playerStore = new PlayerStore();
      state.deck = new PlayingCardDeck();
      state.pot = 0;
      state.winner = undefined;
      state.loser = undefined;
      state.gameStatusFlag = false;

      // seats come from the players payload; otherwise the keys name default players
      const seats: IPlayerOptions[] = players ?? (Array.isArray(playerKey)
        ? playerKey.flatMap((k) => {
          const p = defaultplayersArr.find((i) => i.key === k);
          return p ? [{ bank: p.bank, id: p.id, isNPC: p.isNPC, key: k, title: p.title, disabled: p.disabled }] : [];
        })
        : []);
      seats.forEach((seat) => {
        state.playerStore.newPlayer(seat);
        state.deck.newPlayerHand(seat.key);
      });
      state.controllingPlayer = undefined;
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
     * Run status-driven bookkeeping (opening ante, payouts, stats)
     */
    case GameAction.EvaluateGame: {
      return evaluateGame(state, action);
    }

    /**
     * Reset game state to default
     */
    case GameAction.ResetGame: {
      return { ...createGameState(), activityLog: action.clearActivityLog ? [] : state.activityLog };
    }

    // Record the loser of the current round
    case GameAction.SetLoser: {
      if (undefined !== playerKey && typeof playerKey === 'string')
        state.loser = playerKey;
      return state;
    }

    // Record the winner of the current round
    case GameAction.SetWinner: {
      if (undefined !== playerKey && typeof playerKey === 'string')
        state.winner = playerKey;
      return state;
    }

    /**
     * Start a new round of a continuous game
     */
    case GameAction.NewRound: {
      state.deck.clearHands();
      state.playerStore.reset();
      state.controllingPlayer = undefined;
      state.dealerHasControl = false;
      state.gameStatus = GameStatus.InProgress;
      state.gameStatusFlag = false;
      state.pot = 0;
      state.round += 1;
      state.turnCount = 1;
      recordActivity(state, '', `Round ${state.round} started`, 'round');
      reshuffleIfLow(state);
      // antes come after the round starts, so they belong to the new hand
      collectAntes(state);
      const first = firstSeat(state);
      if (first) setControl(state, first);
      return state;
    }

    case GameAction.Stay: {
      const stayingPlayerKey = typeof playerKey === 'string' ? playerKey : state.playerStore.currentPlayerKey;
      const stayingPlayer = stayingPlayerKey ? state.playerStore.player(stayingPlayerKey) : undefined;
      if (stayingPlayerKey && stayingPlayer) {
        recordActivity(state, stayingPlayer.title, 'stayed', 'stay');
        state.playerStore.stay(stayingPlayerKey);
        if (isDealer(stayingPlayer)) {
          resolveShowdown(state);
        } else {
          advanceTurn(state, stayingPlayerKey);
        }
      }
      return state;
    }

    // Clear the list of selected cards
    case GameAction.ClearSelected: {
      state.deck.clearSelected();
      return state;
    }

    // Create an entry in the playerHands list for the given Player
    case GameAction.NewPlayerHand: {
      // Single Player
      if (undefined !== playerKey && typeof playerKey === 'string')
        state.deck.newPlayerHand(playerKey);
      // Multiple Players
      if (undefined !== playerKey && typeof playerKey !== 'string') {
        playerKey.forEach((pk) => state.deck.newPlayerHand(pk));
      }
      return state;
    }

    // Select a card
    case GameAction.Select: {
      // If no cardKey was passed then do nothing 
      if (undefined !== cardKey) state.deck.select(cardKey);
      return state;
    }

    // Unselect a card
    case GameAction.Unselect: {
      if (undefined !== cardKey) state.deck.unselect(cardKey);
      return state;
    }

    // Draw card(s) from the deck
    case GameAction.Draw: {
      const _num = numberOfCards ?? 1;
      if (_num > 0 && state.deck.length >= _num) {
        const _drawn = deckSide === 'top' ? state.deck.draw(_num)
          : deckSide === 'random' ? state.deck.drawRandom(_num)
          : state.deck.drawFromBottomOfDeck(_num);
        const where = deckSide === 'top' ? 'from the top' : deckSide === 'random' ? 'at random' : 'from the bottom';
        if (undefined !== playerKey && typeof playerKey === 'string') {
          if (!state.deck.playerHands[playerKey]) state.deck.newPlayerHand(playerKey);
          state.deck.playerHands[playerKey].cards.push(..._drawn);
          state.deck.updateHandValue(playerKey);
          state.playerStore.hit(playerKey);
          recordActivity(state, state.playerStore.player(playerKey).title, `drew ${_num} card${_num === 1 ? '' : 's'} ${where}`, 'draw');
          updatePlayerHandStatus(state, playerKey);
        }
      } else {
        throw new Error('There are not enough cards left in the deck to draw');
      }

      state.lastWriteTime = new Date().toISOString();

      return state;
    }

    // Put one card into the deck
    case GameAction.Put: {

      // If no cardKey was passed then do nothing
      if (undefined === cardKey) return state;

      // If cardKey is not in the deck already then put it
      if (!(state.deck.has(cardKey))) {

        // deckSide determines where in the cardKeys array the cardKey goes
        if (undefined !== deckSide) {
          switch (deckSide) {
            case 'top':
              state.deck.putOnTopOfDeck([new PlayingCard(cardKey)])
              break;
            case 'random':
              state.deck.putInMiddleOfDeck([new PlayingCard(cardKey)]);
              break;
            default:
              state.deck.putOnBottomOfDeck([new PlayingCard(cardKey)]);
              break;
          }
        }
      }

      return state;
    }

    // Shuffle the remaining card in the deck
    case GameAction.Shuffle: {
      state.deck.shuffle();
      recordActivity(state, '', 'Deck shuffled', 'shuffle');
      return state;
    }

    case GameAction.Deal: {
      const hasCardsInHands = state.playerStore.all.some((player) => state.deck.playerHands[player.key]?.cards.length);
      if (hasCardsInHands || state.gameStatus >= GameStatus.RoundOver) {
        state = gameReducer(state, { type: GameAction.NewRound });
      }
      if (state.playerStore.length === 0) return state;
      const dealtKeys = seatOrder(state).filter((key) => !state.playerStore.player(key).isSittingOut);
      state.deck.deal(2, dealtKeys);
      dealtKeys.forEach((key) => {
        state.deck.updateHandValue(key);
        recordActivity(state, state.playerStore.player(key).title, 'was dealt two cards', 'deal');
      });
      resolveNaturals(state);
      return state;
    }

    /**
     * Double the player's stake, draw exactly one card, then stand
     * (unless the card busts them). Only allowed on a two-card hand.
     */
    case GameAction.DoubleDown: {
      const key = typeof playerKey === 'string' ? playerKey : state.playerStore.currentPlayerKey;
      if (!key || !canDoubleDown(state, key)) return state;

      const stake = roundStake(state, key);
      state.playerStore.bet(key, stake);
      state.pot += stake;
      recordActivity(state, state.playerStore.player(key).title, `doubled down for $${stake}`, 'double', { amount: -stake });

      state = gameReducer(state, { type: GameAction.Draw, playerKey: key, deckSide: 'top', numberOfCards: 1 });
      if (state.gameStatus === GameStatus.InProgress && !state.playerStore.player(key).isBusted) {
        state = gameReducer(state, { type: GameAction.Stay, playerKey: key });
      }
      return state;
    }

    // Populate and shuffle the deck
    case GameAction.Reset: {
      state.deck.reset();
      return state;
    }

    default: {
      return state;
    }
  }

}
