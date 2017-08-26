import { MessageBarType } from "office-ui-fabric-react/lib/MessageBar";
import { EventEmitter } from "events";

/* custom stuff */
import { log } from "../utils";
import * as D from "../definitions";
import Player from "./Player";
// import Players from './Players';

/* flux */
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";
import { DeckStore } from "./DeckStore";
import { ControlPanelStore } from './ControlPanelStore';

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
  tieFlag: false,
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
  state.players.push(
    new Player(id, title)
  );
}

/* set isFinished === true for all Players */
function _allPlayersFinish() {
  state.players.forEach(player => {
    player.finish();
  });
}

/* set flags that tell us which player is winning */
function _setWinner(playerId) {
  const index = state.players.findIndex(player => player.id === playerId);
  state.players[index].status = D.winner;
  state.winningPlayerIndex = index;
  state.winningPlayerId = playerId;
}

function _evaluateGame(
  nextGameStatus = state.gameStatus,
  nextPlayer = state.currentPlayerIndex
) {
  /*   set player status, handValue, and other flags  */
  _evaluatePlayers();

  switch (nextGameStatus) {
    case 1 /*   Game in progress; first play  */:
      ControlPanelStore.setMessageBar("Game in progress");

      /*   all players bet the minimum to start  */
      if (state.turnCount === 0) {
        _ante();
        /** Blackjack Check
         * If a player has Blackjack on the first play, that player wins immediately.
         */
        if (state.blackjackPlayers.length > 0) {
          if (state.blackjackPlayers.length === state.players.length) {
            /* all players have blackjack on the first turn => tie */
            nextGameStatus = 6;
          } else if (state.blackjackPlayers.length === 1) {
            /* only one player has blackjack on the first turn */
            const index = state.players.indexOf(state.blackjackPlayers[0]);
            if (index === 0) nextGameStatus = 4; /* human player wins */
            if (index === 1) nextGameStatus = 7; /* non-human player wins */
          }
          _allPlayersFinish();
        }
      } else {
        /** Set next game status 
         * if it ends up being higher than 2, _exitTrap() will catch it and re-run _evaluateGame()
         */
        if (state.allPlayersBusted) {
          /* all players busted => Endgame */
          nextGameStatus = 3;
        } else {
          /* not all players are busted */
          if (state.allPlayersFinished) {
            /* all players are finished => EndGame */
            if (state.winningPlayerIndex === 0) nextGameStatus = 4; /* human player wins */
            if (state.winningPlayerIndex === 1) nextGameStatus = 7; /* non-human player wins */
            if (state.tieFlag) nextGameStatus = 6;
          } else {
            /* not all players are finished */
            if (state.players[state.currentPlayerIndex].isStaying) {
              /* current player is staying */
              nextGameStatus = 2;
            } else {
              /* current player is not staying */
              // Do nothing (?)
              console.log('here!');
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
      /*   set current player as staying  */
      state.players[state.currentPlayerIndex].stay()
      state.players[state.currentPlayerIndex].turn = false;

      /*   get the next player by index  */
      const nextPlayerIndex = state.currentPlayerIndex + 1 >= state.players.length
        ? 0
        : state.currentPlayerIndex + 1;
      nextPlayer = nextPlayerIndex;

      /*   re-evaluate STAYING PLAYERS  */
      state.stayingPlayers = state.players.filter(player => player.isStaying);
      state.allPlayersStaying = state.stayingPlayers.length === state.players.length;

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
        if (state.winningPlayerIndex === 0) nextGameStatus = 4;
        if (state.winningPlayerIndex === 1) nextGameStatus = 7;
      }

      state.turnCount++;
      state.gameStatus = nextGameStatus;
      state.currentPlayerIndex = nextPlayer;

      _endGameTrap(nextGameStatus);
      break;

    case 3: /* All Players Busted */
      ControlPanelStore.setMessageBar("All players busted out!", MessageBarType.warning);
      nextGameStatus = 0;

      state.turnCount++;
      state.gameStatus = nextGameStatus;

      _endGameTrap(nextGameStatus);
      break;

    case 4 /*   Human Player Wins  */:
      const winningPlayerTitle = state.players[state.winningPlayerIndex].title;
      const messageBarText = state.players[state.winningPlayerIndex].hasBlackJack
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

    case 6 /*   tie  */:
      ControlPanelStore.setMessageBar("Tie?", MessageBarType.warning);
      nextGameStatus = 0;

      /*   don't do payout unless all players are not busted  */
      if (!state.allPlayersBusted) _payout();

      break;

    case 7 /*   non-human player wins  */:
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
  amount = state.pot) {
  if (players && players.length > 0) {
    players[index].status = D.winner;
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
  state.allPlayersStaying = state.stayingPlayers.length === state.players.length;
  /*   true if all players are busted  */
  state.allPlayersBusted = state.bustedPlayers.length === state.players.length;
  /*   true if all players are not busted  */
  state.allPlayersNonBusted = state.nonBustedPlayers.length === state.players.length;
  /*   true if all players are finished */
  state.allPlayersFinished = state.finishedPlayers.length === state.players.length;
}

/* evaluate each player's hand (in deckStore) and set status flags */
function _evaluatePlayerHands() {
  state.players.forEach(player => {
    player.handValue = DeckStore.getHandValue(player.id);
    player.getHigherHandValue();
    player.setStatus();
  });
}

/* determine the non-busted player with the highest value hand  */
/* this does not end the game */
function _determineWinner() {
  if (state.nonBustedPlayers.length === 1) {
    _setWinner(state.nonBustedPlayers[0].id);
  } else {
    let winningHandValue = 0;
    let playerId;
    /* cycle through non-busted players' hand values and end up with the highest value one */
    state.nonBustedPlayers.forEach(player => {
      let handValue = player.getHigherHandValue();
      if (handValue > winningHandValue && handValue <= 21) {
        winningHandValue = handValue;
        playerId = player.id;
      }
    });
    /** Finally, update the highestHandValue and set the winning player
     * if a player gets the highest hand value just before busting out, 
     * then his hand should not be considered when determining a winner. 
     * Hence it is probably not necessary store this value in state (8/25/2017)
     */
    state.highestHandValue = winningHandValue;
    _setWinner(playerId);
  }
}

/* perform checks on each Player to help determine the next game state */
function _evaluatePlayers() {
  if (state.players.length > 0) {
    /* 1. Get handValues for each player */
    _evaluatePlayerHands();
    /* 2. Sort players into arrays based on status flags  */
    _filterPlayers();
    /* 3. determine which player is in the lead */
    _determineWinner();
  }
}


/* Reset the Game */
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

/** Start a new round 
 * This method is called after DECK_CLEARHANDS & DECK_DEAL
 */
function _newRound() {
  state.players.forEach(player => {
    player.resetStatus();
    console.log(`player.title: ${player.title}
    player.status: ${player.status}
    player.turn: ${player.turn}
    player.bet: ${player.bet}
    player.lastAction: ${player.lastAction}
    player.isStaying: ${player.isStaying}
    player.isBusted: ${player.isBusted}
    player.isFinished: ${player.isFinished}
    player.hasBlackjack: ${player.hasBlackjack}`);
  });

  state.currentPlayerIndex = 0;
  state.gameStatus = 0;
  state.pot = 0;
  state.round += 1;
  state.turnCount = 0;

  /* calls evaluateGame(1) */
  _deal();
}

/* pay a specified amount into the pot */
function _ante(amount = state.minimumBet) {
  if (state.players && state.players.length > 0) {
    state.players.forEach(player => {
      player.ante(amount);
      state.pot += amount;
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

/* Start a new round with a new deck */
function _deal() {
  /* start the player's turn */
  state.players[state.currentPlayerIndex].turn = true;
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
  console.log(`_stay(): state.players[state.currentPlayerIndex].isStaying: ${state.players[state.currentPlayerIndex].isStaying}`);
  _evaluateGame(2);
}

/* bet the specified amount */
function _bet(
  playerId, amount = state.minimumBet
) {
  const index = state.players.findIndex(player => player.id === playerId);
  state.players[index].bet(amount);
}

export default GameStore;
