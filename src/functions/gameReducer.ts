import { PlayerStore } from "../classes/PlayerStore";
import { PlayingCard } from "../classes/PlayingCard";
import { PlayingCardDeck } from "../classes/PlayingCardDeck";
import { createGameState, gameDefaults } from "../context";
import { defaultplayersArr } from "../definitions";
import { GameAction, GameStatus } from "../enums";
import { IGameReducerAction } from "../interfaces";
import { ActivityLogEntry, GameState } from "../types";
import { evaluateGame, roundStake } from "./evaluateGame";
import { debugLog } from "./debugLog";

function recordActivity(state: GameState, name: string, description: string, event: ActivityLogEntry['event']): void {
  const lastEntry = state.activityLog[state.activityLog.length - 1];
  state.activityLog = [...state.activityLog, {
    id: (lastEntry?.id ?? 0) + 1,
    sessionId: event === 'game' ? (lastEntry ? (lastEntry.sessionId ?? 1) + 1 : 1) : (lastEntry?.sessionId ?? 1),
    event,
    timestamp: Date.now(),
    name,
    description,
  }];
}

function endRound(state: GameState, outcome: GameStatus.HumanWins | GameStatus.DealerWins | GameStatus.Push): void {
  state.gameStatus = outcome;
  state.controllingPlayer = undefined;
  state.dealerHasControl = false;
}

/**
 * After a player draws, end the round if they busted.
 */
function updatePlayerHandStatus(state: GameState, playerKey: string): void {
  const player = state.playerStore.player(playerKey);
  if (!player || !state.deck.playerHands[playerKey]) return;

  player.isBusted = state.deck.getHandValue(playerKey).highest > 21;
  if (player.isBusted) endRound(state, player.isNPC ? GameStatus.HumanWins : GameStatus.DealerWins);
}

/**
 * After the deal, flag natural blackjacks and settle them immediately.
 * If both the human and the dealer have one, the round is a push.
 */
function resolveNaturals(state: GameState): void {
  state.playerStore.all.forEach((player) => {
    const hand = state.deck.playerHands[player.key];
    player.isBlackjack = hand?.cards.length === 2 && state.deck.getHandValue(player.key).highest === 21;
  });

  const human = state.playerStore.all.find((player) => !player.isNPC);
  const dealer = state.playerStore.all.find((player) => player.isNPC);
  if (!human || !dealer) return;

  if (human.isBlackjack && dealer.isBlackjack) {
    endRound(state, GameStatus.Push);
    recordActivity(state, '', 'Both players have blackjack; round pushed', 'push');
  } else if (human.isBlackjack) {
    endRound(state, GameStatus.HumanWins);
    recordActivity(state, human.title, 'won the round with blackjack', 'win');
  } else if (dealer.isBlackjack) {
    endRound(state, GameStatus.DealerWins);
    recordActivity(state, dealer.title, 'won the round with blackjack', 'win');
  }
}

/**
 * Compare final totals once the dealer stands.
 */
function resolveShowdown(state: GameState): void {
  const human = state.playerStore.all.find((player) => !player.isNPC);
  const dealer = state.playerStore.player('dealer') ?? state.playerStore.all.find((player) => player.isNPC);
  if (!human || !dealer) return;

  const humanTotal = state.deck.getHandValue(human.key).highest;
  const dealerTotal = state.deck.getHandValue(dealer.key).highest;

  if (dealerTotal > 21 || humanTotal > dealerTotal) {
    endRound(state, GameStatus.HumanWins);
    recordActivity(state, human.title, 'won the round', 'win');
  } else if (humanTotal === dealerTotal) {
    endRound(state, GameStatus.Push);
    recordActivity(state, '', `Round pushed at ${humanTotal}`, 'push');
  } else {
    endRound(state, GameStatus.DealerWins);
    recordActivity(state, dealer.title, 'won the round', 'win');
  }
}

/**
 * True when the given human player may double down: it is their turn in a
 * live round, they hold exactly two cards, and they can cover their stake.
 */
