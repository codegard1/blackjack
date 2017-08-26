import { MessageBarType } from "office-ui-fabric-react/lib/MessageBar";
import { EventEmitter } from "events";

/* custom stuff */
import { log } from "../utils";
import * as D from "../definitions";
import PlayersStore from './Players';

/* flux */
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";
import { DeckStore } from "./DeckStore";
import { ControlPanelStore } from './ControlPanelStore';

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
  // stayingPlayers: [],
  // tieFlag: false,
  turnCount: 0,
  // winningPlayerId: -1,
  // winningPlayerIndex: -1
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
  Players.newPlayer(id, title);
}


function _evaluateGame(nextGameStatus) {
  /* perform checks on each Player to help determine the next game state */
  Players.evaluatePlayers();

  switch (nextGameStatus) {
    case 1 /*   Game in progress; first play  */:
      ControlPanelStore.setMessageBar("Game in progress");

      /*   all players bet the minimum to start  */
      if (state.turnCount === 0) {
        Players.all('ante');
        /** Blackjack Check
         * If a player has Blackjack on the first play, that player wins immediately.
         */
        if (Players.blackjackPlayers.length === Players.length()) {
          nextGameStatus = 6;
        } else if (Players.blackjackPlayers.length === 1) {
          /* only one player has blackjack on the first turn */
          const index = Players.getIndex(Players.blackjackPlayers[0].id);
          nextGameStatus = index === D.HUMAN ? 4 : 7;
        }
      } else {
        /** Set next game status 
         * if it ends up being higher than 2, _exitTrap() will catch it and re-run _evaluateGame()
         */

        /* finished without winner */
        if (Players.allPlayersBusted) {
          /* all players busted => Endgame */
          nextGameStatus = 3;
        }

        /* finished with winner => endgame */
        if (!Players.allPlayersBusted && Players.allPlayersStaying) {
          /* all players are finished => EndGame */
          if (Players.tieFlag) {
            nextGameStatus = 6;
          } else {
            nextGameStatus = Players.winningPlayerIndex === D.HUMAN ? 4 : 7;
          }
        }

        /* not finished => */
        if (!Players.allPlayersBusted && !Players.allPlayersStaying) {
          /* not all players are finished */
          if (Players.currentPlayer().isStaying) {
            /* current player is staying */
            nextGameStatus = 2;
          } else {
            /* current player is not staying */
            // Do nothing (?)
            console.log('here!');
          }
        }
      }


      /* set up for next cycle */
      state.turnCount++;
      state.gameStatus = nextGameStatus;
      Players.nextPlayer();

      _endGameTrap(nextGameStatus);
      break;

    case 2 /*   stay (go to next turn)  */:
      Players.currentPlayerStays();

      if (Players.allPlayersStaying) {
        nextGameStatus = Players.winningPlayerIndex === D.HUMAN ? 4 : 7;
      } else {
        nextGameStatus = 1;
      }

      state.turnCount++;
      state.gameStatus = nextGameStatus;
      Players.nextPlayer();

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
      const winningPlayerTitle = Players[state.winningPlayerIndex].title;
      const messageBarText = Players[state.winningPlayerIndex].hasBlackJack
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
      ControlPanelStore.setMessageBar(`${Players[1].title} wins!`);

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
  players = Players,
  index = state.winningPlayerIndex,
  amount = state.pot) {
  if (players && players.length > 0) {
    players[index].status = D.winner;
    players[index].bank += amount;
    state.pot = 0;
  }
}

/* determine the non-busted player with the highest value hand  */
/* this does not end the game */
function _determineWinner() {
  if (state.nonBustedPlayers.length === 1) {
    /* set flags that tell us which player is winning */
    Players.setWinner(state.nonBustedPlayers[0].id);
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
    Players.setWinner(playerId);
  }
}





/* Reset the Game */
function _reset() {
  Players.forEach(player => {
    player.resetStatus();
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

  Players.currentPlayerIndex = 0;
  state.gameStatus = 0;
  state.pot = 0;
  state.round += 1;
  state.turnCount = 0;

  /* calls evaluateGame(1) */
  _deal();
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

  Players.startTurn(Players.currentPlayer().id);
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
  Players[state.currentPlayerIndex].stay();
  console.log(`_stay(): Players[state.currentPlayerIndex].isStaying: ${Players[state.currentPlayerIndex].isStaying}`);
  _evaluateGame(2);
}

/* bet the specified amount */
function _bet(
  playerId, amount = state.minimumBet
) {
  const index = Players.findIndex(player => player.id === playerId);
  Players[index].bet(amount);
}

export default GameStore;
