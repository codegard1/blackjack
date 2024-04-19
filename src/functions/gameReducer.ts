import { PlayerStore, PlayingCard, PlayingCardDeck } from "../classes";
import { gameDefaults } from "../context";
import { defaultplayersArr } from "../definitions";
import { GameAction, GameStatus } from "../enums";
import { IGameReducerAction } from "../interfaces";
import { GameState } from "../types";
import { endgameTrap, evaluateGame } from "./";

/**
 * Reducer function for game state
 * @param state game state object
 * @param action action containing the state parameters
 * @returns modified game state
 */
export function gameReducer(state: GameState, action: IGameReducerAction) {

  // Action props
  const {
    cardKey,
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
  console.log('## GameAction.' + type, JSON.stringify(action));

  // Evaluate game state every time 
  state = evaluateGame(state, action);

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
      return state;
    }

    case GameAction.SetGameStatus: {
      if (undefined !== gameStatus) state.gameStatus = gameStatus;
      return state;
    }

    // TODO
    case GameAction.EndGame: {
      return state;
    }

    /**
     * Initiate a new game from scratch
     */
    case GameAction.NewGame: {
      state.playerStore.reset();
      state.deck.reset();

      // This is redundant with playerStore.reset(). Consider removing
      if (undefined !== playerKey && typeof playerKey !== 'string') {
        playerKey.forEach(k => {
          if (undefined !== state.playerStore.player(k)) {
            state.playerStore.resetPlayer(k, 'bank');
          }
          else {
            const p = defaultplayersArr.find((i) => i.key === k);
            if (undefined !== p)
              state.playerStore.newPlayer({ bank: p.bank, id: p.id, isNPC: p.isNPC, key: k, title: p.title, disabled: p.disabled })
          }
          state.deck.newPlayerHand(k);
        });
        state.playerStore.currentPlayerKey = playerKey[0];
      }
      state.controllingPlayer = state.playerStore.currentPlayer?.key;
      state.gameStatus = GameStatus.InProgress;
      state.round = 1;
      state.turnCount = 0;
      return state;
    }

    // TODO
    case GameAction.EvaluateGame: {
      return evaluateGame(state, action);
    }

    // TODO: Refactor this inelegant piece of work
    case GameAction.EndGameTrap: {
      return endgameTrap(state, action);
    }

    /**
     * Reset game state to default
     */
    case GameAction.ResetGame: {
      state.deck.reset();
      state.playerStore.reset();
      state.controllingPlayer = gameDefaults.controllingPlayer;
      state.dealerHasControl = gameDefaults.dealerHasControl;
      state.gameStatus = gameDefaults.gameStatus;
      state.gameStatusFlag = gameDefaults.gameStatusFlag;
      state.isSpinnerVisible = gameDefaults.isSpinnerVisible;
      state.lastWriteTime = gameDefaults.lastWriteTime;
      state.loser = gameDefaults.loser;
      state.messageBarDefinition = gameDefaults.messageBarDefinition;
      state.minimumBet = gameDefaults.minimumBet;
      state.playerStore = gameDefaults.playerStore;
      state.pot = gameDefaults.pot;
      state.round = gameDefaults.round;
      state.turnCount = gameDefaults.turnCount;
      state.winner = gameDefaults.winner;
      return state;
    }

    // TODO
    case GameAction.SetLoser: {
      if (undefined !== playerKey && typeof playerKey === 'string')
        state.loser = playerKey;
      return state;
    }

    // TODO
    case GameAction.SetWinner: {
      if (undefined !== playerKey && typeof playerKey === 'string')
        state.winner = playerKey;
      return state;
    }

    /**
     * Start a new round of a continuous game
     */
    case GameAction.NewRound: {
      state.controllingPlayer = state.playerStore.currentPlayerKey;
      state.gameStatus = GameStatus.InProgress;
      state.pot = 0;
      state.round = state.round + 1;
      state.turnCount = 0;
      return state;
    }

    // TODO
    case GameAction.Stay: {
      if (state.gameStatus !== GameStatus.Init && state.gameStatusFlag) {
        state.controllingPlayer = 'dealer';
      }
      return state;
    }

    // TODO
    case GameAction.Ante: {
      state.playerStore.allPlayersAnte(state.minimumBet);
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
      const _num = (undefined === numberOfCards) ? 0 : numberOfCards;
      if (state.deck.length > _num) {

        switch (deckSide) {
          case 'top': {
            console.log('draw from the top')
            const _drawn = state.deck.draw(_num);
            if (undefined !== playerKey && typeof playerKey === 'string')
              state.deck.playerHands[playerKey].cards.push(..._drawn);
            break;
          }
          case 'random': {
            const _drawn = state.deck.drawRandom(_num);
            if (undefined !== playerKey && typeof playerKey === 'string')
              state.deck.playerHands[playerKey].cards.push(..._drawn);
            break;
          }
          default: {
            const _drawn = state.deck.drawFromBottomOfDeck(_num);
            if (undefined !== playerKey && typeof playerKey === 'string')
              state.deck.playerHands[playerKey].cards.push(..._drawn);
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
      return state;
    }

    case GameAction.Deal: {
      state.deck.deal(2);
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