export function canDoubleDown(state: GameState, playerKey: string): boolean {
  const player = state.playerStore.player(playerKey);
  const stake = roundStake(state, playerKey);
  return !!player
    && !player.isNPC
    && state.gameStatus === GameStatus.InProgress
    && state.playerStore.currentPlayerKey === playerKey
    && state.deck.playerHands[playerKey]?.cards.length === 2
    && stake > 0
    && player.bank >= stake;
}

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
        recordActivity(state, state.playerStore.player(playerKey).title, `wagered $${betAmount}`, 'bet');
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

      if (undefined !== playerKey && typeof playerKey !== 'string') {
        playerKey.forEach(k => {
          const p = defaultplayersArr.find((i) => i.key === k);
          if (undefined !== p) {
            state.playerStore.newPlayer({ bank: p.bank, id: p.id, isNPC: p.isNPC, key: k, title: p.title, disabled: p.disabled });
          }
          state.deck.newPlayerHand(k);
        });
        state.playerStore.currentPlayerKey = state.playerStore.activePlayerKeys[0];
      }
      state.controllingPlayer = state.playerStore.currentPlayer?.key;
      state.dealerHasControl = state.playerStore.currentPlayer?.key === 'dealer';
      if (state.controllingPlayer) state.playerStore.startTurn(state.controllingPlayer);
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
      const firstHuman = state.playerStore.all.find((player) => !player.isNPC) ?? state.playerStore.all[0];
      state.playerStore.currentPlayerKey = firstHuman?.key;
      if (firstHuman) state.playerStore.startTurn(firstHuman.key);
      state.controllingPlayer = firstHuman?.key;
      state.dealerHasControl = false;
      state.gameStatus = GameStatus.InProgress;
      state.gameStatusFlag = false;
      state.pot = 0;
      state.playerStore.all.forEach((player) => {
        if (state.playerStore.ante(player.key, state.minimumBet)) state.pot += state.minimumBet;
      });
      state.round += 1;
      state.turnCount = 1;
      recordActivity(state, '', `Round ${state.round} started`, 'round');
      return state;
    }

    case GameAction.Stay: {
      const stayingPlayerKey = typeof playerKey === 'string' ? playerKey : state.playerStore.currentPlayerKey;
      if (stayingPlayerKey && state.playerStore.player(stayingPlayerKey)) {
        recordActivity(state, state.playerStore.player(stayingPlayerKey).title, 'stayed', 'stay');
        state.playerStore.stay(stayingPlayerKey);
        if (stayingPlayerKey !== 'dealer' && state.playerStore.player('dealer')) {
          state.playerStore.currentPlayerKey = 'dealer';
          state.playerStore.startTurn('dealer');
          state.controllingPlayer = 'dealer';
          state.dealerHasControl = true;
        } else {
          resolveShowdown(state);
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

        switch (deckSide) {
          case 'top': {
            const _drawn = state.deck.draw(_num);
            if (undefined !== playerKey && typeof playerKey === 'string') {
              if (!state.deck.playerHands[playerKey]) state.deck.newPlayerHand(playerKey);
              state.deck.playerHands[playerKey].cards.push(..._drawn);
              state.deck.updateHandValue(playerKey);
              state.playerStore.hit(playerKey);
              updatePlayerHandStatus(state, playerKey);
              recordActivity(state, state.playerStore.player(playerKey).title, `drew ${_num} card${_num === 1 ? '' : 's'} from the top`, 'draw');
            }
            break;
          }
          case 'random': {
            const _drawn = state.deck.drawRandom(_num);
            if (undefined !== playerKey && typeof playerKey === 'string') {
              if (!state.deck.playerHands[playerKey]) state.deck.newPlayerHand(playerKey);
              state.deck.playerHands[playerKey].cards.push(..._drawn);
              state.deck.updateHandValue(playerKey);
              state.playerStore.hit(playerKey);
              updatePlayerHandStatus(state, playerKey);
              recordActivity(state, state.playerStore.player(playerKey).title, `drew ${_num} card${_num === 1 ? '' : 's'} at random`, 'draw');
            }
            break;
          }
          default: {
            const _drawn = state.deck.drawFromBottomOfDeck(_num);
            if (undefined !== playerKey && typeof playerKey === 'string') {
              if (!state.deck.playerHands[playerKey]) state.deck.newPlayerHand(playerKey);
              state.deck.playerHands[playerKey].cards.push(..._drawn);
              state.deck.updateHandValue(playerKey);
              state.playerStore.hit(playerKey);
              updatePlayerHandStatus(state, playerKey);
              recordActivity(state, state.playerStore.player(playerKey).title, `drew ${_num} card${_num === 1 ? '' : 's'} from the bottom`, 'draw');
            }
            break;
          }
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
      if (hasCardsInHands || state.gameStatus >= GameStatus.HumanWins) {
        state = gameReducer(state, { type: GameAction.NewRound });
      }
      if (state.playerStore.length === 0) return state;
      state.deck.deal(2);
      state.playerStore.all.forEach((player) => {
        state.deck.updateHandValue(player.key);
        recordActivity(state, player.title, 'was dealt two cards', 'deal');
      });
      resolveNaturals(state);
      return state;
    }

    /**
     * Double the human's stake, draw exactly one card, then stand
     * (unless the card busts them). Only allowed on a two-card hand.
     */
    case GameAction.DoubleDown: {
      const key = typeof playerKey === 'string' ? playerKey : state.playerStore.currentPlayerKey;
      if (!key || !canDoubleDown(state, key)) return state;

      const stake = roundStake(state, key);
      state.playerStore.bet(key, stake);
      state.pot += stake;
      recordActivity(state, state.playerStore.player(key).title, `doubled down for $${stake}`, 'double');

      state = gameReducer(state, { type: GameAction.Draw, playerKey: key, deckSide: 'top', numberOfCards: 1 });
      if (state.gameStatus === GameStatus.InProgress) {
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
