import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

export const AppActions = {
  newGame(players) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_NEWGAME,
      players
    });
  },
  newPlayer(title) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_NEWPLAYER,
      title
    });
  }
};

export default AppActions;
