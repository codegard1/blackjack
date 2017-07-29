import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";
import { log } from "../utils";
import { MessageBarType } from "office-ui-fabric-react/lib/MessageBar";
import * as D from "../definitions";
import Player from "./Player";
import Counter from "./Counter";
import { MessageBarType } from "office-ui-fabric-react/lib/MessageBar";

/* Get from DeckStore */
//  let deck = DeckStore.getDeck(),
//  drawn = DeckStore.getDrawn(),
//  selected = DedckStore.getSelected();

/* temporary */
let drawn = [], selected = [];

/* "state" variables */
let allPlayersStaying = false,
  allPlayersBusted = false,
  allPlayersNonBusted = false,
  bustedPlayers = [],
  currentPlayer,
  currentPlayerIndex,
  gameStatus = 0,
  highestHandValue = 0,
  isMessageBarVisible = false,
  isOptionsPanelVisible = false,
  messageBarDefinition = {
    type: MessageBarType.info,
    text: "",
    isMultiLine: false
  },
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
  getPlayers: function() {
    return players;
  },
  getPlayer: function(id) {
    return players.find(player => player.id === id);
  },
  getOptionsPanelVisibility: function() {
    return isOptionsPanelVisible;
  },
  getState: function() {
    // log("getState() called from GameStore");
    return {
      allPlayersStaying,
      allPlayersBusted,
      allPlayersNonBusted,
      bustedPlayers,
      currentPlayer,
      currentPlayerIndex,
      // drawn,
      // selected,
      gameStatus,
      highestHandValue,
      isMessageBarVisible,
      isOptionsPanelVisible,
      messageBarDefinition,
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
  emitChange: function() {
    this.emit(CHANGE_EVENT);
  },
  addChangeListener: function(callback) {
    this.on(CHANGE_EVENT, callback);
  },
  removeChangeListener: function(callback) {
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

    case AppConstants.GAME_SHOWMESSAGEBAR:
      _showMessageBar(action.title, action.type);
      GameStore.emitChange();
      break;

    case AppConstants.GAME_EVALUATEHAND:
      _evaluateHand(action.hand);
      GameStore.emitChange();
      break;

    case AppConstants.GAME_EVALUATEGAME:
      _evaluateGame(action.nextGameStatus, action.nextPlayer);
      GameStore.emitChange();
      break;

    case AppConstants.GAME_GETPLAYERBYID:
      _getPlayerById(action.id);
      GameStore.emitChange();
      break;

    case AppConstants.GAME_GETHIGHESTHANDVALUE:
      _getHighestHandValue(action.player);
      GameStore.emitChange();
      break;

    case AppConstants.GAME_PAYOUT:
      _payout(action.players, action.index, action.amount);
      GameStore.emitChange();
      break;

    case AppConstants.GAME_EVALUATEPLAYERS:
      _evaluatePlayers(action.players);
      GameStore.emitChange();
      break;

    case AppConstants.GAME_RESET:
      _reset();
      GameStore.emitChange();
      break;

    case AppConstants.GAME_HIDEOPTIONSPANEL:
      _hideOptionsPanel();
      GameStore.emitChange();
      break;

    case AppConstants.GAME_SHOWOPTIONSPANEL:
      _showOptionsPanel();
      GameStore.emitChange();
      break;

    default:
      break;
  }
});

//========================================================

/* Method implementations */
function _newGame(playerTitles) {
  playerTitles.forEach(title => {
    players.push(_newPlayer(title));
  });
}

function _newPlayer(title) {
  const id = Counter.increment();
  /* Player is an Immutable record */
  return new Player({ id, title });
}

function _showMessageBar(text, type = MessageBarType.info) {
  messageBarDefinition = {
    text,
    type,
    isMultiLine: messageBarDefinition.isMultiLine
  };
  isMessageBarVisible = true;
}

