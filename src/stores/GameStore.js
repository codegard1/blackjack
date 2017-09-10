import { MessageBarType } from "office-ui-fabric-react/lib/MessageBar";
import { EventEmitter } from "events";

/* custom stuff */
// import { log } from "../utils";
import * as D from "../definitions";
import Player from "./Player";
// import Players from './Players';

/* flux */
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";
import { DeckStore } from "./DeckStore";
import { ControlPanelStore } from "./ControlPanelStore";

/* ALMIGHTY STATE */
let state = {
  allPlayersStaying: false,
  allPlayersBusted: false,
  allPlayersFinished: false,
  allPlayersNonBusted: false,
  blackjackPlayers: [],
  bustedPlayers: [],
  currentPlayerIndex: 0,
  finishedPlayers: [],
  gameStatus: 0,
  highestHandValue: 0,
  minimumBet: 25,
  nonBustedPlayers: [],
  players: [],
  pot: 0,
  round: 0,
  stayingPlayers: [],
  turnCount: 0,
  winningPlayerId: -1,
  winningPlayerIndex: -1
};

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "change";
export const GameStore = Object.assign({}, EventEmitter.prototype, {
  getPlayers: function () {
    return state.players;
  },
  getPlayer: function (id) {
    return state.players.find(player => player.id === id);
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

/* set isFinished === true for all Players */
function _allPlayersFinish() {
  state.players.forEach(player => {
    player.finish();
  });
}

function _evaluateGame(nextGameStatus, nextPlayer = state.currentPlayerIndex) {
  /* perform checks on each Player to help determine the next game state */
  if (state.players.length > 0) {
    /* 1. evaluate each player's hand and set status flags */
    state.players.forEach(player => {
      player.handValue = DeckStore.getHandValue(player.id);
      player.setStatus();
    });
    /* 2. Sort players into arrays based on status flags  */
    _filterPlayers();
    _determineWinner();
  }

  switch (nextGameStatus) {
    case 1 /*   Game in progress; first play  */:
      /*   all players bet the minimum to start  */
      if (state.turnCount === 0) _ante();

      /* Set next game status */
      if (state.allPlayersBusted) {
        /* all players busted => Endgame */
        nextGameStatus = 3;
      } else {
        /* not all players are busted */
        if (state.allPlayersFinished) {
          /* all players are finished => EndGame */
          switch (state.winningPlayerIndex) {
            case -1 /* this should never happen */:
              console.log(
                "error! No winner was determined. Stalled in Case 1 on evaluateGame()"
              );
              break;
            case 0 /* human player wins */:
              nextGameStatus = 4;
              break;
            case 1 /* non-human player wins */:
              nextGameStatus = 7;
              break;
            default:
              break;

          }
        } else {
          /* Not all players are finished */

          /* Blackjack Check */
          if (state.blackjackPlayers.length > 0) {
            if (state.blackjackPlayers.length === 1) {
              /* only one player has blackjack on the first turn */
              const index = state.players.indexOf(state.blackjackPlayers[0]);
              if (index === 0) nextGameStatus = 4; /* human player wins */
              if (index === 1) nextGameStatus = 7; /* non-human player wins */
            }
            if (state.turnCount === 0) _allPlayersFinish();

            if (state.players[state.currentPlayerIndex].isStaying) {
              /* current player is staying  */
              nextGameStatus = 2;
            } else if (state.players[state.currentPlayerIndex].isBusted) {
              /* current player is busted */
              if (state.currentPlayerIndex === 0)
                nextGameStatus = 4; /* human player wins */
              if (state.currentPlayerIndex === 1)
                nextGameStatus = 7; /* non-human player wins */
            }
          }
        }
      }
      /* set up for next cycle */
      state.turnCount++;
      state.gameStatus = nextGameStatus;
      state.currentPlayerIndex = nextPlayer;

      _endGameTrap(nextGameStatus);
      break;

    case 2 /*   stay (go to next turn)  */:
      /*   set current player as staying / finished */
      state.players[state.currentPlayerIndex].stay();
      state.players[state.currentPlayerIndex].turn = false;

      /*   get the next player by index  */
      const nextPlayerIndex =
        state.currentPlayerIndex + 1 >= state.players.length
          ? 0
          : state.currentPlayerIndex + 1;
      nextPlayer = nextPlayerIndex;

      /*   re-evaluate STAYING PLAYERS  */
      state.stayingPlayers = state.players.filter(player => player.isStaying);
      state.allPlayersStaying =
        state.stayingPlayers.length === state.players.length;

      if (!state.allPlayersStaying) {
        state.players.forEach(player => {
          /*   set turn = true for the next player that is not already staying  */
          if (state.players.indexOf(player) === nextPlayerIndex) {
            if (!player.isStaying && !player.isBusted) {
              player.turn = true;
            } else {
              player.turn = false;
            }
          }
        });
        nextGameStatus = 1;
      } else {
        switch (state.winningPlayerIndex) {
          case -1 /* no winner determined */:
            console.log(
              "error! no winner was determined. Game stalled at Case 2 of evaluateGame()"
            );
            break;

          case 0 /* human player wins */:
            nextGameStatus = 4;
            break;

          case 1 /* NPC wins */:
            nextGameStatus = 7;
            break;

          default:
            break;
        }
      }

      state.turnCount++;
      state.gameStatus = nextGameStatus;
      state.currentPlayerIndex = nextPlayer;

      _endGameTrap(nextGameStatus);
      break;

    case 3 /*   All Players Busted      */:
      ControlPanelStore.setMessageBar(
        "All players busted out!",
        MessageBarType.warning
      );
      nextGameStatus = 0;

      state.turnCount++;
      state.gameStatus = nextGameStatus;

      _endGameTrap(nextGameStatus);
      break;

    case 4 /*   Human Player Wins       */:
      const winningPlayerTitle = state.players[state.winningPlayerIndex].title;
      const messageBarText = state.players[state.winningPlayerIndex]
        .hasBlackJack
        ? `${winningPlayerTitle} wins with Blackjack!`
        : `${winningPlayerTitle} wins!`;
      ControlPanelStore.setMessageBar(messageBarText, MessageBarType.success);
      nextGameStatus = 0;

      /* add pot to winning Player's bank */
      _payout();

      state.turnCount++;
      state.gameStatus = nextGameStatus;

      _endGameTrap(nextGameStatus);
      break;

    case 7 /*   non-human player wins   */:
      ControlPanelStore.setMessageBar(`${state.players[1].title} wins!`);

      nextGameStatus = 0;

      /* don't do payout unless all players are staying and not busted */
      if (!state.allPlayersBusted) _payout();

      state.turnCount++;
      state.gameStatus = nextGameStatus;

      _endGameTrap(nextGameStatus);
      break;

    default:
      break;
  }
}

function _payout(
  players = state.players,
  index = state.winningPlayerIndex,
  amount = state.pot
) {
  // players[index].status = D.winner;
  if (index === -1) {
    console.log(
      "error! no winner was selected, so payout() cannot give money to anyone"
    );
  } else {
    players[index].bank += amount;
    state.pot = 0;
  }
}

/* sort players into arrays based on status flags */
function _filterPlayers() {
  /*   STAYING PLAYERS  */
  state.stayingPlayers = state.players.filter(player => player.isStaying);
  /*   BUSTED PLAYERS   */
  state.bustedPlayers = state.players.filter(player => player.isBusted);
  /*   NON-BUSTED PLAYERS  */
  state.nonBustedPlayers = state.players.filter(player => !player.isBusted);
  /*   BLACKJACK PLAYERS   */
  state.blackjackPlayers = state.players.filter(player => player.hasBlackJack);
  /*   FINISHED PLAYERS   */
  state.finishedPlayers = state.players.filter(player => player.isFinished);
  /*   true if all players are staying  */
  state.allPlayersStaying =
    state.stayingPlayers.length === state.players.length;
  /*   true if all players are busted  */
  state.allPlayersBusted = state.bustedPlayers.length === state.players.length;
  /*   true if all players are not busted  */
  state.allPlayersNonBusted =
    state.nonBustedPlayers.length === state.players.length;
  /*   true if all players are finished */
  state.allPlayersFinished =
    state.finishedPlayers.length === state.players.length;
}

/* Reset the Game */
function _reset() {
  state.players.forEach(player => {
    player.resetAll();
  });

  state.currentPlayerIndex = 0;
  state.gameStatus = 0;
  state.pot = 0;
  state.round = 0;
  state.turnCount = 0;
}

/** Start a new round 
 * This method is called after DECK_CLEARHANDS & DECK_DEAL
 */
function _newRound() {
  state.players.forEach(player => {
    player.resetStatus();
  });

  state.currentPlayerIndex = 0;
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

/*   immediately evaluate game again if status > 2 (endgame condition)  */
function _endGameTrap(statusCode) {
  if (statusCode > 2) {
    _evaluateGame(statusCode);
  }
}

/* deal cards to each player and start gameplay */
function _deal() {
  state.gameStatus = 1;
  state.players[state.currentPlayerIndex].startTurn();
  _evaluateGame(1);
}

/* draw another card from the deck. A corresponding method in DeckStore actually adds a new card to the Player's hand */
function _hit() {
  state.players[state.currentPlayerIndex].hit();
  _evaluateGame(1);
}

/* set currentPlayer's staying flag and re-run evaluateGame(1) */
/* evaluateGame will should re-run itself with status 2 if 
the current player is the only one staying */
function _stay() {
  state.players[state.currentPlayerIndex].stay();
  _evaluateGame(2);
}

/* bet the specified amount */
function _bet(playerId, amount = state.minimumBet) {
  const index = state.players.findIndex(player => player.id === playerId);
  state.players[index].bet(amount);
}

/* set flags that tell us which player is winning */
function _setWinner(playerId) {
  if (state.players.length > 0 && playerId >= 0) {
    const index = state.players.findIndex(player => player.id === playerId);
    state.players[index].status = D.winner;
    state.winningPlayerIndex = index;
    state.winningPlayerId = playerId;
  }
}

function _determineWinner() {
  /*   determine the non-busted player with the highest value hand  */
  if (state.nonBustedPlayers.length === 1) {
    _setWinner(state.nonBustedPlayers[0].id);
  } else {
    state.nonBustedPlayers.forEach(player => {
      let higherHandValue = player.getHigherHandValue();
      if (higherHandValue > state.highestHandValue && higherHandValue <= 21) {
        state.highestHandValue = higherHandValue;
        _setWinner(player.id);
      }
    });
  }
}

export default GameStore;
