import { MessageBarType } from "office-ui-fabric-react/lib/MessageBar";
import { EventEmitter } from "events";

/* custom stuff */
import Players from "./Players";

/* flux */
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";
import ControlPanelStore from "./ControlPanelStore";
import StatsStore from "./StatsStore";

/* ALMIGHTY STATE */
let PlayersStore = new Players();
let state = {
  dealerHasControl: false,
  gameStatus: 0,
  loser: -1,
  minimumBet: 25,
  players: PlayersStore.getPlayers(),
  pot: 0,
  round: 0,
  turnCount: 0,
  winner: -1
};

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "change";
export const GameStore = Object.assign({}, EventEmitter.prototype, {
  getPlayers: () => PlayersStore.getPlayers(),
  getPlayer: id => PlayersStore.getPlayer(id),
  getState: () => state,
  getStatus: () => state.gameStatus,
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
  // const now = new Date().toTimeString();
  // log(`${action.actionType} was called at ${now}`);

  switch (action.actionType) {
    case AppConstants.GAME_NEWPLAYER:
      PlayersStore.newPlayer(action.id, action.title, action.isNPC);
      StatsStore.new(action.id);

      GameStore.emitChange();
      break;

    case AppConstants.GAME_RESET:
      /* prepare players for a new Game */
      PlayersStore.newGame();

      /* reset game state props */
      state.dealerHasControl = false;
      state.gameStatus = 0;
      state.pot = 0;
      state.round = 0;
      state.round = 0;
      state.turnCount = 0;

      GameStore.emitChange();
      break;

    case AppConstants.GAME_DEAL:
      PlayersStore.currentPlayer.startTurn();
      state.gameStatus = 1;
      _evaluateGame(1);

      GameStore.emitChange();
      break;

    case AppConstants.GAME_HIT:
      PlayersStore.currentPlayer.hit();
      _evaluateGame(1);

      GameStore.emitChange();
      break;

    case AppConstants.GAME_STAY:
      PlayersStore.currentPlayer.stay();
      /* player 0 is Dealer and game is not over*/
      if (!_evaluateGame(2) && state.gameStatus !== 0) {
        state.dealerHasControl = true;
      }
      GameStore.emitChange();
      break;

    case AppConstants.GAME_BET:
      PlayersStore.currentPlayer.bet(action.amount);
      GameStore.emitChange();
      break;

    /* This method is called after DECK_CLEARHANDS & DECK_DEAL */
    case AppConstants.GAME_NEWROUND:
      /* prepare players for a new round */
      PlayersStore.newRound();

      /* reset state props to default */
      state.dealerHasControl = false;
      state.gameStatus = 0;
      state.pot = 0;
      state.round += 1;
      state.turnCount = 0;

      /* start a new round with a new deck */
      PlayersStore.currentPlayer.startTurn();
      state.gameStatus = 1;
      _evaluateGame(1);

      GameStore.emitChange();
      break;

    default:
      break;
  }
});

/*  ========================================================  */

/* method definitions */
function _evaluateGame(statusCode) {
  PlayersStore.evaluatePlayers();

  switch (statusCode) {
    case 1 /*   Game in progress; first play  */:
      /*   all players bet the minimum to start  */
      if (state.turnCount === 0) _ante();
      _endGameTrap();
      break;

    case 2 /*   stay (go to next turn)  */:
      /* If endgame conditions not met   */
      if (!_endGameTrap()) {
        /* increment currentPlayerIndex */
        PlayersStore.nextPlayer();
        state.gameStatus = 1;
        _endGameTrap();
      } else {
        return false;
      }
      break;

    case 4 /*   Human Player Wins       */:
      const winningPlayerTitle = state.players[0].title;
      const messageBarText = state.players[0].hasBlackJack
        ? `${winningPlayerTitle} wins with Blackjack!`
        : `${winningPlayerTitle} wins!`;
      ControlPanelStore.setMessageBar(messageBarText, MessageBarType.success);

      state.winner = state.players[0].id;
      state.loser = state.players[1].id;
      _payout(0);
      _endGame();
      break;

    case 7 /*   Dealer wins   */:
      ControlPanelStore.setMessageBar(`${state.players[1].title} wins!`);

      state.winner = state.players[1].id;
      state.loser = state.players[0].id;
      _payout(1);
      _endGame();
      break;

    default:
      break;
  }

  state.turnCount++;
}

function _endGame() {
  state.gameStatus = 0;
  PlayersStore.allPlayersFinish();
}

/* immediately evaluate game again if status > 2 (endgame condition) */
function _endGameTrap() {
  let nextGameStatus;
  /* Set next game status */
  if (state.players[1].hasBlackJack) {
    nextGameStatus = 7; // Dealer has blackjack ; dealer wins
  } else if (state.players[0].isBusted) {
    nextGameStatus = 7; // Player 0 busted ; dealer wins
  } else if (state.players[1].isBusted) {
    nextGameStatus = 4; // Dealer is busted; Player 0 wins
  } else if (state.players[1].isStaying) {
    if (
      state.players[1].getHigherHandValue() >
      state.players[0].getHigherHandValue()
    ) {
      nextGameStatus = 7; // Dealer has higher hand ; dealer wins
    } else {
      nextGameStatus = 4; // Player 0 has higher hand ; Player 0 wins
    }
  } else {
    if (PlayersStore.isCurrentPlayerNPC()) {
      return true;
    } else {
      /* player 0 is not Dealer */
      state.gameStatus = 1; // Wait for next input
      return false;
    }
  }

  /* Endgame Condition encountered! */
  if (nextGameStatus > 2) {
    _evaluateGame(nextGameStatus);
    console.log("inside endgametrap. Now we're gonna update StatsStore");
    state.players.forEach(player => {
      /* set properties to increment */
      let statsFrame = {};
      statsFrame.numberOfGamesPlayed = true;
      if (player.id === state.winner) statsFrame.numberOfGamesWon = true;
      if (player.id === state.loser) statsFrame.numberOfGamesLost = true;
      if (player.hasBlackJack) statsFrame.numberOfTimesBlackjack = true;
      if (player.isBusted) statsFrame.numberOfTimesBusted = true;
      StatsStore.update(player.id, statsFrame);
    });
    return true;
  }
}

function _payout(i) {
  PlayersStore.payout(i, state.pot);
  state.pot = 0;
}

/* pay a specified amount into the pot */
function _ante(amount = state.minimumBet) {
  ControlPanelStore.setMessageBar(`Ante: $${amount}`);
  PlayersStore.allPlayersAnte(amount);
  state.pot += amount * PlayersStore.length();
}

export default GameStore;