function _evaluateHand(hand) {
  let handValue = {
    aceAsOne: 0,
    aceAsEleven: 0
  };
  // Do not evaluate if the hand is empty!
  if (hand.length > 0) {
    hand.forEach(card => {
      switch (card.sort) {
        case 14:
          handValue.aceAsOne += 1;
          handValue.aceAsEleven += 11;
          break;

        case 13:
          handValue.aceAsOne += 10;
          handValue.aceAsEleven += 10;
          break;

        case 12:
          handValue.aceAsOne += 10;
          handValue.aceAsEleven += 10;
          break;

        case 11:
          handValue.aceAsOne += 10;
          handValue.aceAsEleven += 10;
          break;

        default:
          handValue.aceAsOne += card.sort;
          handValue.aceAsEleven += card.sort;
          break;
      }
    });
  }
  return handValue;
}

function _evaluateGame(
  nextGameStatus = gameStatus,
  nextPlayer = currentPlayer
) {
  // set player status, handValue, and other flags
  _evaluatePlayers();

  const currentPlayerStatus = players[currentPlayerIndex].status;

  switch (nextGameStatus) {
    case 0: //Off
      _showMessageBar("Hello", MessageBarType.info);
      break;

    case 1: // Game in progress
      _showMessageBar("Game in progress", MessageBarType.info);

      // all players bet the minimum to start
      if (turnCount === 0) {
        //_ante();
      }

      // set next game status.
      // if higher than 2, _exitTrap() will catch it and re-run _evaluateGame()
      switch (currentPlayerStatus) {
        case D.busted:
          nextGameStatus = 3;
          break;

        case D.winner:
          nextGameStatus = 4;
          break;

        default:
          //do nothing
          break;
      }

      if (tieFlag) {
        nextGameStatus = 6;
      }

      turnCount++;
      gameStatus = nextGameStatus;
      currentPlayer = nextPlayer;

      //_endGameTrap(nextGameStatus);
      break;

    case 2: // stay (go to next turn)
      _showMessageBar(
        `${players[currentPlayerIndex].title} stayed`,
        MessageBarType.info
      );

      // set current player as staying
      players[currentPlayerIndex].status = D.staying;
      players[currentPlayerIndex].isStaying = true;

      // get the next player by index
      const nextPlayerIndex = currentPlayerIndex + 1 === players.length
        ? 0
        : currentPlayerIndex + 1;
      nextPlayer = nextPlayerIndex;

      // re-evaluate STAYING PLAYERS
      const stayingPlayers = players.filter(
        player => player.status === D.staying
      );
      allPlayersStaying = stayingPlayers.length === players.length;

      if (!allPlayersStaying) {
        players.forEach(player => {
          // set turn = true for the next player that is not already staying
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
      currentPlayer = nextPlayer;

      //_endGameTrap(nextGameStatus);
      break;

    case 3: // currentPlayer busted
      let messageText = allPlayersBusted
        ? `All players busted!`
        : `${this.state.players[this.state.currentPlayer].title} busted!`;

      _showMessageBar(messageText, MessageBarType.warning);
      nextGameStatus = 0;

      // don't do engame unless all players are staying and not busted
      if (!allPlayersBusted) _payout();

      turnCount++;
      gameStatus = nextGameStatus;

      //_endGameTrap(nextGameStatus);
      break;

    case 4: // currentPlayer Wins
      const winningPlayerTitle = players[winningPlayerIndex].title;
      _showMessageBar(`${winningPlayerTitle} wins!`, MessageBarType.success);
      nextGameStatus = 0;

      // don't do payout unless all players are staying and not busted
      if (!allPlayersBusted) _payout();

      turnCount++;
      gameStatus = nextGameStatus;

      //_endGameTrap(nextGameStatus);
      break;

    case 5: // human player blackjack
      _showMessageBar("Blackjack!", MessageBarType.success);
      nextGameStatus = 0;

      // don't do payout unless all players are staying and not busted
      if (!allPlayersBusted) _payout();

      turnCount++;
      gameStatus = nextGameStatus;

      //_endGameTrap(nextGameStatus);
      break;

    case 6: // tie
      _showMessageBar("Tie?", MessageBarType.warning);
      nextGameStatus = 0;

      // don't do payout unless all players are staying and not busted
      if (!allPlayersBusted) _payout();

      break;

    case 7: // non-human player wins
      _showMessageBar(`${players[1].title} wins!`);

      nextGameStatus = 0;

      // don't do payout unless all players are staying and not busted
      if (!allPlayersBusted) this._payout();

      turnCount++;
      gameStatus = nextGameStatus;

      // this._endGameTrap(nextGameStatus);
      break;

    default:
      break;
  }
}

function _getPlayerById(id) {
  const player = players.filter(player => player.id === id);
  return player[0];
}

function _getHighestHandValue(playerId) {
  const player = GameStore.getPlayer(playerId);
  const handValue = player.handValue;
  let higherHandValue = 0;

  if (handValue.aceAsEleven === handValue.aceAsOne) {
    return handValue.aceAsOne;
  } else {
    higherHandValue = handValue.aceAsOne > handValue.aceAsEleven
      ? handValue.aceAsOne
      : handValue.aceAsEleven;
    return higherHandValue;
  }
}

function _payout(players = players, index = winningPlayerIndex, amount = pot) {
  players[index].status = D.winner;
  players[index].bank += amount;
  pot = 0;
}

function _evaluatePlayers(players = players) {
  // evaluate hands
  players.forEach(player => {
    player.handValue = _evaluateHand(player.hand);

    // set busted status
    if (player.handValue.aceAsOne > 21 && player.handValue.aceAsEleven > 21) {
      player.status = D.busted;
    }

    // set blackjack status
    if (
      player.handValue.aceAsOne === 21 || player.handValue.aceAsEleven === 21
    ) {
      player.status = D.blackjack;
    }
  });

  // STAYING PLAYERS
  const stayingPlayers = players.filter(player => player.isStaying === true);

  // BUSTED PLAYERS
  bustedPlayers = players.filter(player => player.status === D.busted);

  // NON-BUSTED PLAYERS
  nonBustedPlayers = players.filter(player => player.status !== D.busted);

  // true if all players are staying
  allPlayersStaying = stayingPlayers.length === players.length;

  // true if all players are busted
  allPlayersBusted = bustedPlayers.length === players.length;

  // true if all players are not busted
  allPlayersNonBusted = nonBustedPlayers.length === players.length;

  // determine the non-busted player with the highest value hand
  if (nonBustedPlayers.length === 1) {
    nonBustedPlayers[0].status = D.winner;
  } else {
    nonBustedPlayers.forEach(player => {
      let higherHandValue = _getHighestHandValue(player);
      if (higherHandValue > highestHandValue && higherHandValue <= 21) {
        highestHandValue = higherHandValue;
        // winningPlayerId = player.id;
        winningPlayerIndex = players.indexOf(player);
      }
    });
  }
}

function _reset() {
  // _newDeck();

  players.forEach((player, index) => {
    player.remove("bank");

    // _clearHand(index);
  });

  drawn = [];
  selected = [];
  gameStatus = 0;
  turnCount = 0;
  currentPlayer = 0;
  round = 0;
  pot = 0;

  _showMessageBar("Game Reset", MessageBarType.info);
}

function _newRound() {
  // _newDeck();

  players.forEach((player, index) => {
    // _clearHand(index);
  });

  drawn = [];
  selected = [];
  gameStatus = 0;
  turnCount = 0;
  currentPlayer = 0;
  round += 1;
  pot = 0;

  _showMessageBar("New Round", MessageBarType.info);
}

function _hideOptionsPanel() {
  isOptionsPanelVisible = false;
}

function _showOptionsPanel() {
  isOptionsPanelVisible = true;
}

function _ante(amount = minimumBet) {
  players.forEach(player => {
    player.bank -= amount;
    pot += amount;
  });
  _showMessageBar(`Ante: $${amount}`, MessageBarType.info);
}

// immediately evaluate game again if status > 2 (endgame condition)
function _endGameTrap(statusCode) {
  if (statusCode > 2) {
    _evaluateGame(statusCode);
  }
}

export default GameStore;
