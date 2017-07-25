import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

const AppActions = {
  deal(data) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_DEAL,
      data: data
    });
  }
};

export default AppActions;
