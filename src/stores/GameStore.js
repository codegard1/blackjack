import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";
import { DeckStore } from "./DeckStore";
import { ControlPanelStore } from './ControlPanelStore';
import { log } from "../utils";
import { MessageBarType } from "office-ui-fabric-react/lib/MessageBar";
import * as D from "../definitions";
import Player from "./Player";
// import Players from './Players';


/* "state" variables */
let allPlayersStaying = false,
  allPlayersBusted = false,
  allPlayersNonBusted = false,
  bustedPlayers = [],
  stayingPlayers = [],
  currentPlayerIndex = 0,
  gameStatus = 0,
  highestHandValue = 0,
  minimumBet = 25,
  nonBustedPlayers = [],
  tieFlag = false,
  turnCount = 0,
  players = [],
  pot = 0,
  round = 0,
  winningPlayerId,
  winningPlayerIndex;

let state = {
  allPlayersStaying,
  allPlayersBusted,
  allPlayersNonBusted,
  bustedPlayers,
  stayingPlayers,
  currentPlayerIndex,
  gameStatus,
  highestHandValue,
  minimumBet,
  nonBustedPlayers,
  tieFlag,
  turnCount,
  players,
  pot,
  round,
  winningPlayerId,
  winningPlayerIndex,
};

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "change";
export const GameStore = Object.assign({}, EventEmitter.prototype, {
  getPlayers: function () {
    return players;
  },
  getPlayer: function (id) {
    return players.find(player => player.id === id);
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
  const now = new Date().toTimeString();
  log(`${action.actionType} was called at ${now}`);

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
  players.push(
    new Player(id, title)
  );
}

function _evaluateGame(
  nextGameStatus = state.gameStatus,
  nextPlayer = state.currentPlayerIndex
) {
  /*   set player status, handValue, and other flags  */
  _evaluatePlayers();

  const currentPlayerStatus = players.length > 0
    ? state.players[currentPlayerIndex].status
    : '';

  switch (nextGameStatus) {
    case 0 /*  Off  */:
      break;

    case 1 /*   Game in progress  */:
      ControlPanelStore.setMessageBar("Game in progress");

      /*   all players bet the minimum to start  */
      if (turnCount === 0) {
        _ante();
      }

      /*   set next game status.  */
      /*   if it ends up being higher than 2, _exitTrap() will catch it and re-run _evaluateGame()  */
      if (state.players[currentPlayerIndex].isBusted) {
        const playerId = state.players[currentPlayerIndex];
        /* check if Dealer is also busted */
        players.forEach(player => {
          if (player.id !== playerId && player.isBusted) {
            /* no winner! */
            nextGameStatus = 6;
          } else {
            /* Dealer wins */
            nextGameStatus = 7;
          }
        });
      }

      if (state.players[currentPlayerIndex].status === D.winner) {
        nextGameStatus = 4;
      }

      if (tieFlag) nextGameStatus = 6;

      state.turnCount++;
      state.gameStatus = nextGameStatus;
      state.currentPlayerIndex = nextPlayer;

      _endGameTrap(nextGameStatus);
      break;

    case 2 /*   stay (go to next turn)  */:
      ControlPanelStore.setMessageBar(`${players[currentPlayerIndex].title} stayed`);

      /*   set current player as staying  */
      players[currentPlayerIndex].isStaying = true;
      players[currentPlayerIndex].turn = false;

      /*   get the next player by index  */
      const nextPlayerIndex = currentPlayerIndex + 1 === players.length
        ? 0
        : currentPlayerIndex + 1;
      nextPlayer = nextPlayerIndex;

      /*   re-evaluate STAYING PLAYERS  */
      stayingPlayers = players.filter(player => player.isStaying);
      allPlayersStaying = stayingPlayers.length === players.length;

      if (!allPlayersStaying) {
        players.forEach(player => {
          /*   set turn = true for the next player that is not already staying  */
          player.turn = players.indexOf(player) === nextPlayerIndex &&
            !player.isStaying
            ? true
            : false;
        });
        nextGameStatus = 1;
      } else {
        if (winningPlayerIndex === 0) nextGameStatus = 4;
        if (winningPlayerIndex === 1) nextGameStatus = 7;
      }

      state.turnCount++;
      state.gameStatus = nextGameStatus;
      state.currentPlayerIndex = nextPlayer;

      _endGameTrap(nextGameStatus);
      break;

    case 3 /*   currentPlayer busted  */:
      let messageText = allPlayersBusted
        ? `All players busted!`
        : `${players[currentPlayerIndex].title} busted!`;

      ControlPanelStore.setMessageBar(messageText, MessageBarType.warning);
      nextGameStatus = 0;

      /*   don't do engame unless all players are staying and not busted  */
      if (!allPlayersBusted) _payout();

      turnCount++;
      gameStatus = nextGameStatus;

      _endGameTrap(nextGameStatus);
      break;

    case 4 /*   currentPlayer Wins  */:
      const winningPlayerTitle = players[winningPlayerIndex].title;
      ControlPanelStore.setMessageBar(`${winningPlayerTitle} wins!`, MessageBarType.success);
      nextGameStatus = 0;

      /*   don't do payout unless all players are staying and not busted  */
      if (!allPlayersBusted) _payout();

      turnCount++;
      gameStatus = nextGameStatus;

      _endGameTrap(nextGameStatus);
      break;

    case 5 /* DEPRECATED   human player blackjack  */:
      ControlPanelStore.setMessageBar("Blackjack!", MessageBarType.success);
      nextGameStatus = 0;

      /*   don't do payout unless all players are staying and not busted  */
      if (!allPlayersBusted) _payout();

      turnCount++;
      gameStatus = nextGameStatus;

      _endGameTrap(nextGameStatus);
      break;

    case 6 /*   tie  */:
      ControlPanelStore.setMessageBar("Tie?", MessageBarType.warning);
      nextGameStatus = 0;

      /*   don't do payout unless all players are staying and not busted  */
      if (!allPlayersBusted) _payout();

      break;

    case 7 /*   non-human player wins  */:
      ControlPanelStore.setMessageBar(`${players[1].title} wins!`);

      nextGameStatus = 0;

      /* don't do payout unless all players are staying and not busted */
      if (!allPlayersBusted) _payout();

      turnCount++;
      gameStatus = nextGameStatus;

      _endGameTrap(nextGameStatus);
      break;

    default:
      break;
  }
}

function _payout(
  players = state.players,
  index = state.winningPlayerIndex,
  amount = state.pot) {
  if (players && players.length > 0) {
    players[index].status = D.winner;
    players[index].bank += amount;
    pot = 0;
  }
}

function _filterPlayers() {
  /*   STAYING PLAYERS  */
  state.stayingPlayers = state.players.filter(player => player.isStaying);
  /*   BUSTED PLAYERS   */
  state.bustedPlayers = state.players.filter(player => player.isBusted);
  /*   NON-BUSTED PLAYERS  */
  state.nonBustedPlayers = state.players.filter(player => !player.isBusted);
  /*   true if all players are staying  */
  state.allPlayersStaying = state.stayingPlayers.length === state.players.length;
  /*   true if all players are busted  */
  state.allPlayersBusted = state.bustedPlayers.length === state.players.length;
  /*   true if all players are not busted  */
  state.allPlayersNonBusted = state.nonBustedPlayers.length === state.players.length;
}

function _evaluatePlayers() {
  /*   evaluate hands  */
  if (state.players.length > 0) {
    state.players.forEach(player => {
      player.handValue = DeckStore.getHandValue(player.id);
      player.getHighestHandValue();
      player.setStatus();
    });

    /* sort players into arrays based on status */
    _filterPlayers();

    /*   determine the non-busted player with the highest value hand  */
    if (state.nonBustedPlayers.length === 1) {
      state.nonBustedPlayers[0].status = D.winner;
      state.winningPlayerId = state.nonBustedPlayers[0].id;
      state.winningPlayerIndex = state.players.indexOf(nonBustedPlayers[0]);
    } else {
      state.nonBustedPlayers.forEach(player => {
        let higherHandValue = player.getHighestHandValue();
        if (higherHandValue > highestHandValue && higherHandValue <= 21) {
          state.highestHandValue = higherHandValue;
          state.players[winningPlayerIndex].status = D.winner;
          state.winningPlayerId = player.id;
          state.winningPlayerIndex = players.indexOf(player);
        }
      });
    }
  }
}


function _reset() {
  state.players.forEach(player => {
    player.resetStatus();
  });

  state.currentPlayerIndex = 0;
  state.gameStatus = 0;
  state.pot = 0;
  state.round = 0;
  state.turnCount = 0;
}

function _newRound() {
  state.players.forEach(player => {
    player.resetStatus();
  });

  state.currentPlayerIndex = 0;
  state.gameStatus = 0;
  state.pot = 0;
  state.round += 1;
  state.turnCount = 0;
}

function _ante(amount = state.minimumBet) {
  if (state.players && state.players.length > 0) {
    state.players.forEach(player => {
      player.ante(amount);
      pot += amount;
    });
  }
  ControlPanelStore.setMessageBar(`Ante: $${amount}`);
}

/*   immediately evaluate game again if status > 2 (endgame condition)  */
function _endGameTrap(statusCode) {
  if (statusCode > 2) {
    _evaluateGame(statusCode);
  }
}

function _deal() {
  state.players[currentPlayerIndex].turn = true;
  _evaluateGame(1);
}

function _hit() {
  _evaluateGame(1);
}

function _stay() {
  _evaluateGame(2);
}

function _bet(
  playerId, amount = state.minimumBet
) {
  const index = state.players.findIndex(player => player.id === playerId);
  players[index].bank -= amount;
  pot += amount;
}

export default GameStore;
