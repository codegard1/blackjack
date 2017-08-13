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
    return {
      allPlayersStaying,
      allPlayersBusted,
      allPlayersNonBusted,
      bustedPlayers,
      currentPlayer: currentPlayerIndex,
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
      winningPlayerIndex
    };
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
    case AppConstants.GAME_NEWGAME:
      _newGame(action.players);
      GameStore.emitChange();
      break;

    case AppConstants.GAME_NEWPLAYER:
      _newPlayer(action.id, action.title)
      GameStore.emitChange();
      break;

    case AppConstants.GAME_PAYOUT:
      _payout(action.players, action.index, action.amount);
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
      _hit(action.ev, action.target);
      GameStore.emitChange();
      break;

    case AppConstants.GAME_STAY:
      _stay();
      GameStore.emitChange();
      break;

    case AppConstants.GAME_BET:
      _bet(action.ev, action.target, action.playerIndex, action.amount);
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
function _newGame(items) {
  items.forEach(item => {
    _newPlayer(item.id, item.title);
  });
  // _evaluateGame(1);
}

function _newPlayer(id, title) {
  players.push(
    new Player(id, title)
  );
}

function _evaluateGame(
  nextGameStatus = gameStatus,
  nextPlayer = currentPlayerIndex
) {
  /*   set player status, handValue, and other flags  */
  _evaluatePlayers();

  const currentPlayerStatus = players && players.length > 0
    ? players[currentPlayerIndex].status
    : '';

  switch (nextGameStatus) {
    case 0 /*  Off  */:
      ControlPanelStore.setMessageBar("Hello");
      break;

    case 1 /*   Game in progress  */:
      ControlPanelStore.setMessageBar("Game in progress");

      /*   all players bet the minimum to start  */
      if (turnCount === 0) {
        _ante();
      }

      /*   set next game status.  */
      /*   if higher than 2, _exitTrap() will catch it and re-run _evaluateGame()  */
      switch (currentPlayerStatus) {
        case D.busted:
          nextGameStatus = 3;
          break;

        case D.winner:
          nextGameStatus = 4;
          break;

        default:
          /*  do nothing  */
          break;
      }

      if (tieFlag) nextGameStatus = 6;

      turnCount++;
      gameStatus = nextGameStatus;
      currentPlayerIndex = nextPlayer;

      _endGameTrap(nextGameStatus);
      break;

    case 2 /*   stay (go to next turn)  */:
      ControlPanelStore.setMessageBar(`${players[currentPlayerIndex].title} stayed`);

      /*   set current player as staying  */
      players[currentPlayerIndex].status = D.staying;
      players[currentPlayerIndex].isStaying = true;
      players[currentPlayerIndex].turn = false;

      /*   get the next player by index  */
      const nextPlayerIndex = currentPlayerIndex + 1 === players.length
        ? 0
        : currentPlayerIndex + 1;
      nextPlayer = nextPlayerIndex;

      /*   re-evaluate STAYING PLAYERS  */
      stayingPlayers = players.filter(player => player.status === D.staying);
      allPlayersStaying = stayingPlayers.length === players.length;

      if (!allPlayersStaying) {
        players.forEach(player => {
          /*   set turn = true for the next player that is not already staying  */
          player.turn = players.indexOf(player) === nextPlayerIndex &&
            player.status !== D.staying
            ? true
            : false;
        });
        nextGameStatus = 1;
      } else {
        if (winningPlayerIndex === 0) {
          nextGameStatus = 4;
        }
        if (winningPlayerIndex === 0 && players[0].status === D.blackjack) {
          nextGameStatus = 5;
        }
        if (winningPlayerIndex === 1) {
          nextGameStatus = 7;
        }
      }

      turnCount++;
      gameStatus = nextGameStatus;
      //currentPlayer = nextPlayer;
      currentPlayerIndex = nextPlayer;

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

    case 5 /*   human player blackjack  */:
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

function _payout(players, index = winningPlayerIndex, amount = pot) {
  if (players && players.length > 0) {
    players[index].status = D.winner;
    players[index].bank += amount;
    pot = 0;
  }
}

function _evaluatePlayers() {
  /*   evaluate hands  */
  if (players && players.length > 0) {
    players.forEach(player => {
      player.handValue = DeckStore.getHandValue(player.id);
      player.getHighestHandValue();
      player.setStatus();
    });

    /*   STAYING PLAYERS  */
    stayingPlayers = players.filter(player => player.isStaying === true);

    /*   BUSTED PLAYERS   */
    bustedPlayers = players.filter(player => player.status === D.busted);

    /*   NON-BUSTED PLAYERS  */
    nonBustedPlayers = players.filter(player => player.status !== D.busted);

    /*   true if all players are staying  */
    allPlayersStaying = stayingPlayers.length === players.length;

    /*   true if all players are busted  */
    allPlayersBusted = bustedPlayers.length === players.length;

    /*   true if all players are not busted  */
    allPlayersNonBusted = nonBustedPlayers.length === players.length;

    /*   determine the non-busted player with the highest value hand  */
    if (nonBustedPlayers.length === 1) {
      nonBustedPlayers[0].status = D.winner;
    } else {
      nonBustedPlayers.forEach(player => {
        let higherHandValue = player.getHighestHandValue();
        if (higherHandValue > highestHandValue && higherHandValue <= 21) {
          highestHandValue = higherHandValue;
          winningPlayerId = player.id;
          winningPlayerIndex = players.indexOf(player);
        }
      });
    }
  }
}


function _reset() {
  players.forEach(player => {
    player.reset("bank", "status", "turn");
  });

  gameStatus = 0;
  turnCount = 0;
  currentPlayerIndex = 0;
  round = 0;
  pot = 0;
}

function _newRound() {
  players.forEach(player => {
    player.reset("status", "turn");
  });

  gameStatus = 0;
  turnCount = 0;
  currentPlayerIndex = 0;
  round += 1;
  pot = 0;
}

function _ante(amount = minimumBet) {
  if (players && players.length > 0) {
    players.forEach(player => {
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
  players[currentPlayerIndex].turn = true;
  _evaluateGame(1);
}

function _hit(ev, target, index = currentPlayerIndex) {
  /* todo: fix this so that the call goes directly to DeckStore from Table */
  const ret = DeckStore.draw(1, players[index].id);
  players[index].hand.push(ret);

  _evaluateGame(1);
}

function _stay() {
  _evaluateGame(2);
}

function _bet(
  ev, target, playerIndex = currentPlayerIndex, amount = minimumBet
) {
  ev.preventDefault();
  players[playerIndex].bank -= amount;
  pot += amount;
}

export default GameStore;
