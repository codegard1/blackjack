import { PlayerStore } from "../classes/PlayerStore";
import { PlayingCard } from "../classes/PlayingCard";
import { PlayingCardDeck } from "../classes/PlayingCardDeck";
import { createGameState } from "../context";
import { defaultplayersArr } from "../definitions";
import { GameAction, GameStatus } from "../enums";
import { IGameReducerAction, IPlayerOptions } from "../interfaces";
import { ActivityLogEntry, GameState, PlayerHand } from "../types";
import { evaluateGame } from "./evaluateGame";
import { debugLog } from "./debugLog";
import { recordActivity } from "./activity";
import { restoreGameState } from "./persistence";
import {
  advanceTurn, applyRoster, canDoubleDown, canSplit, collectAntes, isDealer, playerSeats, refillDeck, reshuffleIfLow, resolveNaturals,
  resolveShowdown, roundStake, seatOrder, setControl,
} from "./round";

/**
 * After a player draws, check for a bust. A busted player loses and the turn
 * moves on; a busted dealer ends the round, and every hand still in play wins.
 */
function updatePlayerHandStatus(state: GameState, playerKey: string, handIndex: number): void {
  const player = state.playerStore.player(playerKey);
  const hand = state.deck.hand(playerKey, handIndex);
  if (!player || !hand) return;

  hand.isBusted = state.deck.getHandValue(playerKey, handIndex).highest > 21;
  player.isBusted = state.deck.getHands(playerKey).every((item) => item.isBusted);
  if (!hand.isBusted || state.gameStatus !== GameStatus.InProgress) return;

  if (isDealer(player)) {
    resolveShowdown(state);
  } else {
    hand.result = 'loss';
    const hands = state.deck.getHands(playerKey);
    if (hands.every((item) => item.result)) player.result = hands[0].result;
    advanceTurn(state, playerKey, handIndex);
  }
}

/** The first seat to act in a round: the first player who has not sat out */
function firstSeat(state: GameState): string | undefined {
  return playerSeats(state).find((player) => !player.isSittingOut)?.key ?? state.playerStore.activePlayerKeys[0];
}

