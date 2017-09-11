import { MessageBarType } from "office-ui-fabric-react/lib/MessageBar";
import { EventEmitter } from "events";

/* custom stuff */
import Player from "./Player";
// import Players from './Players';

/* flux */
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";
import { DeckStore } from "./DeckStore";
import { ControlPanelStore } from "./ControlPanelStore";

/* ALMIGHTY STATE */
let Players = new PlayersStore();
let state = {
  allPlayersStaying: false,
  allPlayersBusted: false,
  allPlayersFinished: false,
  allPlayersNonBusted: false,
  // blackjackPlayers: [],
  // bustedPlayers: [],
  currentPlayerIndex: 0,
  // finishedPlayers: [],
  gameStatus: 0,
  highestHandValue: 0,
  minimumBet: 25,
  // nonBustedPlayers: [],
  players: Players.players,
  pot: 0,
  round: 0,
  stayingPlayers: [],
  turnCount: 0
};

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "change";
export const GameStore = Object.assign({}, EventEmitter.prototype, {
  getPlayers: function () {
    return Players;
  },
  getPlayer: function (id) {
    return Players.find(id);
  },
  getState: function () {
    return state;
  },
  getStatus: function () {
    return state.gameStatus;
  },
  emitChange: function () {
    this.emit(CHANGE_EVENT);
  },
  addChangeListener: function (callback) {
    this.on(CHANGE_EVENT, callback);
  },
  removeChangeListener: function (callback) {
    this.removeListener(CHANGE_EVENT, callback);
  }
});

/* Responding to Actions */
AppDispatcher.register(action => {
  /* report for debugging */
  // const now = new Date().toTimeString();
  // log(`${action.actionType} was called at ${now}`);

  switch (action.actionType) {
    case AppConstants.GAME_NEWPLAYER:
      _newPlayer(action.id, action.title);
      GameStore.emitChange();
      break;

    case AppConstants.GAME_RESET:
      _reset();
      GameStore.emitChange();
      break;

    case AppConstants.GAME_DEAL:
      _deal();
      GameStore.emitChange();
      break;

    case AppConstants.GAME_HIT:
      _hit();
      GameStore.emitChange();
      break;

    case AppConstants.GAME_STAY:
      _stay();
      GameStore.emitChange();
      break;

    case AppConstants.GAME_BET:
      _bet(action.playerId, action.amount);
      GameStore.emitChange();
      break;

    case AppConstants.GAME_NEWROUND:
      _newRound();
      GameStore.emitChange();
      break;

    default:
      break;
  }
});

/*  ========================================================  */

/* method definitions */
function _newPlayer(id, title) {
  state.players.push(new Player(id, title));
}

function _evaluateGame(statusCode) {
  if (state.players.length > 0) {
    /* 1. evaluate each player's hand and set status flags */
    state.players.forEach(player => {
      player.handValue = DeckStore.getHandValue(player.id);
      player.setStatus();
    });
  }

  switch (statusCode) {
    case 1 /*   Game in progress; first play  */:
      /*   all players bet the minimum to start  */
      if (state.turnCount === 0) _ante();
      _endGameTrap();
      break;

    case 2 /*   stay (go to next turn)  */:
      if (!_endGameTrap()) {
        /*   set current player as staying / finished */
        state.players[state.currentPlayerIndex].stay();

        /*   get the next player by index  */
        let nextPlayerIndex =
          state.currentPlayerIndex + 1 >= state.players.length
            ? 0
            : state.currentPlayerIndex + 1;

        state.gameStatus = 1;
        state.currentPlayerIndex = nextPlayerIndex;
        state.players[state.currentPlayerIndex].startTurn();

        _endGameTrap();
      }

      break;

    case 4 /*   Human Player Wins       */:
      const winningPlayerTitle = state.players[0].title;
      const messageBarText = state.players[0]
        .hasBlackJack
        ? `${winningPlayerTitle} wins with Blackjack!`
        : `${winningPlayerTitle} wins!`;
      ControlPanelStore.setMessageBar(messageBarText, MessageBarType.success);

      _payout(0);
      _endGame();
      break;

    case 7 /*   Dealer wins   */:
      ControlPanelStore.setMessageBar(`${state.players[1].title} wins!`);

      _payout(1);
      _endGame();
      break;

    default:
      break;
  }

  state.turnCount++;
}

/*   immediately evaluate game again if status > 2 (endgame condition)  */
function _endGameTrap() {
  let nextGameStatus;
  /* Set next game status */
  if (state.players[1].hasBlackJack) {
    nextGameStatus = 7;
  } else if (state.players[0].isBusted) {
    nextGameStatus = 7;
  } else if (state.players[1].isBusted) {
    nextGameStatus = 4;
  } else if (state.players[1].isStaying) {
    if (state.players[1].getHigherHandValue() > state.players[0].getHigherHandValue()) {
      nextGameStatus = 7;
    } else {
      nextGameStatus = 4;
    }
  } else {
    state.gameStatus = 1;
    return false;
  }

  if (nextGameStatus > 2) {
    _evaluateGame(nextGameStatus);
    return true;
  }
}

function _payout(i) {
  state.players[i].bank += state.pot;
  state.pot = 0;
}

/* Reset the Game */
function _reset() {
  state.players.forEach(player => {
    player.resetAll();
  });

  Players.currentPlayerIndex = 0;
  state.gameStatus = 0;
  state.pot = 0;
  state.round = 0;
  state.turnCount = 0;
}

/** Start a new round 
 * This method is called after DECK_CLEARHANDS & DECK_DEAL
 */
function _newRound() {
  Players.forEach(player => {
    player.resetStatus();
  });

  Players.currentPlayerIndex = 0;
  state.gameStatus = 0;
  state.pot = 0;
  state.round += 1;
  state.turnCount = 0;

  _deal();
}

/* pay a specified amount into the pot */
function _ante(amount = state.minimumBet) {
  ControlPanelStore.setMessageBar(`Ante: $${amount}`);
  state.players.forEach(player => {
    player.ante(amount);
    state.pot += amount;
  });
}

/* deal cards to each player and start gameplay */
function _deal() {
  state.gameStatus = 1;
  state.players[state.currentPlayerIndex].startTurn();
  _evaluateGame(1);
}

/* draw another card from the deck. A corresponding method in DeckStore actually adds a new card to the Player's hand */
function _hit() {
  Players[state.currentPlayerIndex].hit();
  _evaluateGame(1);
}

/* set currentPlayer's staying flag and re-run evaluateGame(1) */
/* evaluateGame will should re-run itself with status 2 if 
the current player is the only one staying */
function _stay() {
  _evaluateGame(2);
}

/* bet the specified amount */
function _bet(playerId, amount = state.minimumBet) {
  const index = state.players.findIndex(player => player.id === playerId);
  state.players[index].bet(amount);
}

function _endGame() {
  state.gameStatus = 0;
  state.players.forEach(player => { player.finish(); })
}

export default GameStore;
