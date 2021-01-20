import { EventEmitter } from "events";

import { MessageBarType } from "office-ui-fabric-react/lib/MessageBar";

/* custom stuff */
import PlayerStore from "./PlayerStore";

/* flux */
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";
import StatsStore from "./StatsStore";
import ActivityLogStore from "./ActivityLogStore";

/* idb-keyval */
import { Store, set } from '../../../idb-keyval/idb-keyval-cjs-compat.min.js';
// import { Store, set } from 'idb-keyval';

/* ALMIGHTY STATE */
let PlayersStore = new PlayerStore();
let state = {
  dealerHasControl: false,
  gameStatus: 0,
  isMessageBarVisible: false,
  loser: -1,
  minimumBet: 25,
  players: PlayersStore.getPlayers(),
  pot: 0,
  round: 0,
  turnCount: 0,
  winner: -1,
  messageBarDefinition: {
    type: MessageBarType.info,
    text: "",
    isMultiLine: false
  },
};

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "game";
export const GameStore = Object.assign({}, EventEmitter.prototype, {
  store: new Store('GameStore', 'State'),
  emitChange() { this.emit(CHANGE_EVENT); },
  addChangeListener(callback) { this.on(CHANGE_EVENT, callback) },
  removeChangeListener(callback) { this.removeListener(CHANGE_EVENT, callback) },
  getPlayers: () => PlayersStore.getPlayers(),
  getPlayer: id => PlayersStore.getPlayer(id),
  getPlayerName: id => { const p = PlayersStore.getPlayer(id); return p.title },
  getState: () => state,
  getStatus: () => state.gameStatus,
  setMessageBar(text, type = MessageBarType.info) {
    state.messageBarDefinition = { text, type, isMultiLine: false };
    state.isMessageBarVisible = true;
  },
  async saveAll() { for (let key in state) { await set(key, state[key], this.store) } }
});

/* Responding to Actions */
AppDispatcher.register(action => {
  switch (action.actionType) {
    case AppConstants.GAME_NEWPLAYER:
      PlayersStore.newPlayer(action.id, action.title, action.isNPC);
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

    case AppConstants.GAME_SHOWMESSAGEBAR:
      GameStore.setMessageBar(action.text, action.type);
      GameStore.emitChange();
      break;

    case AppConstants.GAME_HIDEMESSAGEBAR:
      state.isMessageBarVisible = false;
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
      GameStore.setMessageBar(messageBarText, MessageBarType.success);
      ActivityLogStore.new({
        description: "wins!",
        name: winningPlayerTitle,
        iconName: "Crown",
      });

      state.winner = state.players[0].id;
      state.loser = state.players[1].id;
      PlayersStore.payout(0, state.pot);
      _endGame();
      break;

    case 7 /*   Dealer wins   */:
      GameStore.setMessageBar(`Dealer wins!`);
      ActivityLogStore.new({
        description: "wins!",
        name: "Dealer",
        iconName: "Crown",
      });

      state.winner = state.players[1].id;
      state.loser = state.players[0].id;
      PlayersStore.payout(1, state.pot);
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

    state.players.forEach(player => {
      /* set properties to increment */
      const statsFrame = {
        numberOfGamesLost: (player.id === state.loser ? 1 : 0),
        numberOfGamesPlayed: 1,
        numberOfGamesWon: (player.id === state.winner ? 1 : 0),
        numberOfTimesBlackjack: (player.hasBlackJack ? 1 : 0),
        numberOfTimesBusted: (player.isBusted ? 1 : 0),
        totalWinnings: (player.id === state.winner ? state.pot : 0)
      };
      StatsStore.update(player.id, statsFrame);
    });
    return true;
  }
}

/* pay a specified amount into the pot */
function _ante(amount = state.minimumBet) {
  PlayersStore.allPlayersAnte(amount);
  state.pot += amount * PlayersStore.length();
  GameStore.setMessageBar(`Ante: $${amount}`);
  ActivityLogStore.new({
    description: `ante $${amount}`,
    name: "All players",
    iconName: "Money",
  });
}

export default GameStore;