export { canDoubleDown, canSplit } from "./round";

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
    handIndex,
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

    case GameAction.SetMinimumBet: {
      if (undefined !== minimumBet)
        state.minimumBet = minimumBet;
      return state;
    }

    case GameAction.Bet: {
      if (typeof playerKey === 'string' && undefined !== betAmount && state.playerStore.bet(playerKey, betAmount)) {
        state.pot += betAmount;
        if (state.playerStore.currentPlayerKey === playerKey) {
          const hand = state.deck.hand(playerKey, state.activeHandIndex);
          if (hand?.cards.length) hand.stake = (hand.stake ?? 0) + betAmount;
        }
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
      if (players) applyRoster(state, players);
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
      state.activeHandIndex = 0;
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
      const stayingHandIndex = handIndex ?? state.activeHandIndex;
      const stayingHand = stayingPlayerKey ? state.deck.hand(stayingPlayerKey, stayingHandIndex) : undefined;
      if (stayingPlayerKey && stayingPlayer && stayingHand) {
        recordActivity(state, stayingPlayer.title, 'stayed', 'stay');
        stayingHand.isStaying = true;
        const hands = state.deck.getHands(stayingPlayerKey);
        stayingPlayer.isStaying = hands.every((hand) => hand.isStaying || hand.result);
        if (isDealer(stayingPlayer)) {
          resolveShowdown(state);
        } else {
          advanceTurn(state, stayingPlayerKey, stayingHandIndex);
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
      // a long round with many seats can run the deck dry; reshuffle what is not in play
      if (_num > 0 && state.deck.length < _num && state.gameStatus === GameStatus.InProgress) refillDeck(state);
      if (_num > 0 && state.deck.length >= _num) {
        const _drawn = deckSide === 'top' ? state.deck.draw(_num)
          : deckSide === 'random' ? state.deck.drawRandom(_num)
          : state.deck.drawFromBottomOfDeck(_num);
        const where = deckSide === 'top' ? 'from the top' : deckSide === 'random' ? 'at random' : 'from the bottom';
        if (undefined !== playerKey && typeof playerKey === 'string') {
          if (!state.deck.playerHands[playerKey]) state.deck.newPlayerHand(playerKey);
          const index = handIndex ?? state.activeHandIndex;
          const hand = state.deck.hand(playerKey, index)!;
          hand.cards.push(..._drawn);
          state.deck.updateHandValue(playerKey, index);
          state.playerStore.hit(playerKey);
          recordActivity(state, state.playerStore.player(playerKey).title, `drew ${_num} card${_num === 1 ? '' : 's'} ${where}`, 'draw');
          updatePlayerHandStatus(state, playerKey, index);
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
      const hasCardsInHands = state.playerStore.all.some((player) => state.deck.getHands(player.key).some((hand) => hand.cards.length));
      if (hasCardsInHands || state.gameStatus >= GameStatus.RoundOver) {
        state = gameReducer(state, { type: GameAction.NewRound });
      }
      if (state.playerStore.length === 0) return state;
      const dealtKeys = seatOrder(state).filter((key) => !state.playerStore.player(key).isSittingOut);
      state.activeHandIndex = 0;
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
      const index = handIndex ?? state.activeHandIndex;
      if (!key || !canDoubleDown(state, key, index)) return state;

      const stake = roundStake(state, key);
      state.playerStore.bet(key, stake);
      state.pot += stake;
      const hand = state.deck.hand(key, index);
      if (hand) hand.stake = (hand.stake ?? stake) + stake;
      recordActivity(state, state.playerStore.player(key).title, `doubled down for $${stake}`, 'double', { amount: -stake });

      state = gameReducer(state, { type: GameAction.Draw, playerKey: key, handIndex: index, deckSide: 'top', numberOfCards: 1 });
      if (state.gameStatus === GameStatus.InProgress && !state.playerStore.player(key).isBusted) {
        state = gameReducer(state, { type: GameAction.Stay, playerKey: key, handIndex: index });
      }
      return state;
    }

    case GameAction.Split: {
      const key = typeof playerKey === 'string' ? playerKey : state.playerStore.currentPlayerKey;
      const index = handIndex ?? state.activeHandIndex;
      if (!key || !canSplit(state, key, index)) return state;
      const player = state.playerStore.player(key);
      const hand = state.deck.hand(key, index)!;
      const stake = roundStake(state, key);
      if (!state.playerStore.bet(key, stake)) return state;
      state.pot += stake;
      recordActivity(state, player.title, `split for $${stake}`, 'split', { amount: -stake });

      const [movedCard] = hand.cards.splice(1, 1);
      const splitHand: PlayerHand = {
        cards: [movedCard],
        handValue: { aceAsEleven: 0, aceAsOne: 0, highest: 0 },
        stake,
        isSplit: true,
      };
      hand.stake = stake;
      hand.isSplit = true;
      hand.splitHands = [...(hand.splitHands ?? []), splitHand];
      state.deck.updateHandValue(key, index);
      state.deck.updateHandValue(key, index + 1);

      const isSplitAces = Number(movedCard.slice(movedCard.lastIndexOf('_') + 1)) === 14;
      if (isSplitAces) {
        hand.isSplitAces = true;
        splitHand.isSplitAces = true;
      }

      if (state.deck.length < 2) refillDeck(state);
      [hand, splitHand].forEach((currentHand, offset) => {
        const currentIndex = index + offset;
        currentHand.cards.push(...state.deck.draw(1));
        state.deck.updateHandValue(key, currentIndex);
        state.playerStore.hit(key);
        recordActivity(state, player.title, `drew 1 card to split hand ${currentIndex + 1}`, 'draw');
      });

      if (isSplitAces) {
        hand.isStaying = true;
        splitHand.isStaying = true;
        player.isStaying = true;
        advanceTurn(state, key, index);
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
