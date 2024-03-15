import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../../../../../src/classes/AppConstants";

/**
  *  GAMEPLAY ACTIONS
  */
const gameplayActions = {
  deal() {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_DEAL });
    // AppDispatcher.dispatch({ actionType: AppConstants.GAME_DEAL });
  },
  hit(playerKey) {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_HIT, playerKey });
    AppDispatcher.dispatch({ actionType: AppConstants.GAME_HIT });
  },
  stay(playerKey) {
    AppDispatcher.dispatch({ actionType: AppConstants.GAME_STAY, playerKey });
  },
  bet(playerKey, amount) {
    AppDispatcher.dispatch({ actionType: AppConstants.GAME_BET, playerKey, amount });
  },

  /**
   * Start a new game using a list of players
   * @param {array} players array of players objects, including id, key, and title
   */
  newGame(players) {
    /* create a new deck */
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_NEWDECK });

    players.forEach(player => {
      /* add a new Player to the PlayerStore */
      AppDispatcher.dispatch({ actionType: AppConstants.GLOBAL_NEWPLAYER, ...player });
      AppDispatcher.dispatch({ actionType: AppConstants.DECK_NEWPLAYERHAND, ...player });
    });

  },
  reset() {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_CLEARHANDS });
    AppDispatcher.dispatch({ actionType: AppConstants.GAME_RESET });
  },
  newRound() {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_CLEARHANDS });
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_DEAL });
    AppDispatcher.dispatch({ actionType: AppConstants.GAME_NEWROUND });
    AppDispatcher.dispatch({ actionType: AppConstants.STATS_UPDATE });
  },
};
